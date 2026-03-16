import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WAHA_API_URL = "http://waha:3000",
  WAHA_API_KEY = "",
  WAHA_SESSION = "default",
  POLL_INTERVAL_MS = "2000",
  BOT_PORT = "4000",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const wahaHeaders = {
  "Content-Type": "application/json",
  ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
};

// ─── Estado ──────────────────────────────────────────────
let lastSeenTimestamp = null; // para evitar mensajes duplicados de WAHA
let healthy = false;

// ─── Utilidades WAHA ─────────────────────────────────────
async function wahaFetch(path, options = {}) {
  const url = `${WAHA_API_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...wahaHeaders, ...options.headers },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`WAHA ${res.status} ${path}: ${text}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error(`WAHA fetch error (${path}):`, err.message);
    return null;
  }
}

async function checkWahaSession() {
  const data = await wahaFetch(`/api/sessions/${WAHA_SESSION}`);
  if (!data) return false;
  const ok = data.status === "WORKING";
  if (!healthy && ok) console.log(`✅ Sesión WAHA "${WAHA_SESSION}" activa`);
  if (healthy && !ok)
    console.warn(`⚠️  Sesión WAHA "${WAHA_SESSION}" estado: ${data.status}`);
  healthy = ok;
  return ok;
}

// ─── Buscar negocio por waha_url ─────────────────────────
// El bot necesita saber a qué negocio pertenece cada mensaje.
// Buscamos negocios que tengan configurado WAHA.
let cachedNegocios = [];
let negociosCacheTime = 0;
const NEGOCIO_CACHE_TTL = 60_000; // 1 min

async function getNegocios() {
  if (Date.now() - negociosCacheTime < NEGOCIO_CACHE_TTL) return cachedNegocios;
  const { data, error } = await supabase
    .from("negocios")
    .select("id, nombre, waha_url, waha_api_key")
    .not("waha_url", "is", null);
  if (error) {
    console.error("Error fetching negocios:", error.message);
    return cachedNegocios;
  }
  cachedNegocios = data || [];
  negociosCacheTime = Date.now();
  return cachedNegocios;
}

// Por ahora, si hay un solo negocio, lo usamos directamente.
// Si hay varios, se matchea por la config de WAHA url.
async function getNegocioId() {
  const negocios = await getNegocios();
  if (negocios.length === 0) {
    console.warn("⚠️  No hay negocios con WAHA configurado en la DB");
    return null;
  }
  // Si hay un solo negocio, usamos ese
  if (negocios.length === 1) return negocios[0].id;
  // Si hay varios, buscamos el que matchea con nuestra WAHA_API_URL
  const match = negocios.find(
    (n) => n.waha_url === WAHA_API_URL || n.waha_api_key === WAHA_API_KEY
  );
  return match?.id ?? negocios[0].id;
}

// ─── Recibir mensajes entrantes de WAHA (polling) ────────
async function pollIncomingMessages() {
  if (!healthy) return;

  const chats = await wahaFetch(`/api/${WAHA_SESSION}/chats`);
  if (!chats || !Array.isArray(chats)) return;

  const negocioId = await getNegocioId();
  if (!negocioId) return;

  for (const chat of chats) {
    // Solo chats individuales (no grupos)
    if (!chat.id?.endsWith("@c.us")) continue;

    const chatId = chat.id;
    const messages = await wahaFetch(
      `/api/${WAHA_SESSION}/chats/${chatId}/messages?limit=10&downloadMedia=false`
    );
    if (!messages || !Array.isArray(messages)) continue;

    for (const msg of messages) {
      // Solo mensajes entrantes (fromMe = false)
      if (msg.fromMe) continue;
      if (!msg.body && !msg.text) continue;

      const waMessageId = msg.id;
      const texto = msg.body || msg.text || "";
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp * 1000).toISOString()
        : new Date().toISOString();

      // Verificar si ya existe en Supabase
      const { data: existing } = await supabase
        .from("whatsapp_mensajes")
        .select("id")
        .eq("wa_message_id", waMessageId)
        .eq("negocio_id", negocioId)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Buscar cliente por teléfono
      const phone = chatId.replace("@c.us", "");
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id")
        .eq("negocio_id", negocioId)
        .eq("telefono", phone)
        .limit(1);

      const clienteId = clientes?.[0]?.id ?? null;

      // Insertar mensaje entrante
      const { error } = await supabase.from("whatsapp_mensajes").insert({
        negocio_id: negocioId,
        chat_id: chatId,
        mensaje: texto,
        es_entrante: true,
        mensaje_tipo: "text",
        wa_message_id: waMessageId,
        cliente_id: clienteId,
        created_at: timestamp,
      });

      if (error) {
        console.error("Error insertando mensaje entrante:", error.message);
      } else {
        console.log(`📩 Mensaje entrante de ${phone}: "${texto.slice(0, 50)}..."`);
      }
    }
  }
}

// ─── Enviar mensajes pendientes (manual_pending) ─────────
async function processPendingMessages() {
  if (!healthy) return;

  const negocioId = await getNegocioId();
  if (!negocioId) return;

  const { data: pending, error } = await supabase
    .from("whatsapp_mensajes")
    .select("*")
    .eq("negocio_id", negocioId)
    .eq("mensaje_tipo", "manual_pending")
    .eq("es_entrante", false)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error fetching pending messages:", error.message);
    return;
  }

  if (!pending || pending.length === 0) return;

  for (const msg of pending) {
    const result = await wahaFetch(`/api/sendText`, {
      method: "POST",
      body: JSON.stringify({
        session: WAHA_SESSION,
        chatId: msg.chat_id,
        text: msg.mensaje,
      }),
    });

    if (result) {
      // Marcar como enviado
      await supabase
        .from("whatsapp_mensajes")
        .update({
          mensaje_tipo: "manual",
          wa_message_id: result.id ?? null,
        })
        .eq("id", msg.id);

      console.log(
        `📤 Mensaje enviado a ${msg.chat_id}: "${msg.mensaje.slice(0, 50)}..."`
      );
    } else {
      // Marcar como error
      await supabase
        .from("whatsapp_mensajes")
        .update({ mensaje_tipo: "manual_error" })
        .eq("id", msg.id);

      console.error(`❌ Error enviando a ${msg.chat_id}`);
    }
  }
}

// ─── Health endpoint ─────────────────────────────────────
import { createServer } from "node:http";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(healthy ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: healthy ? "ok" : "unhealthy", session: WAHA_SESSION }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

// ─── Loop principal ──────────────────────────────────────
const interval = parseInt(POLL_INTERVAL_MS, 10);

async function tick() {
  try {
    await checkWahaSession();
    await processPendingMessages();
    await pollIncomingMessages();
  } catch (err) {
    console.error("Error en tick:", err.message);
  }
}

console.log("🤖 Cruz Barber WhatsApp Bot iniciando...");
console.log(`   WAHA: ${WAHA_API_URL} (sesión: ${WAHA_SESSION})`);
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   Poll interval: ${interval}ms`);
console.log(`   HTTP health: :${BOT_PORT}/health`);

httpServer.listen(parseInt(BOT_PORT, 10), "0.0.0.0", () => {
  console.log(`🚀 Bot server escuchando en puerto ${BOT_PORT}`);
  // Primer tick inmediato, después intervalo
  tick();
  setInterval(tick, interval);
});
