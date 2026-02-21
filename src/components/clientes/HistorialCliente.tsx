import { useEffect, useState } from "react"
import { useClientes } from "@/hooks/useClientes"
import { formatPrecio, formatFecha, formatHora } from "@/lib/utils"
import type { Cliente, Turno, EstadoTurno } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Scissors, Clock } from "lucide-react"

const STATUS_BADGE: Record<EstadoTurno, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700" },
  confirmado: { label: "Confirmado", className: "bg-blue-100 text-blue-700" },
  completado: { label: "Completado", className: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-700" },
}

interface HistorialClienteProps {
  cliente: Cliente
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HistorialCliente({
  cliente,
  open,
  onOpenChange,
}: HistorialClienteProps) {
  const { getHistorial } = useClientes()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && cliente) {
      setLoading(true)
      getHistorial(cliente.id).then((data) => {
        setTurnos(data)
        setLoading(false)
      })
    }
  }, [open, cliente, getHistorial])

  const totalVisitas = turnos.filter((t) => t.estado === "completado").length
  const totalGastado = turnos
    .filter((t) => t.estado === "completado" && t.servicio)
    .reduce((sum, t) => sum + (t.servicio?.precio ?? 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de {cliente.nombre}</DialogTitle>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{totalVisitas}</p>
            <p className="text-xs text-muted-foreground">Visitas completadas</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{formatPrecio(totalGastado)}</p>
            <p className="text-xs text-muted-foreground">Total gastado</p>
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : turnos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay turnos registrados
          </p>
        ) : (
          <div className="space-y-3">
            {turnos.map((turno) => {
              const badge = STATUS_BADGE[turno.estado]
              return (
                <div
                  key={turno.id}
                  className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium capitalize truncate">
                        {formatFecha(turno.fecha)}
                      </p>
                      <Badge
                        className={`${badge.className} border-0 text-xs shrink-0`}
                      >
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatHora(turno.hora_inicio)} -{" "}
                        {formatHora(turno.hora_fin)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3 h-3" />
                        {turno.servicio?.nombre ?? "—"}
                      </span>
                    </div>
                    {turno.servicio && (
                      <p className="text-xs font-medium text-secondary">
                        {formatPrecio(turno.servicio.precio)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
