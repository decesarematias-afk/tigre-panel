import { useEffect, useRef, useState } from "react"
import {
  MessageCircle,
  Bot,
  ArrowLeft,
  SendHorizonal,
  User,
  Loader2,
} from "lucide-react"
import { cn, formatPhone } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import type { WhatsAppMensaje, ChatMode } from "@/types/database"

interface Props {
  mensajes: WhatsAppMensaje[]
  selectedChatId: string | null
  contactName: string | null
  chatMode: ChatMode
  sendingMessage: boolean
  onBack?: () => void
  onToggleMode: (chatId: string) => void
  onSendMessage: (chatId: string, message: string) => Promise<boolean>
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0]
}

function getMessageLabel(
  msg: WhatsAppMensaje
): { icon: typeof Bot; label: string; color: string } | null {
  if (msg.es_entrante) return null
  if (msg.mensaje_tipo === "manual" || msg.mensaje_tipo === "manual_pending") {
    return { icon: User, label: "Manual", color: "blue" }
  }
  if (msg.mensaje_tipo === "manual_error") {
    return { icon: User, label: "Error envío", color: "red" }
  }
  return { icon: Bot, label: "Bot IA", color: "green" }
}

export function ChatThread({
  mensajes,
  selectedChatId,
  contactName,
  chatMode,
  sendingMessage,
  onBack,
  onToggleMode,
  onSendMessage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [inputMessage, setInputMessage] = useState("")

  // Auto-scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes])

  // Limpiar input cuando cambia el chat
  useEffect(() => {
    setInputMessage("")
  }, [selectedChatId])

  const handleSend = async () => {
    if (!selectedChatId || !inputMessage.trim() || sendingMessage) return
    const msg = inputMessage
    setInputMessage("")
    await onSendMessage(selectedChatId, msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!selectedChatId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-green-300" />
        </div>
        <p className="text-muted-foreground font-medium">
          Seleccioná una conversación
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Elegí un chat de la lista para ver los mensajes
        </p>
      </div>
    )
  }

  // Agrupar mensajes por fecha
  let lastDateKey = ""

  return (
    <div className="flex flex-col h-full">
      {/* Header del chat */}
      <div className="flex items-center gap-3 p-3 border-b bg-card">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-sm font-bold text-green-700">
            {(contactName?.[0] ?? selectedChatId[0])?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {contactName ?? formatPhone(selectedChatId)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatPhone(selectedChatId)}
          </p>
        </div>

        {/* Toggle Bot/Manual */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
              chatMode === "bot"
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            )}
          >
            {chatMode === "bot" ? (
              <Bot className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
            {chatMode === "bot" ? "Bot IA" : "Manual"}
          </div>
          <Switch
            checked={chatMode === "manual"}
            onCheckedChange={() => onToggleMode(selectedChatId)}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
      </div>

      {/* Mensajes */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {mensajes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No hay mensajes en este chat
            </p>
          </div>
        ) : (
          mensajes.map((msg) => {
            const dateKey = getDateKey(msg.created_at)
            const showDateSeparator = dateKey !== lastDateKey
            lastDateKey = dateKey
            const msgLabel = getMessageLabel(msg)

            return (
              <div key={msg.id}>
                {/* Separador de fecha */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-1 bg-muted rounded-full text-[11px] text-muted-foreground shadow-sm">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Burbuja */}
                <div
                  className={cn(
                    "flex mb-1",
                    msg.es_entrante ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                      msg.es_entrante
                        ? "bg-white border border-border rounded-tl-none"
                        : msgLabel?.color === "blue"
                          ? "bg-blue-100 text-blue-950 rounded-tr-none"
                          : msgLabel?.color === "red"
                            ? "bg-red-100 text-red-950 rounded-tr-none"
                            : "bg-green-100 text-green-950 rounded-tr-none"
                    )}
                  >
                    {/* Indicador bot/manual */}
                    {msgLabel && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <msgLabel.icon
                          className={cn(
                            "w-3 h-3",
                            msgLabel.color === "blue"
                              ? "text-blue-600"
                              : msgLabel.color === "red"
                                ? "text-red-600"
                                : "text-green-600"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            msgLabel.color === "blue"
                              ? "text-blue-600"
                              : msgLabel.color === "red"
                                ? "text-red-600"
                                : "text-green-600"
                          )}
                        >
                          {msgLabel.label}
                        </span>
                        {msg.mensaje_tipo === "manual_pending" && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.mensaje}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] mt-1 text-right",
                        msg.es_entrante
                          ? "text-muted-foreground"
                          : msgLabel?.color === "blue"
                            ? "text-blue-700/60"
                            : msgLabel?.color === "red"
                              ? "text-red-700/60"
                              : "text-green-700/60"
                      )}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input de mensaje - solo visible en modo manual */}
      {chatMode === "manual" && (
        <div className="border-t bg-card p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí un mensaje..."
              rows={1}
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 min-h-[40px] max-h-[120px]"
              style={{
                height: "auto",
                overflow: "hidden",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = "auto"
                target.style.height =
                  Math.min(target.scrollHeight, 120) + "px"
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || sendingMessage}
              className={cn(
                "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                inputMessage.trim() && !sendingMessage
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {sendingMessage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SendHorizonal className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Modo manual activo — el bot IA no responde en este chat
          </p>
        </div>
      )}
    </div>
  )
}
