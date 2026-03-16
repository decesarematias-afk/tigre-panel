import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";

// ─── Config ──────────────────────────────────────────────
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WAHA_API_URL = "http://waha:3000",
  WAHA_API_KEY = "",
  WAHA_SESSION = "default",
  NEGOCIO_ID = "",
  OPENAI_API_KEY = "",
  ANTHROPIC_API_KEY = "",
  OPENAI_MODEL = "gpt-4o-mini",
  ANTHROPIC_MODEL = "claude-haiku-4-5-20251001",
  POLL_INTERVAL_MS = "2000",
  BOT_PORT = "4000",
  NEGOCIO_NOMBRE = "Cruz Barber Studio",
  NEGOCIO_DIRECCION = "",
  NEGOCIO_TELEFONO = "",
  OWNER_PHONE = "5491159027202",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
  console.error("Falta OPENAI_API_KEY o ANTHROPIC_API_KEY (al menos uno)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper para obtener fecha/hora en Argentina (UTC-3)
function nowArgentina() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
}

const wahaHeaders = {
  "Content-Type": "application/json",
  ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
};

// ─── Estado ──────────────────────────────────────────────
let healthy = false;
const processedMessages = new Set(); // wa_message_ids ya procesados
const sentReminders = new Set(); // turno IDs con recordatorio enviado
const botCancelledTurnos = new Set(); // turno IDs cancelados por el bot (no notificar como panel)

// Cache de servicios y horarios (evita queries repetidas)
const dataCache = { servicios: null, horarios: null, ts: 0 };
const CACHE_TTL = 300_000; // 5 minutos

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
    console.error(`WAHA error (${path}):`, err.message);
    return null;
  }
}

async function sendWhatsApp(chatId, text) {
  return wahaFetch("/api/sendText", {
    method: "POST",
    body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
  });
}

// Cache de resolución LID -> teléfono real
const phoneCache = new Map();

async function getPhoneFromChat(chatId) {
  if (phoneCache.has(chatId)) return phoneCache.get(chatId);

  // Si es @c.us, el user ES el teléfono
  if (chatId.endsWith("@c.us")) {
    const phone = chatId.replace("@c.us", "");
    phoneCache.set(chatId, phone);
    return phone;
  }

  // Para @lid, consultar WAHA contacts API
  try {
    const contact = await wahaFetch(`/api/${WAHA_SESSION}/contacts/${chatId}`);
    if (contact?.number) {
      const phone = String(contact.number).replace(/\D/g, "");
      console.log(`[CONTACT] ${chatId} -> phone: ${phone}`);
      phoneCache.set(chatId, phone);
      return phone;
    }
    // Intentar con el profile
    const profile = await wahaFetch(`/api/${WAHA_SESSION}/contacts/${chatId}/about`);
    if (profile?.number) {
      const phone = String(profile.number).replace(/\D/g, "");
      phoneCache.set(chatId, phone);
      return phone;
    }
  } catch (err) {
    console.error("[CONTACT] Error resolving phone:", err.message);
  }

  // Fallback: usar el ID numérico (puede no ser teléfono real)
  const fallback = chatId.replace(/@c\.us$|@lid$/, "");
  phoneCache.set(chatId, fallback);
  return fallback;
}

async function transcribeAudio(waMessageId, chatId, msgMedia) {
  if (!OPENAI_API_KEY) return null;

  try {
    let media = null;

    // 1) Media inline del polling
    if (msgMedia?.data) {
      console.log(`[AUDIO] Usando media inline (mimetype: ${msgMedia.mimetype})`);
      media = { data: msgMedia.data, mimetype: msgMedia.mimetype || "audio/ogg" };
    }

    // 2) Download por message ID (URL-encoded por si tiene @)
    if (!media?.data) {
      const encodedId = encodeURIComponent(waMessageId);
      console.log(`[AUDIO] Intento download por msgId: ${waMessageId}`);
      const dl = await wahaFetch(`/api/${WAHA_SESSION}/messages/${encodedId}/download`);
      if (dl?.data) {
        media = { data: dl.data, mimetype: dl.mimetype || "audio/ogg" };
        console.log(`[AUDIO] Descargado via messages/{id}/download`);
      } else if (dl?.url) {
        console.log(`[AUDIO] Download devolvió URL: ${dl.url}`);
        const urlRes = await fetch(dl.url);
        if (urlRes.ok) {
          const buf = await urlRes.arrayBuffer();
          media = { data: Buffer.from(buf).toString("base64"), mimetype: dl.mimetype || "audio/ogg" };
        }
      }
    }

    // 3) Re-fetch del chat con downloadMedia=true (método más confiable)
    if (!media?.data) {
      console.log(`[AUDIO] Re-fetching chat ${chatId} con downloadMedia=true`);
      const refetched = await wahaFetch(`/api/${WAHA_SESSION}/chats/${chatId}/messages?limit=5&downloadMedia=true`);
      if (Array.isArray(refetched)) {
        // Buscar por ID exacto
        let found = refetched.find(m => {
          const mid = m.id?._serialized || m.id;
          return String(mid) === waMessageId;
        });
        // Fallback: buscar el audio más reciente no procesado
        if (!found?.media?.data) {
          found = refetched.find(m => {
            const mid = String(m.id?._serialized || m.id || "");
            const isAudioMsg = m.type === "ptt" || m.type === "audio" || m.type === "voice";
            return isAudioMsg && m.media?.data && !m.fromMe && !processedMessages.has(mid);
          });
          if (found) console.log(`[AUDIO] Match por tipo audio (fallback)`);
        }
        if (found?.media?.data) {
          media = { data: found.media.data, mimetype: found.media.mimetype || "audio/ogg" };
          console.log(`[AUDIO] Obtenido via re-fetch con downloadMedia=true`);
        } else {
          // Log qué devolvió para debug
          const types = refetched.map(m => `${m.type}(media:${!!m.media?.data})`).join(", ");
          console.warn(`[AUDIO] Re-fetch no encontró audio. Mensajes: [${types}]`);
        }
      }
    }

    // 4) Endpoint alternativo chat-scoped download
    if (!media?.data) {
      const encodedId = encodeURIComponent(waMessageId);
      const dl = await wahaFetch(`/api/${WAHA_SESSION}/chats/${chatId}/messages/${encodedId}/download`);
      if (dl?.data) {
        media = { data: dl.data, mimetype: dl.mimetype || "audio/ogg" };
        console.log(`[AUDIO] Descargado via chats/{chatId}/messages/{id}/download`);
      }
    }

    if (!media?.data) {
      console.error("[AUDIO] No se pudo descargar el media después de todos los intentos");
      return null;
    }

    // Enviar a Whisper
    const blob = Buffer.from(media.data, "base64");
    const form = new FormData();
    form.append("file", new Blob([blob], { type: media.mimetype || "audio/ogg" }), "audio.ogg");
    form.append("model", "whisper-1");
    form.append("language", "es");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[AUDIO] Whisper ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json();
    console.log(`🎤 Transcripción: "${data.text?.slice(0, 80)}"`);
    return data.text;
  } catch (err) {
    console.error("[AUDIO] Error transcribiendo:", err.message);
    return null;
  }
}

