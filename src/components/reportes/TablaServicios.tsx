import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Scissors, Download } from "lucide-react"
import { formatPrecio } from "@/lib/utils"
import { exportToCSV } from "@/lib/export"

interface ServicioStats {
  nombre: string
  cantidad: number
  ingresos: number
}

interface Props {
  servicios: ServicioStats[]
}

export function TablaServicios({ servicios }: Props) {
  const handleExport = () => {
    exportToCSV(
      servicios as unknown as Record<string, unknown>[],
      [
        { key: "nombre", label: "Servicio" },
        { key: "cantidad", label: "Cantidad" },
        { key: "ingresos", label: "Ingresos" },
      ],
      "servicios_reporte"
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scissors className="w-4 h-4" />
          Servicios más solicitados
        </CardTitle>
        {servicios.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {servicios.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin datos para este período
          </p>
        ) : (
          <div className="space-y-3">
            {servicios.map((s, i) => {
              const maxCantidad = servicios[0]?.cantidad ?? 1
              const pct = (s.cantidad / maxCantidad) * 100
              return (
                <div key={s.nombre} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-4">
                        {i + 1}
                      </span>
                      <span className="font-medium">{s.nombre}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {s.cantidad} turnos · {formatPrecio(s.ingresos)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
