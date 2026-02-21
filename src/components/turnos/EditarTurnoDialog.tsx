import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useTurnos } from "@/hooks/useTurnos"
import { useServicios } from "@/hooks/useServicios"
import { useClientes } from "@/hooks/useClientes"
import { useHorarios } from "@/hooks/useHorarios"
import { formatPrecio } from "@/lib/utils"
import type { Turno } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const editSchema = z.object({
  cliente_id: z.string().min(1, "Seleccioná un cliente"),
  servicio_id: z.string().min(1, "Seleccioná un servicio"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora_inicio: z.string().min(1, "La hora es obligatoria"),
  notas: z.string().optional(),
})

type EditFormData = z.infer<typeof editSchema>

interface EditarTurnoDialogProps {
  turno: Turno
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditarTurnoDialog({
  turno,
  open,
  onOpenChange,
}: EditarTurnoDialogProps) {
  const { updateTurno } = useTurnos()
  const { servicios } = useServicios()
  const { clientes } = useClientes()
  const { getAvailableSlots, isWithinBusinessHours } = useHorarios()
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  })

  const selectedFecha = watch("fecha")
  const selectedServicioId = watch("servicio_id")

  // Reset form when dialog opens with turno data
  useEffect(() => {
    if (open && turno) {
      reset({
        cliente_id: turno.cliente_id,
        servicio_id: turno.servicio_id,
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio.slice(0, 5),
        notas: turno.notas ?? "",
      })
    }
  }, [open, turno, reset])

  // Update available slots when date changes
  useEffect(() => {
    if (selectedFecha) {
      const date = new Date(selectedFecha + "T00:00:00")
      const slots = getAvailableSlots(date)
      setAvailableSlots(slots)
    }
  }, [selectedFecha, getAvailableSlots])

  const selectedServicio = servicios.find((s) => s.id === selectedServicioId)

  const calcularHoraFin = (horaInicio: string): string => {
    if (!selectedServicio) return horaInicio
    const [h, m] = horaInicio.split(":").map(Number)
    const totalMin = h * 60 + m + selectedServicio.duracion_minutos
    const fh = Math.floor(totalMin / 60)
    const fm = totalMin % 60
    return `${fh.toString().padStart(2, "0")}:${fm.toString().padStart(2, "0")}`
  }

  const onSubmit = async (data: EditFormData) => {
    const horaFin = calcularHoraFin(data.hora_inicio)
    const fecha = new Date(data.fecha + "T00:00:00")

    if (!isWithinBusinessHours(fecha, data.hora_inicio, horaFin)) {
      toast.error("El turno está fuera del horario de atención")
      return
    }

    const { error } = await updateTurno(turno.id, {
      cliente_id: data.cliente_id,
      servicio_id: data.servicio_id,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      hora_fin: horaFin,
      notas: data.notas || undefined,
    })

    if (error) {
      if (error.message?.includes("turno en ese horario")) {
        toast.error("Ya hay un turno en ese horario")
      } else {
        toast.error("Error al actualizar el turno")
      }
      return
    }

    toast.success("Turno actualizado")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar turno</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={watch("cliente_id")}
              onValueChange={(val) => setValue("cliente_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} {c.telefono ? `(${c.telefono})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("cliente_id")} />
            {errors.cliente_id && (
              <p className="text-sm text-red-500">{errors.cliente_id.message}</p>
            )}
          </div>

          {/* Servicio */}
          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select
              value={watch("servicio_id")}
              onValueChange={(val) => setValue("servicio_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí un servicio" />
              </SelectTrigger>
              <SelectContent>
                {servicios.filter((s) => s.activo).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre} - {formatPrecio(s.precio)} ({s.duracion_minutos} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("servicio_id")} />
            {errors.servicio_id && (
              <p className="text-sm text-red-500">{errors.servicio_id.message}</p>
            )}
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="date" {...register("fecha")} />
            {errors.fecha && (
              <p className="text-sm text-red-500">{errors.fecha.message}</p>
            )}
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <Label>Hora</Label>
            {availableSlots.length > 0 ? (
              <Select
                value={watch("hora_inicio")}
                onValueChange={(val) => setValue("hora_inicio", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí una hora" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : selectedFecha ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay horarios disponibles para esta fecha
              </p>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Seleccioná una fecha primero
              </p>
            )}
            <input type="hidden" {...register("hora_inicio")} />
            {errors.hora_inicio && (
              <p className="text-sm text-red-500">{errors.hora_inicio.message}</p>
            )}
            {selectedServicio && watch("hora_inicio") && (
              <p className="text-xs text-muted-foreground">
                Finaliza a las {calcularHoraFin(watch("hora_inicio"))} (
                {selectedServicio.duracion_minutos} min)
              </p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Alguna nota sobre el turno..."
              {...register("notas")}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
