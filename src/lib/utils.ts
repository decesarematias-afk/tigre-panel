import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrecio(precio: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(precio)
}

export function formatFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatHora(hora: string): string {
  return hora.slice(0, 5)
}

/**
 * Limpia un chat_id de WhatsApp y lo formatea como número de teléfono.
 * Maneja sufijos: @c.us, @s.whatsapp.net, @lid, @g.us, etc.
 */
export function formatPhone(chatId: string): string {
  // Remover cualquier sufijo de WhatsApp (@c.us, @s.whatsapp.net, @lid, @g.us, etc.)
  const num = chatId.replace(/@.*$/, "")

  // Si no es numérico, devolver tal cual
  if (!/^\d+$/.test(num)) return chatId

  // Formato argentino: 549XXXXXXXXXX
  if (num.length >= 12 && num.startsWith("549")) {
    const area = num.slice(3, 5)
    const first = num.slice(5, 9)
    const last = num.slice(9)
    return `+54 9 ${area} ${first}-${last}`
  }

  return `+${num}`
}

/**
 * Extrae un número de teléfono limpio de un chat_id de WhatsApp.
 * Útil para guardar en DB sin los sufijos internos.
 */
export function cleanPhoneFromChatId(chatId: string): string {
  const num = chatId.replace(/@.*$/, "")
  if (!/^\d+$/.test(num)) return chatId
  return `+${num}`
}
