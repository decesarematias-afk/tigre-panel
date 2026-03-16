import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrecio } from "@/lib/utils"
import type { Turno } from "@/types/database"
import { CalendarCheck, Clock, CheckCircle, DollarSign } from "lucide-react"

interface StatsCardsProps {
  turnos: Turno[]
}

export function StatsCards({ turnos }: StatsCardsProps) {
  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0]
    const turnosHoy = turnos.filter((t) => t.fecha === hoy)

    const totalHoy = turnosHoy.length
    const confirmados = turnosHoy.filter((t) => t.estado === "confirmado").length
    const completados = turnosHoy.filter((t) => t.estado === "completado").length
    const pendientes = turnosHoy.filter((t) => t.estado === "pendiente").length

    // Ingresos: todos los cobros registrados hoy (sin importar fecha del turno)
    const ingresosHoy = turnos
      .filter((t) => t.cobrado && t.updated_at?.startsWith(hoy))
      .reduce((sum, t) => sum + (t.monto_cobrado ?? t.servicio?.precio ?? 0), 0)

    // Ingresos esperados: turnos de hoy no cobrados y no cancelados
    const ingresosEsperados = turnosHoy
      .filter((t) => !t.cobrado && t.estado !== "cancelado")
      .reduce((sum, t) => sum + (t.servicio?.precio ?? 0), 0)

    return {
      totalHoy,
      confirmados,
      completados,
      pendientes,
      ingresosHoy,
      ingresosEsperados,
    }
  }, [turnos])

  const cards = [
    {
      label: "Turnos hoy",
      value: stats.totalHoy,
      detail: `${stats.pendientes} pendiente${stats.pendientes !== 1 ? "s" : ""}`,
      icon: CalendarCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Confirmados",
      value: stats.confirmados,
      detail: "Listos para atender",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completados",
      value: stats.completados,
      detail: "Atendidos hoy",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Ingresos hoy",
      value: formatPrecio(stats.ingresosHoy),
      detail: stats.ingresosEsperados > 0
        ? `${formatPrecio(stats.ingresosEsperados)} pendiente`
        : "Todo cobrado",
      icon: DollarSign,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.detail}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
