import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, MapPin, Phone, Mail } from "lucide-react"

const negocioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
})

type NegocioFormData = z.infer<typeof negocioSchema>

export function NegocioConfig() {
  const { negocio, updateNegocio } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<NegocioFormData>({
    resolver: zodResolver(negocioSchema),
  })

  useEffect(() => {
    if (negocio) {
      reset({
        nombre: negocio.nombre,
        direccion: negocio.direccion ?? "",
        telefono: negocio.telefono ?? "",
        email: negocio.email ?? "",
      })
    }
  }, [negocio, reset])

  const onSubmit = async (data: NegocioFormData) => {
    const { error } = await updateNegocio({
      nombre: data.nombre,
      direccion: data.direccion || null,
      telefono: data.telefono || null,
      email: data.email || null,
    })
    if (error) {
      toast.error("Error al guardar los datos")
    } else {
      toast.success("Datos del negocio actualizados")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          Datos del negocio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="flex items-center gap-2">
              <Store className="w-4 h-4 text-muted-foreground" />
              Nombre del negocio
            </Label>
            <Input id="nombre" {...register("nombre")} />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Dirección
            </Label>
            <Input
              id="direccion"
              placeholder="Calle, número, localidad"
              {...register("direccion")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Teléfono / WhatsApp
            </Label>
            <Input
              id="telefono"
              placeholder="+54 9 11 XXXX-XXXX"
              {...register("telefono")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@tunegocio.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