async function notifyOwner(text) {
  if (!OWNER_PHONE) return;
  const chatId = `${OWNER_PHONE}@c.us`;
  const sent = await sendWhatsApp(chatId, text);
  if (sent) console.log(`📢 Owner notificado: "${text.slice(0, 60)}..."`);
  return sent;
}

async function checkWahaSession() {
  const data = await wahaFetch(`/api/sessions/${WAHA_SESSION}`);
  if (!data) {
    console.error("[SESSION] No response from WAHA");
    healthy = false;
    return false;
  }
  const validStatuses = ["WORKING", "CONNECTED", "AUTHENTICATED"];
  const ok = validStatuses.includes(data.status);
  if (!healthy && ok) console.log(`[SESSION] WAHA "${WAHA_SESSION}" activa (status: ${data.status})`);
  if (healthy && !ok) console.warn(`[SESSION] WAHA "${WAHA_SESSION}" no saludable: ${data.status}`);
  if (!ok) console.warn(`[SESSION] Status: ${data.status} (esperado: ${validStatuses.join("/")})`);
  healthy = ok;
  return ok;
}

// ─── Negocio ID ──────────────────────────────────────────
async function getNegocioId() {
  if (NEGOCIO_ID) return NEGOCIO_ID;
  const { data } = await supabase.from("negocios").select("id").limit(1);
  return data?.[0]?.id ?? null;
}

// ─── Funciones de datos ──────────────────────────────────

async function refreshCache(negocioId) {
  const [serviciosRes, horariosRes] = await Promise.all([
    supabase
      .from("servicios")
      .select("id, nombre, precio, duracion_minutos, activo")
      .eq("negocio_id", negocioId)
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("horarios_atencion")
      .select("*")
      .eq("negocio_id", negocioId)
      .order("dia_semana"),
  ]);
  dataCache.servicios = serviciosRes.data || [];
  dataCache.horarios = horariosRes.data || [];
  dataCache.ts = Date.now();
}

async function getServicios(negocioId) {
  if (!dataCache.servicios || Date.now() - dataCache.ts > CACHE_TTL) {
    await refreshCache(negocioId);
  }
  return dataCache.servicios;
}

async function getHorarios(negocioId) {
  if (!dataCache.horarios || Date.now() - dataCache.ts > CACHE_TTL) {
    await refreshCache(negocioId);
  }
  return dataCache.horarios;
}

async function getTurnosDelDia(negocioId, fecha) {
  const { data } = await supabase
    .from("turnos")
    .select("id, hora_inicio, hora_fin, estado, servicio:servicios(nombre)")
    .eq("negocio_id", negocioId)
    .eq("fecha", fecha)
    .neq("estado", "cancelado")
    .order("hora_inicio");
  return data || [];
}

async function getOrCreateCliente(negocioId, phone, nombre) {
  // Buscar existente
  const { data: existing } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("negocio_id", negocioId)
    .eq("telefono", phone)
    .limit(1);

  if (existing?.length) return existing[0];

  // Crear nuevo
  const { data: created, error } = await supabase
    .from("clientes")
    .insert({ negocio_id: negocioId, nombre: nombre || phone, telefono: phone })
    .select("id, nombre")
    .single();

  if (error) { console.error("Error creando cliente:", error.message); return null; }
  return created;
}

