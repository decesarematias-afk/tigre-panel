import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MessageCircle } from "lucide-react"
import { cn, formatPhone } from "@/lib/utils"
import type { WhatsAppConversacion } from "@/types/database"

interface Props {
  conversaciones: WhatsAppConversacion[]
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
  loading: boolean
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) {
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) {
    return date.toLocaleDateString("es-AR", { weekday: "short" })
  }
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })
}

export function ConversacionesList({
  conversaciones,
  selectedChatId,
  onSelectChat,
  loading,
}: Props) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return conversaciones
    const q = search.toLowerCase()
    return conversaciones.filter(
      (c) =>
        c.cliente_nombre?.toLowerCase().includes(q) ||
        formatPhone(c.chat_id).includes(q) ||
        c.chat_id.includes(q)
    )
  }, [conversaciones, search])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          Conversaciones
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-[120px]" />
                  <Skeleton className="h-3 w-[180px]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? "Sin resultados" : "No hay conversaciones"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((conv) => (
              <button
                key={conv.chat_id}
                onClick={() => onSelectChat(conv.chat_id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
                  selectedChatId === conv.chat_id && "bg-muted"
                )}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-green-700">
                    {(conv.cliente_nombre?.[0] ?? conv.chat_id[0])?.toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {conv.cliente_nombre ?? formatPhone(conv.chat_id)}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(conv.ultimo_mensaje_fecha)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.ultimo_mensaje}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
