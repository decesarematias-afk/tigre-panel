import { useState } from "react"
import { useReportes } from "@/hooks/useReportes"
import { ResumenPeriodo } from "@/components/reportes/ResumenPeriodo"
import { TablaServicios } from "@/components/reportes/TablaServicios"
import { TablaClientes } from "@/components/reportes/TablaClientes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"

function getDefaultRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const desde = new Date(year, month, 1).toISOString().split("T")[0]
  const hasta = new Date(year, month + 1, 0).toISOString().split("T")[0]
  return { desde, hasta }
}

const presets = [
  { label: "Hoy", getDates: () => {
    const hoy = new Date().toISOString().split("T")[0]
    return { desde: hoy, hasta: hoy }
  }},
  { label: "Esta semana", getDates: () => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const lunes = new Date(now)
    lunes.setDate(now.getDate() - diff)
    return {
      desde: lunes.toISOString().split("T")[0],
      hasta: now.toISOString().split("T")[0],
    }
  }},
  { label: "Este mes", getDates: () => getDefaultRange() },
  { label: "Último mes", getDates: () => {
    const now = new Date()
    const desde = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
    const hasta = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]
    return { desde, hasta }
  }},
]

export function Reportes() {
  const defaults = getDefaultRange()
  const [desde, setDesde] = useState(defaults.desde)
  const [hasta, setHasta] = useState(defaults.hasta)

  const stats = useReportes(desde, hasta)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reportes</h1>

      {/* Filtros de fecha */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="space-y-1">
                <Label htmlFor="desde" className="text-xs">
                  Desde
                </Label>
                <Input
                  id="desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hasta" className="text-xs">
                  Hasta
                </Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const { desde: d, hasta: h } = preset.getDates()
                    setDesde(d)
                    setHasta(h)
                  }}
                >
                  <CalendarDays className="w-3 h-3 mr-1" />
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats resumen */}
      <ResumenPeriodo
        totalTurnos={stats.totalTurnos}
        turnosCompletados={stats.turnosCompletados}
        turnosCancelados={stats.turnosCancelados}
        ingresosCobrados={stats.ingresosCobrados}
        ingresosPendientes={stats.ingresosPendientes}
        tasaCompletados={stats.tasaCompletados}
        ticketPromedio={stats.ticketPromedio}
      />

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TablaServicios servicios={stats.serviciosRanking} />
        <TablaClientes clientes={stats.clientesRanking} />
      </div>
    </div>
  )
}