function calcularHorariosDisponibles(horariosDia, turnosExistentes, duracionMin) {
  if (!horariosDia || horariosDia.cerrado) return [];

  const slots = [];
  const bloques = [];

  // Bloque mañana
  if (horariosDia.hora_apertura_manana && horariosDia.hora_cierre_manana) {
    bloques.push({ desde: horariosDia.hora_apertura_manana, hasta: horariosDia.hora_cierre_manana });
  }
  // Bloque tarde
  if (horariosDia.hora_apertura_tarde && horariosDia.hora_cierre_tarde) {
    bloques.push({ desde: horariosDia.hora_apertura_tarde, hasta: horariosDia.hora_cierre_tarde });
  }

  for (const bloque of bloques) {
    let [h, m] = bloque.desde.split(":").map(Number);
    const [hFin, mFin] = bloque.hasta.split(":").map(Number);
    const finMinutos = hFin * 60 + mFin;

    while (h * 60 + m + duracionMin <= finMinutos) {
      const inicio = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const finSlotMin = h * 60 + m + duracionMin;
      const finH = Math.floor(finSlotMin / 60);
      const finM = finSlotMin % 60;
      const fin = `${String(finH).padStart(2, "0")}:${String(finM).padStart(2, "0")}`;

      // Verificar que no se solape con turnos existentes
      const ocupado = turnosExistentes.some((t) => {
        const tInicio = t.hora_inicio.slice(0, 5);
        const tFin = t.hora_fin.slice(0, 5);
        return inicio < tFin && fin > tInicio;
      });

      if (!ocupado) slots.push(inicio);

      m += 30; // slots cada 30 min
      if (m >= 60) { h += 1; m -= 60; }
    }
  }

  return slots;
}

