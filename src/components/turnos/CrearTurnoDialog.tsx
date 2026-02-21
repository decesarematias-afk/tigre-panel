import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { useTurnos } from "@/hooks/useTurnos"
import { useServicios } from "@/hooks/useServicios"
import { useClientes } from "@/hooks/useClientes"
import { useHorarios } from "@/hooks/useHorarios"
import { formatPrecio } from "@/lib/utils"
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
import { Plus, Search } from "lucide-react"

const turnoSchema = z.object({
  cliente_id: z.string().min(1, "Seleccioná un cliente"),
  servicio_id: z.string().min(1, "Seleccioná un servicio"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora_inicio: z.string().min(1, "La hora es obligatoria"),
  notas: z.string().optional(),
})

type TurnoFormData = z.infer<typeof turnoSchema>

interface CrearTurnoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date | null
}

export function CrearTurnoDialog({
  open,
  onOpenChange,
  defaultDate,
}: CrearTurnoDialogProps) {
  const { createTurno } = useTurnos()
  const { servicios } = useServicios()
  const { clientes, searchClientes, createCliente } = useClientes()
  const { getAvailableSlots, isWithinBusinessHours } = useHorarios()

  const [clienteSearch, setClienteSearch] = useState("")
  const [filteredClientes, setFilteredClientes] = useState(clientes)
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newClienteNombre, setNewClienteNombre] = useState("")
  const [newClienteTelefono, setNewClienteTelefono] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TurnoFormData>({
    resolver: zodResolver(turnoSchema),
    defaultValues: {
      fecha: defaultDate ? format(defaultDate, "yyyy-MM-dd") : "",
      hora_inicio: defaultDate
        ? format(defaultDate, "HH:mm")
        : "",
    },
  })

  const selectedFecha = watch("fecha")
  const selectedServicioId = watch("servicio_id")

  // Update available slots when date changes
  useEffect(() => {
    if (selectedFecha) {
      const date = new Date(selectedFecha + "T00:00:00")
      const slots = getAvailableSlots(date)
      setAvailableSlots(slots)
    }
  }, [selectedFecha, getAvailableSlots])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        fecha: defaultDate ? format(defaultDate, "yyyy-MM-dd") : "",
        hora_inicio: defaultDate ? format(defaultDate, "HH:mm") : "",
        cliente_id: "",
        servicio_id: "",
        notas: "",
      })
      setClienteSearch("")
      setShowNewCliente(false)
    }
  }, [open, defaultDate, reset])

  // Filter clients on search
  useEffect(() => {
    if (clienteSearch.trim()) {
      searchClientes(clienteSearch).then(setFilteredClientes)
    } else {
      setFilteredClientes(clientes)
    }
  }, [clienteSearch, clientes, searchClientes])

  const selectedServicio = servicios.find((s) => s.id === selectedServicioId)

  const calcularHoraFin = (horaInicio: string): string => {
    if (!selectedServicio) return horaInicio
    const [h, m] = horaInicio.split(":").map(Number)
    const totalMin = h * 60 + m + selectedServicio.duracion_minutos
    const fh = Math.floor(totalMin / 60)
    const fm = totalMin % 60
    return `${fh.toString().padStart(2, "0")}:${fm.toString().padStart(2, "0")}`
  }

  const onSubmit = async (data: TurnoFormData) => {
    const horaFin = calcularHoraFin(data.hora_inicio)
    const fecha = new Date(data.fecha + "T00:00:00")

    if (!isWithinBusinessHours(fecha, data.hora_inicio, horaFin)) {
      toast.error("El turno está fuera del horario de atención")
      return
    }

    const { error } = await createTurno({
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
        toast.error("Error al crear el turno")
      }
      return
    }

    toast.success("Turno creado")
    onOpenChange(false)
  }

  const handleCreateCliente = async () => {
    if (!newClienteNombre.trim()) return
    const { data, error } = await createCliente({
      nombre: newClienteNombre.trim(),
      telefono: newClienteTelefono.trim() || undefined,
    })
    if (error) {
      toast.error("Error al crear el cliente")
      return
    }
    if (data) {
      setValue("cliente_id", data.id)
      setClienteSearch(data.nombre)
      setShowNewCliente(false)
      setNewClienteNombre("")
      setNewClienteTelefono("")
      toast.success("Cliente creado")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {clienteSearch && !showNewCliente && (
              <div className="border rounded-lg max-h-32 overflow-y-auto">
                {filteredClientes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => {
                      setValue("cliente_id", c.id)
                      setClienteSearch(c.nombre)
                    }}
                  >
                    <span className="font-medium">{c.nombre}</span>
                    {c.telefono && (
                      <span className="text-muted-foreground ml-2">
                        {c.telefono}
                      </span>
                    )}
                  </button>
                ))}
                {filteredClientes.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No se encontraron clientes
                  </div>
                )}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-muted transition-colors border-t flex items-center gap-2"
                  onClick={() => {
                    setShowNewCliente(true)
                    setNewClienteNombre(clienteSearch)
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Crear cliente nuevo
                </button>
              </div>
            )}
            {showNewCliente && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/50">
                <Input
                  placeholder="Nombre"
                  value={newClienteNombre}
                  onChange={(e) => setNewClienteNombre(e.target.value)}
                />
                <Input
                  placeholder="Teléfono (opcional)"
                  value={newClienteTelefono}
                  onChange={(e) => setNewClienteTelefono(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCliente}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    Crear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewCliente(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            <input type="hidden" {...register("cliente_id")} />
            {errors.cliente_id && (
              <p className="text-sm text-red-500">{errors.cliente_id.message}</p>
            )}
          </div>

          {/* Servicio */}
          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select
              onValueChange={(val) => setValue("servicio_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí un servicio" />
              </SelectTrigger>
              <SelectContent>
                {servicios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre} - {formatPrecio(s.precio)} ({s.duracion_minutos} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("servicio_id")} />
            {errors.servicio_id && (
              <p className="text-sm text-red-500">
                {errors.servicio_id.message}
              </p>
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
                onValueChange={(val) => setValue("hora_inicio", val)}
                defaultValue={watch("hora_inicio")}
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
              <p className="text-sm text-red-500">
                {errors.hora_inicio.message}
              </p>
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
              {isSubmitting ? "Creando..." : "Crear turno"}
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
