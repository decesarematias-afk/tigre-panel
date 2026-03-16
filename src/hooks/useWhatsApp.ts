import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type {
  WhatsAppMensaje,
  WhatsAppConversacion,
  ChatMode,
} from "@/types/database"

export function useWhatsApp() {
  const { negocio } = useAuth()
  const [conversaciones, setConversaciones] = useState<WhatsAppConversacion[]>(
    []
  )
  const [mensajes, setMensajes] = useState<WhatsAppMensaje[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMode, setChatMode] = useState<ChatMode>("bot")
  const [sendingMessage, setSendingMessage] = useState(false)

  const fetchConversaciones = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)

    // Traer todos los mensajes agrupados por chat_id
    const { data } = await supabase
      .from("whatsapp_mensajes")
      .select("*, cliente:clientes(nombre)")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false })

    if (data) {
      const raw = data as unknown as (WhatsAppMensaje & {
        cliente: { nombre: string } | null
      })[]
      // Agrupar por chat_id
      const map = new Map<string, WhatsAppConversacion>()
      for (const msg of raw) {
        if (!map.has(msg.chat_id)) {
          map.set(msg.chat_id, {
            chat_id: msg.chat_id,
            cliente_id: msg.cliente_id,
            cliente_nombre: msg.cliente?.nombre ?? null,
            ultimo_mensaje: msg.mensaje,
            ultimo_mensaje_fecha: msg.created_at,
            total_mensajes: 0,
          })
        }
        const conv = map.get(msg.chat_id)!
        conv.total_mensajes += 1
        // Actualizar nombre si algún mensaje tiene cliente vinculado
        if (msg.cliente?.nombre && !conv.cliente_nombre) {
          conv.cliente_nombre = msg.cliente.nombre
          conv.cliente_id = msg.cliente_id
        }
      }
      // Ordenar por último mensaje (más reciente primero)
      const sorted = Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.ultimo_mensaje_fecha).getTime() -
          new Date(a.ultimo_mensaje_fecha).getTime()
      )
      setConversaciones(sorted)
    }
    setLoading(false)
  }, [negocio])

  const fetchMensajes = useCallback(
    async (chatId: string) => {
      if (!negocio) return

      const { data } = await supabase
        .from("whatsapp_mensajes")
        .select("*")
        .eq("negocio_id", negocio.id)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(200)

      if (data) {
        setMensajes(data as unknown as WhatsAppMensaje[])
      }
    },
    [negocio]
  )

  // Fetch modo del chat seleccionado
  const fetchChatMode = useCallback(
    async (chatId: string) => {
      if (!negocio) return
      const { data } = await supabase
        .from("whatsapp_chat_config")
        .select("modo")
        .eq("chat_id", chatId)
        .eq("negocio_id", negocio.id)
        .single()

      setChatMode((data?.modo as ChatMode) ?? "bot")
    },
    [negocio]
  )

  // Toggle modo bot/manual
  const toggleChatMode = useCallback(
    async (chatId: string) => {
      if (!negocio) return
      const newMode: ChatMode = chatMode === "bot" ? "manual" : "bot"

      const { error } = await supabase.from("whatsapp_chat_config").upsert(
        {
          chat_id: chatId,
          negocio_id: negocio.id,
          modo: newMode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chat_id,negocio_id" }
      )

      if (!error) {
        setChatMode(newMode)
      }
    },
    [negocio, chatMode]
  )

  // Enviar mensaje manual via Supabase (el bot lo pollea y envía por WAHA)
  const sendManualMessage = useCallback(
    async (chatId: string, message: string) => {
      if (!negocio || !message.trim()) return false
      setSendingMessage(true)

      try {
        const { error } = await supabase.from("whatsapp_mensajes").insert({
          negocio_id: negocio.id,
          chat_id: chatId,
          mensaje: message.trim(),
          es_entrante: false,
          mensaje_tipo: "manual_pending",
        })

        if (error) {
          console.error("Error enviando mensaje manual:", error.message)
          return false
        }
        return true
      } catch (err) {
        console.error("Error enviando mensaje:", err)
        return false
      } finally {
        setSendingMessage(false)
      }
    },
    [negocio]
  )

  // Fetch conversaciones al montar
  useEffect(() => {
    fetchConversaciones()
  }, [fetchConversaciones])

  // Fetch mensajes y modo cuando cambia el chat seleccionado
  useEffect(() => {
    if (selectedChatId) {
      fetchMensajes(selectedChatId)
      fetchChatMode(selectedChatId)
    } else {
      setMensajes([])
      setChatMode("bot")
    }
  }, [selectedChatId, fetchMensajes, fetchChatMode])

  // Realtime subscription para mensajes nuevos
  useEffect(() => {
    if (!negocio) return

    const channel = supabase
      .channel("whatsapp-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_mensajes",
          filter: `negocio_id=eq.${negocio.id}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as WhatsAppMensaje

          // Actualizar lista de conversaciones
          fetchConversaciones()

          // Si el mensaje es del chat seleccionado, agregarlo
          if (selectedChatId && newMsg.chat_id === selectedChatId) {
            setMensajes((prev) => {
              // Evitar duplicados
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_mensajes",
          filter: `negocio_id=eq.${negocio.id}`,
        },
        (payload) => {
          const updated = payload.new as unknown as WhatsAppMensaje
          // Actualizar mensaje in-place (ej: manual_pending → manual)
          setMensajes((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [negocio, selectedChatId, fetchConversaciones])

  // Borrar conversación (todos los mensajes de ese chat)
  const deleteConversation = useCallback(
    async (chatId: string) => {
      if (!negocio) return false

      const { error } = await supabase
        .from("whatsapp_mensajes")
        .delete()
        .eq("negocio_id", negocio.id)
        .eq("chat_id", chatId)

      if (error) {
        console.error("Error borrando conversación:", error.message)
        return false
      }

      // También borrar config del chat
      await supabase
        .from("whatsapp_chat_config")
        .delete()
        .eq("negocio_id", negocio.id)
        .eq("chat_id", chatId)

      // Limpiar UI
      setConversaciones((prev) => prev.filter((c) => c.chat_id !== chatId))
      if (selectedChatId === chatId) {
        setSelectedChatId(null)
        setMensajes([])
      }
      return true
    },
    [negocio, selectedChatId]
  )

  return {
    conversaciones,
    mensajes,
    selectedChatId,
    setSelectedChatId,
    loading,
    chatMode,
    toggleChatMode,
    sendManualMessage,
    sendingMessage,
    deleteConversation,
    refetch: fetchConversaciones,
  }
}
