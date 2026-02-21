import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useClientes } from "@/hooks/useClientes"
import type { Cliente } from "@/types/database"
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

const clienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  telefono: z.string().optional(),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  notas: z.string().optional(),
})

type ClienteFormData = z.infer<typeof clienteSchema>

interface ClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente | null
}

export function ClienteDialog({
  open,
  onOpenChange,
  cliente,
}: ClienteDialogProps) {
  const { createCliente, updateCliente } = useClientes()
  const isEditing = !!cliente

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  })

  useEffect(() => {
    if (open) {
      reset({
        nombre: cliente?.nombre ?? "",
        telefono: cliente?.telefono ?? "",
        email: cliente?.email ?? "",
        notas: cliente?.notas ?? "",
      })
    }
  }, [open, cliente, reset])

  const onSubmit = async (data: ClienteFormData) => {
    if (isEditing && cliente) {
      const { error } = await updateCliente(cliente.id, {
        nombre: data.nombre,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        notas: data.notas || undefined,
      })
      if (error) {
        toast.error("Error al actualizar el cliente")
        return
      }
      toast.success("Cliente actualizado")
    } else {
      const { error } = await createCliente({
        nombre: data.nombre,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        notas: data.notas || undefined,
      })
      if (error) {
        toast.error("Error al crear el cliente")
        return
      }
      toast.success("Cliente creado")
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input placeholder="Nombre completo" {...register("nombre")} />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input placeholder="+54 9 11 ..." {...register("telefono")} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Alguna nota sobre el cliente..."
              {...register("notas")}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear cliente"}
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