async function crearTurno(negocioId, clienteId, servicioId, fecha, horaInicio, duracionMin) {
  const [h, m] = horaInicio.split(":").map(Number);
  const finMin = h * 60 + m + duracionMin;
  const horaFin = `${String(Math.floor(finMin / 60)).padStart(2, "0")}:${String(finMin % 60).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("turnos")
    .insert({
      negocio_id: negocioId,
      cliente_id: clienteId,
      servicio_id: servicioId,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      estado: "pendiente",
      origen: "whatsapp",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id, horaFin };
}

async function getMisTurnos(negocioId, clienteId) {
  const hoy = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("turnos")
    .select("id, fecha, hora_inicio, hora_fin, estado, servicio:servicios(nombre)")
    .eq("negocio_id", negocioId)
    .eq("cliente_id", clienteId)
    .gte("fecha", hoy)
    .neq("estado", "cancelado")
    .order("fecha")
    .order("hora_inicio")
    .limit(5);
  return data || [];
}

async function cancelarTurno(turnoId, clienteId) {
  const { error } = await supabase
    .from("turnos")
    .update({ estado: "cancelado" })
    .eq("id", turnoId)
    .eq("cliente_id", clienteId);
  return !error;
}

// ─── IA (OpenAI principal, Claude fallback) ──────────────

const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function buildSystemPrompt(servicios, horarios) {
  const hoy = nowArgentina();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const diaHoy = DIAS_ES[hoy.getDay()];

  const listaServicios = servicios.map(
    (s) => `- ${s.nombre}: $${s.precio} (${s.duracion_minutos} min)`
  ).join("\n");

  const listaHorarios = horarios.map((h) => {
    if (h.cerrado) return `- ${DIAS_ES[h.dia_semana]}: CERRADO`;
    const m = h.hora_apertura_manana && h.hora_cierre_manana
      ? `${h.hora_apertura_manana.slice(0,5)}-${h.hora_cierre_manana.slice(0,5)}`
      : "";
    const t = h.hora_apertura_tarde && h.hora_cierre_tarde
      ? `${h.hora_apertura_tarde.slice(0,5)}-${h.hora_cierre_tarde.slice(0,5)}`
      : "";
    return `- ${DIAS_ES[h.dia_semana]}: ${[m, t].filter(Boolean).join(" y ")}`;
  }).join("\n");

  return `Sos el asistente virtual de ${NEGOCIO_NOMBRE} por WhatsApp.
${NEGOCIO_DIRECCION ? `Dirección: ${NEGOCIO_DIRECCION}` : ""}
${NEGOCIO_TELEFONO ? `WhatsApp del local: ${NEGOCIO_TELEFONO}` : ""}
${OWNER_PHONE ? `Teléfono para llamar: ${OWNER_PHONE}` : ""}
Hoy es ${diaHoy} ${fechaHoy}.

Hablás en español argentino con voseo (vos, sos, tenés, querés). Sé amable, breve y profesional.
Usá emojis con moderación (✂️💈📅).

SERVICIOS DISPONIBLES:
${listaServicios || "No hay servicios cargados"}

HORARIOS DE ATENCIÓN:
${listaHorarios || "No hay horarios configurados"}

FUNCIONES DISPONIBLES - Cuando el usuario quiera hacer algo, respondé con un JSON de acción:

1. AGENDAR TURNO: Necesitás: nombre completo (nombre y apellido), servicio, fecha y hora.
   SIEMPRE pedí nombre y apellido del cliente antes de agendar. Sin nombre completo NO agendés.
   Cuando tengas todo, respondé SOLO con:
   {"action":"agendar","servicio":"nombre del servicio","fecha":"YYYY-MM-DD","hora":"HH:MM","nombre":"Nombre Apellido del cliente"}

2. VER TURNOS: Si preguntan por sus turnos:
   {"action":"mis_turnos"}

3. CANCELAR TURNO: Si quieren cancelar:
   {"action":"cancelar","turno_id":"id si lo tenés"}

4. VER DISPONIBILIDAD: Si preguntan qué horarios hay un día:
   {"action":"disponibilidad","fecha":"YYYY-MM-DD","servicio":"nombre del servicio"}

5. VER PRECIOS: Si preguntan precios, respondé directamente con la lista.

6. HABLAR CON UNA PERSONA: Si el cliente pide hablar con alguien, tiene un reclamo, un problema que no podés resolver, o necesita atención humana:
   {"action":"escalate","motivo":"breve descripción del problema"}

REGLAS:
- OBLIGATORIO: pedí nombre y apellido antes de agendar cualquier turno
- No agendés sin confirmar con el cliente el nombre completo, servicio, fecha y hora
- Si el cliente quiere un turno en un día/horario cerrado o fuera de los horarios de atención, IGUALMENTE intentá agendar con la acción "agendar". El sistema se encarga de consultar al dueño por la excepción. NO le digas al cliente que no se puede, dejá que el sistema maneje la excepción.
- Si después de 2 intentos no podés resolver lo que pide el cliente, usá la acción "escalate"
- Para fechas relativas (mañana, el viernes, etc), calculá la fecha real
- Cuando respondas con JSON de acción, respondé SOLO el JSON, nada más`;
}

async function callOpenAI(messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(messages) {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: systemMsg?.content || "",
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function getAIResponse(messages) {
  // Intentar OpenAI primero, fallback a Claude
  if (OPENAI_API_KEY) {
    try {
      return await callOpenAI(messages);
    } catch (err) {
      console.error("OpenAI falló:", err.message);
      if (ANTHROPIC_API_KEY) {
        console.log("Fallback a Anthropic...");
        return await callAnthropic(messages);
      }
      throw err;
    }
  }
  return await callAnthropic(messages);
}

// ─── Historial de conversación ───────────────────────────

async function getChatHistory(negocioId, chatId, limit = 20) {
  const { data } = await supabase
    .from("whatsapp_mensajes")
    .select("mensaje, es_entrante, mensaje_tipo, created_at")
    .eq("negocio_id", negocioId)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return data.reverse().map((m) => ({
    role: m.es_entrante ? "user" : "assistant",
    content: m.mensaje,
  }));
}

// ─── Procesar acciones del bot ───────────────────────────

function tryParseAction(text) {
  // Intentar extraer JSON de la respuesta
  const jsonMatch = text.match(/\{[\s\S]*?"action"\s*:[\s\S]*?\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function handleBotAction(action, negocioId, chatId, phone) {
  switch (action.action) {
    case "agendar": {
      const servicios = await getServicios(negocioId);
      const servicio = servicios.find(
        (s) => s.nombre.toLowerCase().includes(action.servicio?.toLowerCase() || "")
      );
      if (!servicio) return `No encontré el servicio "${action.servicio}". Los servicios disponibles son:\n${servicios.map(s => `- ${s.nombre}`).join("\n")}`;

      const fecha = action.fecha;
      if (!fecha) return "Necesito la fecha para agendar. ¿Qué día te queda bien?";

      const hora = action.hora;
      if (!hora) return "¿A qué hora preferís?";

      // Verificar disponibilidad
      const diaSemana = new Date(fecha + "T12:00:00").getDay();
      const horarios = await getHorarios(negocioId);
      const horarioDia = horarios.find((h) => h.dia_semana === diaSemana);

      if (!horarioDia || horarioDia.cerrado) {
        // Día cerrado → notificar al dueño para posible excepción
        const cliente = await getOrCreateCliente(negocioId, phone, action.nombre);
        const nombre = cliente?.nombre || action.nombre || phone;
        notifyOwner(`📋 *Solicitud fuera de horario*\n\n👤 ${nombre} (${phone})\n📅 Quiere turno el ${DIAS_ES[diaSemana]} ${fecha} a las ${hora}\n✂️ ${servicio.nombre}\n\n⚠️ Ese día estamos cerrados. ¿Hacemos la excepción?`);
        return `Ese día (${DIAS_ES[diaSemana]}) normalmente estamos cerrados, pero ya le consulté al dueño si puede hacer una excepción. Te aviso en breve. 🙏`;
      }

      const turnos = await getTurnosDelDia(negocioId, fecha);
      const disponibles = calcularHorariosDisponibles(horarioDia, turnos, servicio.duracion_minutos);
      if (!disponibles.includes(hora)) {
        const sugerencias = disponibles.slice(0, 6).join(", ");
        if (!sugerencias) {
          // No hay nada disponible → consultar al dueño
          const cliente = await getOrCreateCliente(negocioId, phone, action.nombre);
          const nombre = cliente?.nombre || action.nombre || phone;
          notifyOwner(`📋 *Solicitud fuera de horario*\n\n👤 ${nombre} (${phone})\n📅 Quiere turno el ${DIAS_ES[diaSemana]} ${fecha} a las ${hora}\n✂️ ${servicio.nombre}\n\n⚠️ No hay disponibilidad ese día. ¿Hacemos la excepción?`);
          return `No tenemos disponibilidad ese día, pero ya le consulté al dueño si puede hacer una excepción. Te aviso en breve. 🙏`;
        }
        // Hay otros horarios → ofrecer alternativas pero también notificar si pidió fuera de rango
        const horaNum = parseInt(hora.split(":")[0]) * 60 + parseInt(hora.split(":")[1]);
        const bloques = [];
        if (horarioDia.hora_apertura_manana) {
          const [h,m] = horarioDia.hora_apertura_manana.split(":").map(Number);
          const [hf,mf] = horarioDia.hora_cierre_manana.split(":").map(Number);
          bloques.push({ desde: h*60+m, hasta: hf*60+mf });
        }
        if (horarioDia.hora_apertura_tarde) {
          const [h,m] = horarioDia.hora_apertura_tarde.split(":").map(Number);
          const [hf,mf] = horarioDia.hora_cierre_tarde.split(":").map(Number);
          bloques.push({ desde: h*60+m, hasta: hf*60+mf });
        }
        const dentroDeHorario = bloques.some(b => horaNum >= b.desde && horaNum < b.hasta);
        if (!dentroDeHorario) {
          // Pidió fuera del rango de horarios → notificar al dueño
          const cliente = await getOrCreateCliente(negocioId, phone, action.nombre);
          const nombre = cliente?.nombre || action.nombre || phone;
          notifyOwner(`📋 *Solicitud fuera de horario*\n\n👤 ${nombre} (${phone})\n📅 Quiere turno el ${DIAS_ES[diaSemana]} ${fecha} a las ${hora}\n✂️ ${servicio.nombre}\n\n⚠️ Fuera del horario de atención. ¿Hacemos la excepción?`);
          return `Ese horario (${hora}) está fuera de nuestro horario de atención, pero ya le consulté al dueño si puede hacer una excepción. Te aviso en breve. 🙏\n\nSi querés, estos horarios sí están disponibles: ${sugerencias}`;
        }
        return `El horario ${hora} no está disponible para el ${fecha}. Horarios libres: ${sugerencias}`;
      }

      // Crear cliente si no existe
      const cliente = await getOrCreateCliente(negocioId, phone, action.nombre);
      if (!cliente) return "Hubo un error al registrar tus datos. Intentá de nuevo.";

      // Crear turno
      const result = await crearTurno(negocioId, cliente.id, servicio.id, fecha, hora, servicio.duracion_minutos);
      if (!result.ok) {
        if (result.error?.includes("solapamiento") || result.error?.includes("Ya existe")) {
          return "Ese horario acaba de ser tomado. ¿Querés elegir otro?";
        }
        return `Error al agendar: ${result.error}`;
      }

      return `✅ *Turno agendado*\n\n📅 ${fecha}\n⏰ ${hora} - ${result.horaFin}\n✂️ ${servicio.nombre}\n💰 $${servicio.precio}\n\n¡Te esperamos en ${NEGOCIO_NOMBRE}! Si necesitás cancelar, avisame por acá.`;
    }

    case "mis_turnos": {
      const cliente = await getOrCreateCliente(negocioId, phone, null);
      if (!cliente) return "No encontré turnos asociados a este número.";

      const turnos = await getMisTurnos(negocioId, cliente.id);
      if (!turnos.length) return "No tenés turnos próximos agendados. ¿Querés sacar uno?";

      const lista = turnos.map((t) =>
        `📅 ${t.fecha} ⏰ ${t.hora_inicio.slice(0,5)}-${t.hora_fin.slice(0,5)} | ${t.servicio?.nombre || "Servicio"} (${t.estado})`
      ).join("\n");
      return `*Tus próximos turnos:*\n\n${lista}\n\n¿Querés cancelar alguno?`;
    }

    case "cancelar": {
      const cliente = await getOrCreateCliente(negocioId, phone, null);
      if (!cliente) return "No encontré turnos para cancelar.";

      if (action.turno_id) {
        // Obtener info del turno antes de cancelar para notificar
        const { data: turnoInfo } = await supabase
          .from("turnos")
          .select("fecha, hora_inicio, servicio:servicios(nombre)")
          .eq("id", action.turno_id)
          .single();

        const ok = await cancelarTurno(action.turno_id, cliente.id);
        if (ok) {
          botCancelledTurnos.add(action.turno_id);
          if (turnoInfo) {
            notifyOwner(`❌ *Turno cancelado por cliente*\n\n👤 ${cliente.nombre || phone}\n📅 ${turnoInfo.fecha} ⏰ ${turnoInfo.hora_inicio?.slice(0,5)}\n✂️ ${turnoInfo.servicio?.nombre || "Servicio"}`);
          }
        }
        return ok ? "✅ Turno cancelado." : "No pude cancelar ese turno. Verificá el ID.";
      }

      // Mostrar turnos para elegir
      const turnos = await getMisTurnos(negocioId, cliente.id);
      if (!turnos.length) return "No tenés turnos próximos para cancelar.";

      const lista = turnos.map((t, i) =>
        `${i + 1}. 📅 ${t.fecha} ⏰ ${t.hora_inicio.slice(0,5)} - ${t.servicio?.nombre || "Servicio"}`
      ).join("\n");
      return `¿Cuál turno querés cancelar?\n\n${lista}\n\nDecime el número.`;
    }

    case "disponibilidad": {
      const fecha = action.fecha;
      if (!fecha) return "¿Para qué día querés ver disponibilidad?";

      const servicios = await getServicios(negocioId);
      const servicio = action.servicio
        ? servicios.find((s) => s.nombre.toLowerCase().includes(action.servicio.toLowerCase()))
        : servicios[0];
      const duracion = servicio?.duracion_minutos || 30;

      const diaSemana = new Date(fecha + "T12:00:00").getDay();
      const horarios = await getHorarios(negocioId);
      const horarioDia = horarios.find((h) => h.dia_semana === diaSemana);
      if (!horarioDia || horarioDia.cerrado) {
        return `El ${DIAS_ES[diaSemana]} ${fecha} normalmente estamos cerrados. Si necesitás turno ese día, decime y le consulto al dueño si puede hacer una excepción.`;
      }

      const turnos = await getTurnosDelDia(negocioId, fecha);
      const disponibles = calcularHorariosDisponibles(horarioDia, turnos, duracion);

      if (!disponibles.length) return `No hay horarios disponibles el ${fecha}. ¿Otro día?`;

      return `📅 *Horarios disponibles el ${fecha}* (${DIAS_ES[diaSemana]})${servicio ? ` para ${servicio.nombre}` : ""}:\n\n${disponibles.join(" | ")}\n\n¿Cuál te queda bien?`;
    }

    case "escalate": {
      const cliente = await getOrCreateCliente(negocioId, phone, null);
      const nombre = cliente?.nombre || phone;
      const motivo = action.motivo || "No especificado";

      notifyOwner(`🆘 *Cliente necesita atención*\n\n👤 ${nombre}\n📱 ${phone}\n💬 Motivo: ${motivo}\n\nPodés responderle directo al ${phone}.`);

      return `Entendido, ya le avisé a la persona encargada. Te va a contactar en breve. ¡Disculpá las molestias!`;
    }

    default:
      return null;
  }
}

// ─── Lógica principal del bot ────────────────────────────

async function handleIncomingMessage(negocioId, chatId, texto, waMessageId) {
  const phone = await getPhoneFromChat(chatId);

  // Verificar modo del chat (bot vs manual)
  const { data: config } = await supabase
    .from("whatsapp_chat_config")
    .select("modo")
    .eq("chat_id", chatId)
    .eq("negocio_id", negocioId)
    .limit(1);

  const modo = config?.[0]?.modo || "bot";
  if (modo === "manual") {
    console.log(`💬 [manual] ${phone}: "${texto.slice(0, 50)}"`);
    return; // No responder, el operador maneja
  }

  // Obtener datos del negocio
  const [servicios, horarios, history] = await Promise.all([
    getServicios(negocioId),
    getHorarios(negocioId),
    getChatHistory(negocioId, chatId, 20),
  ]);

  const systemPrompt = buildSystemPrompt(servicios, horarios);
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  // Asegurar que messages termine con el mensaje actual del usuario
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== texto) {
    messages.push({ role: "user", content: texto });
  }

  let respuesta;
  try {
    respuesta = await getAIResponse(messages);
  } catch (err) {
    console.error("Error IA:", err.message);
    respuesta = `Disculpá, tengo un problema técnico. Podés comunicarte al local directamente.${OWNER_PHONE ? ` Tel: ${OWNER_PHONE}` : ""}`;
  }

  // Verificar si la IA respondió con una acción
  const action = tryParseAction(respuesta);
  if (action) {
    const actionResult = await handleBotAction(action, negocioId, chatId, phone);
    if (actionResult) respuesta = actionResult;
  }

  // Enviar respuesta por WhatsApp
  const sent = await sendWhatsApp(chatId, respuesta);

  // Guardar respuesta en Supabase
  await supabase.from("whatsapp_mensajes").insert({
    negocio_id: negocioId,
    chat_id: chatId,
    mensaje: respuesta,
    es_entrante: false,
    mensaje_tipo: "bot",
    wa_message_id: sent?.id ?? null,
  });

  console.log(`🤖 [bot] -> ${phone}: "${respuesta.slice(0, 80)}..."`);
}

// ─── Polling de mensajes entrantes ───────────────────────

async function pollIncomingMessages() {
  if (!healthy) { console.log("[POLL] Skipped - session unhealthy"); return; }

  const negocioId = await getNegocioId();
  if (!negocioId) return;

  const chats = await wahaFetch(`/api/${WAHA_SESSION}/chats`);
  if (!chats || !Array.isArray(chats)) { console.warn("[POLL] No chats returned from WAHA"); return; }
  if (chats.length > 0) console.log(`[POLL] ${chats.length} chats found (first id type: ${typeof chats[0].id}, sample: ${JSON.stringify(chats[0].id).slice(0, 100)})`);

  for (const chat of chats) {
    // WAHA puede devolver id como string o como objeto {_serialized: "...@c.us"}
    const rawId = chat.id?._serialized || chat.id;
    const chatId = typeof rawId === "string" ? rawId : String(rawId ?? "");
    if (!chatId.endsWith("@c.us") && !chatId.endsWith("@lid")) continue;
    const messages = await wahaFetch(
      `/api/${WAHA_SESSION}/chats/${chatId}/messages?limit=5&downloadMedia=true`
    );
    if (!messages || !Array.isArray(messages)) continue;

    for (const msg of messages) {
      if (msg.fromMe) continue;

      const rawMsgId = msg.id?._serialized || msg.id;
      const waMessageId = typeof rawMsgId === "string" ? rawMsgId : String(rawMsgId ?? "");
      if (!waMessageId || processedMessages.has(waMessageId)) continue;

      const isAudio = msg.type === "ptt" || msg.type === "audio" || msg.type === "voice"
        || (msg.hasMedia && !msg.body && (!msg.media?.mimetype || msg.media.mimetype.startsWith("audio")));

      if (!msg.body && !msg.text && !isAudio) {
        // Skip non-text, non-audio (images, stickers, etc)
        processedMessages.add(waMessageId);
        continue;
      }

      // Verificar en DB
      const { data: existing } = await supabase
        .from("whatsapp_mensajes")
        .select("id")
        .eq("wa_message_id", waMessageId)
        .eq("negocio_id", negocioId)
        .limit(1);

      if (existing?.length) {
        processedMessages.add(waMessageId);
        continue;
      }

      // Transcribir audio si es necesario
      let texto = msg.body || msg.text || "";
      if (isAudio) {
        console.log(`[AUDIO] Detectado audio: type=${msg.type} hasMedia=${msg.hasMedia} media=${!!msg.media?.data}`);
        const transcripcion = await transcribeAudio(waMessageId, chatId, msg.media);
        if (transcripcion) {
          texto = transcripcion;
        } else {
          texto = "[audio no transcrito]";
          processedMessages.add(waMessageId);
          await sendWhatsApp(chatId, "No pude escuchar tu audio. ¿Podrías escribirme por texto lo que necesitás?");
          await supabase.from("whatsapp_mensajes").insert({
            negocio_id: negocioId, chat_id: chatId, mensaje: texto,
            es_entrante: true, mensaje_tipo: "audio", wa_message_id: waMessageId,
          });
          continue;
        }
      }
      const phone = await getPhoneFromChat(chatId);
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp * 1000).toISOString()
        : new Date().toISOString();

      // Buscar/crear cliente
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id")
        .eq("negocio_id", negocioId)
        .eq("telefono", phone)
        .limit(1);

      const clienteId = clientes?.[0]?.id ?? null;

      // Guardar mensaje entrante
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
        console.error("Error guardando mensaje:", error.message);
        continue;
      }

      processedMessages.add(waMessageId);
      console.log(`📩 ${phone}: "${texto.slice(0, 50)}"`);

      // Responder con IA
      await handleIncomingMessage(negocioId, chatId, texto, waMessageId);
    }
  }
}

// ─── Enviar mensajes manuales pendientes ─────────────────

async function processPendingMessages() {
  if (!healthy) { console.log("[PENDING] Skipped - session unhealthy"); return; }

  const negocioId = await getNegocioId();
  if (!negocioId) return;

  const { data: pending } = await supabase
    .from("whatsapp_mensajes")
    .select("*")
    .eq("negocio_id", negocioId)
    .eq("mensaje_tipo", "manual_pending")
    .eq("es_entrante", false)
    .order("created_at", { ascending: true })
    .limit(10);

  if (!pending?.length) return;

  for (const msg of pending) {
    const result = await sendWhatsApp(msg.chat_id, msg.mensaje);
    if (result) {
      await supabase
        .from("whatsapp_mensajes")
        .update({ mensaje_tipo: "manual", wa_message_id: result.id ?? null })
        .eq("id", msg.id);
      console.log(`📤 manual -> ${msg.chat_id}: "${msg.mensaje.slice(0, 50)}"`);
    } else {
      await supabase
        .from("whatsapp_mensajes")
        .update({ mensaje_tipo: "manual_error" })
        .eq("id", msg.id);
      console.error(`Error enviando manual a ${msg.chat_id}`);
    }
  }
}

// ─── Detección de cancelaciones desde el panel ───────────

const notifiedCancellations = new Set();

async function checkPanelCancellations() {
  if (!healthy) return;

  try {
  const negocioId = await getNegocioId();
  if (!negocioId) return;

  // Buscar turnos cancelados en los últimos 5 minutos que no se notificaron
  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha, hora_inicio, hora_fin, cliente_id, updated_at, servicio:servicios(nombre)")
    .eq("negocio_id", negocioId)
    .eq("estado", "cancelado")
    .gte("updated_at", cincoMinAtras);

  if (!turnos?.length) return;

  for (const turno of turnos) {
    if (notifiedCancellations.has(turno.id)) continue;
    if (botCancelledTurnos.has(turno.id)) { notifiedCancellations.add(turno.id); continue; }

    const { data: cliente } = await supabase
      .from("clientes")
      .select("telefono, nombre")
      .eq("id", turno.cliente_id)
      .single();

    if (!cliente?.telefono) { notifiedCancellations.add(turno.id); continue; }

    const chatId = `${cliente.telefono}@c.us`;

    // Buscar disponibilidad para ofrecer reprogramación
    const diaSemana = new Date(turno.fecha + "T12:00:00").getDay();
    const horarios = await getHorarios(negocioId);
    const horarioDia = horarios.find((h) => h.dia_semana === diaSemana);

    let slotsMsg = "";
    if (horarioDia && !horarioDia.cerrado) {
      const turnosDelDia = await getTurnosDelDia(negocioId, turno.fecha);
      const disponibles = calcularHorariosDisponibles(horarioDia, turnosDelDia, 30);
      if (disponibles.length) {
        slotsMsg = `\n\n📅 Horarios disponibles para el mismo día:\n${disponibles.slice(0, 6).join(" | ")}\n\n¿Querés reprogramar? Decime qué horario te queda bien.`;
      }
    }

    const mensaje = `Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, te avisamos que tu turno del ${turno.fecha} a las ${turno.hora_inicio?.slice(0, 5)} (${turno.servicio?.nombre || "Servicio"}) fue cancelado por motivos personales. Disculpá las molestias.${slotsMsg || "\n\n¿Querés agendar otro turno? Decime qué día y horario te queda bien."}`;

    const sent = await sendWhatsApp(chatId, mensaje);
    if (sent) {
      notifiedCancellations.add(turno.id);
      console.log(`📢 Cancelación panel -> ${cliente.telefono}: turno ${turno.fecha} ${turno.hora_inicio?.slice(0, 5)}`);

      await supabase.from("whatsapp_mensajes").insert({
        negocio_id: negocioId,
        chat_id: chatId,
        mensaje,
        es_entrante: false,
        mensaje_tipo: "bot",
        cliente_id: turno.cliente_id,
      });
    }
  }
  } catch (err) {
    console.error("[CANCEL-CHECK] Error:", err.message);
  }
}

// ─── Recordatorios automáticos (2h antes) ────────────────

async function sendReminders() {
  if (!healthy) return;

  const negocioId = await getNegocioId();
  if (!negocioId) return;

  const ahora = new Date();
  const hoy = ahora.toISOString().split("T")[0];
  const horaActual = ahora.toTimeString().slice(0, 5);

  const dosHorasDespues = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  const horaLimite = dosHorasDespues.toTimeString().slice(0, 5);

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha, hora_inicio, hora_fin, cliente_id, servicio:servicios(nombre)")
    .eq("negocio_id", negocioId)
    .eq("fecha", hoy)
    .in("estado", ["pendiente", "confirmado"])
    .gte("hora_inicio", horaActual)
    .lte("hora_inicio", horaLimite);

  if (!turnos?.length) return;

  for (const turno of turnos) {
    if (sentReminders.has(turno.id)) continue;

    const { data: cliente } = await supabase
      .from("clientes")
      .select("telefono, nombre")
      .eq("id", turno.cliente_id)
      .single();

    if (!cliente?.telefono) continue;

    const chatId = `${cliente.telefono}@c.us`;
    const mensaje = `📅 *Recordatorio de turno*\n\n` +
      `Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, te recordamos que tenés un turno hoy:\n\n` +
      `⏰ ${turno.hora_inicio.slice(0, 5)} - ${turno.hora_fin.slice(0, 5)}\n` +
      `✂️ ${turno.servicio?.nombre || "Servicio"}\n\n` +
      `¡Te esperamos en ${NEGOCIO_NOMBRE}! Si necesitás cancelar, avisanos por acá.`;

    const sent = await sendWhatsApp(chatId, mensaje);
    if (sent) {
      sentReminders.add(turno.id);
      console.log(`⏰ Recordatorio -> ${cliente.telefono}: turno ${turno.hora_inicio.slice(0, 5)}`);

      await supabase.from("whatsapp_mensajes").insert({
        negocio_id: negocioId,
        chat_id: chatId,
        mensaje,
        es_entrante: false,
        mensaje_tipo: "reminder",
        cliente_id: turno.cliente_id,
      });
    }
  }
}

// ─── Health check ────────────────────────────────────────

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
let tickRunning = false;

async function tick() {
  if (tickRunning) return; // evitar ticks solapados
  tickRunning = true;
  console.log(`[TICK] ${new Date().toISOString()}`);
  try {
    await checkWahaSession();
    await processPendingMessages();
    await pollIncomingMessages();
    await sendReminders();
    await checkPanelCancellations();
  } catch (err) {
    console.error("[TICK ERROR]", err.message, err.stack);
  } finally {
    tickRunning = false;
  }
}

// Limpiar cache de mensajes procesados cada 10 min (evitar memory leak)
setInterval(() => {
  if (processedMessages.size > 5000) {
    processedMessages.clear();
    console.log("Cache de mensajes limpiado");
  }
  sentReminders.clear();
  notifiedCancellations.clear();
}, 600_000);

console.log(`Cruz Barber WhatsApp Bot v2.0`);
console.log(`  WAHA: ${WAHA_API_URL} (sesion: ${WAHA_SESSION})`);
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  IA: ${OPENAI_API_KEY ? "OpenAI" : ""}${OPENAI_API_KEY && ANTHROPIC_API_KEY ? " + " : ""}${ANTHROPIC_API_KEY ? "Anthropic (fallback)" : ""}`);
console.log(`  Poll: ${interval}ms | Puerto: ${BOT_PORT}`);

httpServer.listen(parseInt(BOT_PORT, 10), "0.0.0.0", () => {
  console.log(`Bot escuchando en :${BOT_PORT}`);
  tick();
  setInterval(tick, interval);
});
