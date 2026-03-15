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
import { MessageSquare, Link, Key, Eye, EyeOff, Loader2 } from "lucide-react"
import { getWahaStatus, type WahaSessionStatus } from "@/lib/waha"

const wahaSchema = z.object({
  waha_url: z.string().url("Ingresá una URL válida (ej: http://tu-ip:3000)").or(z.literal("")),
  waha_api_key: z.string().optional(),
})

type WahaFormData = z.infer<typeof wahaSchema>

export function WahaConfig() {
  const { negocio, updateNegocio } = useAuth()
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<WahaSessionStatus | "error" | null>(null)
  const [testing, setTesting] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WahaFormData>({
    resolver: zodResolver(wahaSchema),
  })

  useEffect(() => {
    if (negocio) {
      reset({
        waha_url: negocio.waha_url ?? "",
        waha_api_key: negocio.waha_api_key ?? "",
      })
    }
  }, [negocio, reset])

  const onSubmit = async (data: WahaFormData) => {
    const { error } = await updateNegocio({
      waha_url: data.waha_url || null,
      waha_api_key: data.waha_api_key || null,
    })
    if (error) {
      toast.error("Error al guardar la configuración")
    } else {
      toast.success("Configuración de WAHA guardada")
    }
  }

  const testConnection = async () => {
    const url = getValues("waha_url")
    const key = getValues("waha_api_key")
    if (!url) {
      toast.error("Ingresá la URL de WAHA primero")
      return
    }
    setTesting(true)
    setTestStatus(null)
    try {
      const result = await getWahaStatus("default", url, key || undefined)
      if (result) {
        setTestStatus(result.status)
        if (result.status === "WORKING") {
          toast.success(`Conexión exitosa — sesión activa (${result.name})`)
        } else if (result.status === "SCAN_QR_CODE") {
          toast.warning("Conectado a WAHA pero la sesión necesita escanear QR")
        } else {
          toast.warning(`Conectado a WAHA — estado: ${result.status}`)
        }
      } else {
        setTestStatus("error")
        toast.error("No se pudo conectar a WAHA. Verificá la URL y API key.")
      }
    } catch {
      setTestStatus("error")
      toast.error("Error de conexión. Verificá que WAHA esté corriendo.")
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Conexión WAHA (WhatsApp)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waha_url" className="flex items-center gap-2">
              <Link className="w-4 h-4 text-muted-foreground" />
              URL de WAHA
            </Label>
            <Input
              id="waha_url"
              placeholder="http://tu-ip:3000"
              {...register("waha_url")}
            />
            {errors.waha_url && (
              <p className="text-sm text-red-500">{errors.waha_url.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              La URL del servidor donde corre WAHA (sin barra final)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waha_api_key" className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              API Key de WAHA
            </Label>
            <div className="relative">
              <Input
                id="waha_api_key"
                type={showKey ? "text" : "password"}
                placeholder="Tu API key"
                {...register("waha_api_key")}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Opcional — solo si configuraste autenticación en WAHA
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Probando...
                </>
              ) : (
                "Probar conexión"
              )}
            </Button>
          </div>

          {testStatus && (
            <div
              className={`text-sm px-3 py-2 rounded-md ${
                testStatus === "WORKING"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : testStatus === "SCAN_QR_CODE"
                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {testStatus === "WORKING" && "Sesión de WhatsApp activa y funcionando"}
              {testStatus === "SCAN_QR_CODE" && "Sesión necesita escanear código QR — andá a WhatsApp en el panel"}
              {testStatus === "STARTING" && "WAHA está iniciando..."}
              {testStatus === "STOPPED" && "Sesión detenida en WAHA"}
              {testStatus === "FAILED" && "Sesión con error en WAHA"}
              {testStatus === "error" && "No se pudo conectar a WAHA — verificá la URL y que el servicio esté corriendo"}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
