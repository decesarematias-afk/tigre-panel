import { useState } from "react"
import { toast } from "sonner"
import { useTurnos } from "@/hooks/useTurnos"
import { formatPrecio, formatFecha, formatHora } from "@/lib/utils"
import type { Turno, EstadoTurno } from "@/types/database"
import { CobrarDialog } from "@/components/turnos/CobrarDialog"
import { EditarTurnoDialog } from "@/components/turnos/EditarTurnoDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Scissors,
  Calendar,
  FileText,
  Trash2,
  Pencil,
  Banknote,
  MessageCircle,
} from "lucide-react"

const STATUS_CONFIG: Record<
  EstadoTurno,
  { label: string; color: string; bgColor: string }
> = {
  pendiente: {
    label: "Pendiente",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  confirmado: {
    label: "Confirmado",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  completado: {
    label: "Completado",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  cancelado: {
    label: "Cancelado",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
}

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
}

interface VerTurnoDialogProps {
  turno: Turno
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VerTurnoDialog({
  turno,
  open,
  onOpenChange,
}: VerTurnoDialogProps) {
  const { updateEstado, deleteTurno } = useTurnos()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [cobrarOpen, setCobrarOpen] = useState(false)
  const [editarOpen, setEditarOpen] = useState(false)

  const status = STATUS_CONFIG[turno.estado]
  const canEdit = turno.estado === "pendiente" || turno.estado === "confirmado"
  const canCobrar = turno.estado === "completado" && !turno.cobrado

  const handleUpdateEstado = async (nuevoEstado: EstadoTurno) => {
    setActionLoading(true)
    const { error } = await updateEstado(turno.id, nuevoEstado)
    setActionLoading(false)
    if (error) {
      toast.error("Error al actualizar el turno")
      return
    }
    const statusLabel = STATUS_CONFIG[nuevoEstado].label.toLowerCase()
    toast.success(`Turno marcado como ${statusLabel}`)
    onOpenChange(false)
  }

  const handleDelete = async () => {
    setActionLoading(true)
    const { error } = await deleteTurno(turno.id)
    setActionLoading(false)
    if (error) {
      toast.error("Error al eliminar el turno")
      return
    }
    toast.success("Turno eliminado")
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalle del turno</DialogTitle>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditarOpen(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Editar turno"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {turno.origen === "whatsapp" && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Badge>
                )}
                <Badge className={`${status.bgColor} ${status.color} border-0`}>
                  {status.label}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{turno.cliente?.nombre ?? "—"}</p>
                {turno.cliente?.telefono && (
                  <p className="text-sm text-muted-foreground">
                    {turno.cliente.telefono}
                  </p>
                )}
              </div>
            </div>

            {/* Servicio */}
            <div className="flex items-start gap-3">
              <Scissors className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{turno.servicio?.nombre ?? "—"}</p>
                {turno.servicio && (
                  <p className="text-sm text-muted-foreground">
                    {formatPrecio(turno.servicio.precio)} &middot;{" "}
                    {turno.servicio.duracion_minutos} min
                  </p>
                )}
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium capitalize">{formatFecha(turno.fecha)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatHora(turno.hora_inicio)} - {formatHora(turno.hora_fin)}
                </p>
              </div>
            </div>

            {/* Notas */}
            {turno.notas && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm">{turno.notas}</p>
              </div>
            )}

            {/* Info de cobro */}
            {turno.cobrado && (
              <div className="flex items-start gap-3">
                <Banknote className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-700">
                    Cobrado: {formatPrecio(turno.monto_cobrado ?? 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {METODO_LABELS[turno.metodo_pago ?? ""] ?? turno.metodo_pago}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Acciones */}
            <div className="space-y-2">
              {canCobrar && (
                <Button
                  onClick={() => setCobrarOpen(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Cobrar {turno.servicio ? formatPrecio(turno.servicio.precio) : ""}
                </Button>
              )}

              {turno.estado === "pendiente" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateEstado("confirmado")}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                  <Button
                    onClick={() => handleUpdateEstado("cancelado")}
                    disabled={actionLoading}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}

              {turno.estado === "confirmado" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateEstado("completado")}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completar
                  </Button>
                  <Button
                    onClick={() => handleUpdateEstado("cancelado")}
                    disabled={actionLoading}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}

              {turno.estado === "cancelado" && (
                <Button
                  onClick={() => handleUpdateEstado("pendiente")}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Reactivar como pendiente
                </Button>
              )}

              <Separator />
              {!confirmDelete ? (
                <Button
                  variant="ghost"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar turno
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={actionLoading}
                    onClick={handleDelete}
                  >
                    Sí, eliminar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                  >
                    No, volver
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CobrarDialog
        turno={turno}
        open={cobrarOpen}
        onOpenChange={setCobrarOpen}
      />
      <EditarTurnoDialog
        turno={turno}
        open={editarOpen}
        onOpenChange={setEditarOpen}
      />
    </>
  )
}
