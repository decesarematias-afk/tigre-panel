import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useServicios } from "@/hooks/useServicios"
import { formatPrecio } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, X, Check, Clock } from "lucide-react"

interface ServicioForm {
  nombre: string
  precio: number
  duracion_minutos: number
}

const servicioSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  precio: z.coerce.number().min(0, "El precio debe ser positivo"),
  duracion_minutos: z.coerce
    .number()
    .min(5, "Mínimo 5 minutos")
    .max(240, "Máximo 240 minutos"),
})

export function ServiciosConfig() {
  const {
    servicios,
    loading,
    createServicio,
    updateServicio,
    deleteServicio,
    fetchAllServicios,
  } = useServicios()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Load all (including inactive) for config
  useEffect(() => {
    fetchAllServicios()
  }, [fetchAllServicios])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServicioForm>({
    resolver: zodResolver(servicioSchema) as never,
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<ServicioForm>({
    resolver: zodResolver(servicioSchema) as never,
  })

  const onAdd = async (data: ServicioForm) => {
    const { error } = await createServicio(data)
    if (error) {
      toast.error("Error al crear el servicio")
      return
    }
    toast.success("Servicio creado")
    reset()
    setShowAdd(false)
    fetchAllServicios()
  }

  const onEdit = async (data: ServicioForm) => {
    if (!editingId) return
    const { error } = await updateServicio(editingId, data)
    if (error) {
      toast.error("Error al actualizar")
      return
    }
    toast.success("Servicio actualizado")
    setEditingId(null)
    fetchAllServicios()
  }

  const handleToggleActivo = async (id: string, activo: boolean) => {
    const { error } = await updateServicio(id, { activo: !activo })
    if (error) {
      toast.error("Error al cambiar estado")
      return
    }
    fetchAllServicios()
  }

  const handleDelete = async (id: string) => {
    const { error } = await deleteServicio(id)
    if (error) {
      toast.error("Error al eliminar. Puede tener turnos asociados.")
    } else {
      toast.success("Servicio eliminado")
      fetchAllServicios()
    }
    setConfirmDeleteId(null)
  }

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Servicios</h3>
        {!showAdd && (
          <Button
            size="sm"
            onClick={() => {
              reset({ nombre: "", precio: 0, duracion_minutos: 30 })
              setShowAdd(true)
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleSubmit(onAdd)}
          className="border rounded-lg p-4 space-y-3 bg-muted/30"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input placeholder="Ej: Corte" {...register("nombre")} />
              {errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Precio ($)</Label>
              <Input
                type="number"
                placeholder="14000"
                {...register("precio")}
              />
              {errors.precio && (
                <p className="text-xs text-red-500 mt-1">{errors.precio.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Duración (min)</Label>
              <Input
                type="number"
                placeholder="30"
                {...register("duracion_minutos")}
              />
              {errors.duracion_minutos && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.duracion_minutos.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Check className="w-4 h-4 mr-1" />
              Guardar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(false)}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {servicios.map((servicio) => (
          <div key={servicio.id}>
            {editingId === servicio.id ? (
              <form
                onSubmit={handleSubmitEdit(onEdit)}
                className="border rounded-lg p-3 space-y-3 bg-muted/30"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Input
                      placeholder="Nombre"
                      {...registerEdit("nombre")}
                    />
                    {errorsEdit.nombre && (
                      <p className="text-xs text-red-500 mt-1">
                        {errorsEdit.nombre.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Precio"
                      {...registerEdit("precio")}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Duración"
                      {...registerEdit("duracion_minutos")}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{servicio.nombre}</span>
                    {!servicio.activo && (
                      <Badge variant="outline" className="text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    <span className="font-semibold text-foreground">
                      {formatPrecio(servicio.precio)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {servicio.duracion_minutos} min
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActivo(servicio.id, servicio.activo)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      servicio.activo
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {servicio.activo ? "Activo" : "Inactivo"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(servicio.id)
                      resetEdit({
                        nombre: servicio.nombre,
                        precio: servicio.precio,
                        duracion_minutos: servicio.duracion_minutos,
                      })
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {confirmDeleteId === servicio.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(servicio.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-xs bg-muted rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(servicio.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {servicios.length === 0 && !showAdd && (
        <p className="text-center text-muted-foreground py-8">
          No hay servicios configurados
        </p>
      )}
    </div>
  )
}
