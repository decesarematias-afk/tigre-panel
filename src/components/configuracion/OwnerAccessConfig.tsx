import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Phone, Key, Eye, EyeOff, RefreshCw } from "lucide-react"

const ownerSchema = z.object({
  owner_phone: z.string().optional(),
  owner_access_key: z.string().optional(),
})

type OwnerFormData = z.infer<typeof ownerSchema>

function generateAccessKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let key = ""
  for (let i = 0; i < 6; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export function OwnerAccessConfig() {
  const { negocio, updateNegocio } = useAuth()
  const [showKey, setShowKey] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
  })

  useEffect(() => {
    if (negocio) {
      reset({
        owner_phone: negocio.owner_phone ?? "",
        owner_access_key: negocio.owner_access_key ?? "",
      })
    }
  }, [negocio, reset])

  const onSubmit = async (data: OwnerFormData) => {
    const { error } = await updateNegocio({
      owner_phone: data.owner_phone || null,
      owner_access_key: data.owner_access_key || null,
    })
    if (error) {
      toast.error("Error al guardar la configuración")
    } else {
      toast.success("Configuración de dueño guardada")
    }
  }

  const handleGenerateKey = () => {
    const key = generateAccessKey()
    setValue("owner_access_key", key, { shouldDirty: true })
    setShowKey(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Acceso de Dueño (WhatsApp Bot)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Configurá tu número de WhatsApp y una clave secreta. Enviá la clave al
          bot por WhatsApp para que te reconozca como dueño y puedas consultar
          la agenda, clientes, etc.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="owner_phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Teléfono del dueño
            </Label>
            <Input
              id="owner_phone"
              placeholder="5491159027202"
              {...register("owner_phone")}
            />
            {errors.owner_phone && (
              <p className="text-sm text-red-500">{errors.owner_phone.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Número con código de país, sin + ni espacios (ej: 5491159027202, 34604473670)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_access_key" className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              Clave de acceso
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="owner_access_key"
                  type={showKey ? "text" : "password"}
                  placeholder="Tu clave secreta"
                  {...register("owner_access_key")}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateKey}
                title="Generar clave aleatoria"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enviá esta clave al bot por WhatsApp para autenticarte como dueño
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
