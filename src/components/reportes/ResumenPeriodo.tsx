import { Card, CardContent } from "@/components/ui/card"
import {
  CalendarCheck,
  DollarSign,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { formatPrecio } from "@/lib/utils"

interface Props {
  totalTurnos: number
  turnosCompletados: number
  turnosCancelados: number
  ingresosCobrados: number
  ingresosPendientes: number
  tasaCompletados: number
  ticketPromedio: number
}

export function ResumenPeriodo({
  totalTurnos,
  turnosCompletados,
  turnosCancelados,
  ingresosCobrados,
  ingresosPendientes,
  tasaCompletados,
  ticketPromedio,
}: Props) {
  const cards = [
    {
      label: "Total turnos",
      value: totalTurnos.toString(),
      sub: `${turnosCompletados} completados`,
      icon: CalendarCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Ingresos cobrados",
      value: formatPrecio(ingresosCobrados),
      sub: `${formatPrecio(ingresosPendientes)} pendientes`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Ticket promedio",
      value: formatPrecio(ticketPromedio),
      sub: `${tasaCompletados.toFixed(0)}% tasa completados`,
      icon: TrendingUp,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Cancelaciones",
      value: turnosCancelados.toString(),
      sub: `de ${totalTurnos} turnos`,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
