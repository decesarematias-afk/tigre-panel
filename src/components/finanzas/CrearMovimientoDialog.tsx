import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
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
import type { TipoMovimiento, CategoriaMovimiento } from "@/types/database"

const movimientoSchema = z.object({
  tipo: z.enum(["ingreso", "egreso"]),
  categoria: z.enum([
    "turno",
    "producto",
    "alquiler",
    "servicios",
    "insumos",
    "impuestos",
    "sueldo",
    "otro",
  ]),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
})

type FormData = z.infer<typeof movimientoSchema>

const CATEGORIAS_INGRESO: { value: CategoriaMovimiento; label: string }[] = [
  { value: "turno", label: "Turno / Servicio" },
  { value: "producto", label: "Venta de producto" },
  { value: "otro", label: "Otro ingreso" },
]

const CATEGORIAS_EGRESO: { value: CategoriaMovimiento; label: string }[] = [
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios (luz, agua, etc.)" },
  { value: "insumos", label: "Insumos" },
  { value: "impuestos", label: "Impuestos" },
  { value: "sueldo", label: "Sueldo" },
  { value: "producto", label: "Compra de productos" },
  { value: "otro", label: "Otro gasto" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    tipo: TipoMovimiento
    categoria: CategoriaMovimiento
    monto: number
    descripcion: string
    fecha: string
  }) => Promise<{ data: unknown; error: Error | null }>
  defaultFecha?: string
}

export function CrearMovimientoDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultFecha,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      tipo: "egreso",
      fecha: defaultFecha ?? new Date().toISOString().split("T")[0],
    },
  })

  const tipoSeleccionado = watch("tipo")
  const categorias =
    tipoSeleccionado === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO

  const handleFormSubmit = async (data: FormData) => {
    const { error } = await onSubmit(data)
    if (error) {
      toast.error("Error al registrar el movimiento")
      return
    }
    toast.success(
      data.tipo === "ingreso" ? "Ingreso registrado" : "Egreso registrado"
    )
    reset({
      tipo: "egreso",
      fecha: defaultFecha ?? new Date().toISOString().split("T")[0],
    })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset({
            tipo: "egreso",
            fecha: defaultFecha ?? new Date().toISOString().split("T")[0],
          })
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              defaultValue="egreso"
              onValueChange={(val) => {
                setValue("tipo", val as TipoMovimiento)
                setValue("categoria", "" as CategoriaMovimiento)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="egreso">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select onValueChange={(val) => setValue("categoria", val as CategoriaMovimiento)}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("categoria")} />
            {errors.categoria && (
              <p className="text-sm text-red-500">{errors.categoria.message}</p>
            )}
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("monto")}
            />
            {errors.monto && (
              <p className="text-sm text-red-500">{errors.monto.message}</p>
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

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Ej: Pago de alquiler del local"
              {...register("descripcion")}
              rows={2}
            />
            {errors.descripcion && (
              <p className="text-sm text-red-500">{errors.descripcion.message}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isSubmitting ? "Guardando..." : "Registrar"}
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
