import { useState, useMemo, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MessageCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WhatsAppConversacion } from "@/types/database"

interface Props {
  conversaciones: WhatsAppConversacion[]
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => Promise<boolean>
  loading: boolean
}

function formatPhone(chatId: string): string {
  const num = chatId.replace("@c.us", "").replace("@s.whatsapp.net", "")
  if (num.length >= 12 && num.startsWith("549")) {
    const area = num.slice(3, 5)
    const first = num.slice(5, 9)
    const last = num.slice(9)
    return `+54 9 ${area} ${first}-${last}`
  }
  return `+${num}`
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

function SwipeableChatItem({
  conv,
  isSelected,
  onSelect,
  onDelete,
}: {
  conv: WhatsAppConversacion
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [offsetX, setOffsetX] = useState(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwiping = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const DELETE_THRESHOLD = 70

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    // Si el movimiento vertical es mayor, no hacer swipe
    if (!isSwiping.current && Math.abs(dy) > Math.abs(dx)) return

    if (Math.abs(dx) > 10) isSwiping.current = true

    if (isSwiping.current) {
      // Solo permitir swipe a la izquierda (negativo)
      const newOffset = Math.min(0, Math.max(-DELETE_THRESHOLD - 20, dx))
      setOffsetX(newOffset)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (offsetX < -DELETE_THRESHOLD) {
      // Mantener abierto mostrando el botón de borrar
      setOffsetX(-DELETE_THRESHOLD)
    } else {
      setOffsetX(0)
    }
    isSwiping.current = false
  }, [offsetX])

  const handleClick = useCallback(() => {
    if (isSwiping.current) return
    if (offsetX !== 0) {
      setOffsetX(0)
      return
    }
    onSelect()
  }, [offsetX, onSelect])

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Delete button behind */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
            setOffsetX(0)
          }}
          className="h-full px-5 bg-red-500 text-white flex items-center gap-1.5 text-xs font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Borrar
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className={cn(
          "relative flex items-center gap-3 p-3 text-left transition-colors bg-background",
          isSelected && "bg-muted",
          offsetX === 0 && "hover:bg-muted/50"
        )}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping.current ? "none" : "transform 0.2s ease-out",
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
      </div>
    </div>
  )
}

export function ConversacionesList({
  conversaciones,
  selectedChatId,
  onSelectChat,
  onDeleteChat,
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
              <SwipeableChatItem
                key={conv.chat_id}
                conv={conv}
                isSelected={selectedChatId === conv.chat_id}
                onSelect={() => onSelectChat(conv.chat_id)}
                onDelete={() => onDeleteChat(conv.chat_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
