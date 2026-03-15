import { useEffect, useState, useCallback } from "react"
import { Wifi, WifiOff, QrCode, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  isWahaConfigured,
  getWahaStatus,
  getWahaQRBase64,
  type WahaSessionStatus,
} from "@/lib/waha"

const STATUS_CONFIG: Record<
  WahaSessionStatus,
  { label: string; color: string; icon: typeof Wifi }
> = {
  WORKING: { label: "Conectado", color: "bg-green-100 text-green-700", icon: Wifi },
  SCAN_QR_CODE: { label: "Esperando QR", color: "bg-yellow-100 text-yellow-700", icon: QrCode },
  STARTING: { label: "Iniciando...", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  STOPPED: { label: "Desconectado", color: "bg-red-100 text-red-700", icon: WifiOff },
  FAILED: { label: "Error", color: "bg-red-100 text-red-700", icon: WifiOff },
}

export function WahaStatus() {
  const [status, setStatus] = useState<WahaSessionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const configured = isWahaConfigured()

  const checkStatus = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }
    try {
      const result = await getWahaStatus()
      setStatus(result?.status ?? null)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    checkStatus()
    if (!configured) return
    const interval = setInterval(checkStatus, 30_000)
    return () => clearInterval(interval)
  }, [checkStatus, configured])

  const fetchQR = useCallback(async () => {
    setQrLoading(true)
    try {
      const src = await getWahaQRBase64()
      setQrSrc(src)
    } catch {
      setQrSrc(null)
    } finally {
      setQrLoading(false)
    }
  }, [])

  // Auto-refresh QR every 15s when dialog is open
  useEffect(() => {
    if (!qrOpen) return
    fetchQR()
    const interval = setInterval(fetchQR, 15_000)
    return () => clearInterval(interval)
  }, [qrOpen, fetchQR])

  // Also re-check status while QR dialog is open
  useEffect(() => {
    if (!qrOpen) return
    const interval = setInterval(async () => {
      const result = await getWahaStatus()
      if (result?.status === "WORKING") {
        setStatus("WORKING")
        setQrOpen(false)
      }
    }, 5_000)
    return () => clearInterval(interval)
  }, [qrOpen])

  if (!configured) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
        <WifiOff className="w-3 h-3" />
        WAHA no configurada
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verificando...
      </div>
    )
  }

  if (!status) {
    return (
      <button
        onClick={checkStatus}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
      >
        <WifiOff className="w-3 h-3" />
        Sin conexión
        <RefreshCw className="w-3 h-3" />
      </button>
    )
  }

  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <>
      <button
        onClick={() => {
          if (status === "SCAN_QR_CODE") {
            setQrOpen(true)
          } else {
            checkStatus()
          }
        }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors hover:opacity-80",
          config.color
        )}
      >
        <Icon
          className={cn(
            "w-3 h-3",
            status === "STARTING" && "animate-spin"
          )}
        />
        {config.label}
        {status !== "SCAN_QR_CODE" && status !== "STARTING" && (
          <RefreshCw className="w-3 h-3 opacity-60" />
        )}
      </button>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Escanear código QR</DialogTitle>
            <DialogDescription>
              Abrí WhatsApp en tu celular, andá a Dispositivos vinculados y
              escaneá este código QR.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {qrLoading && !qrSrc ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrSrc ? (
              <img
                src={qrSrc}
                alt="QR Code de WhatsApp"
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  No se pudo cargar el QR. Verificá que WAHA esté corriendo.
                </p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            El QR se actualiza automáticamente cada 15 segundos
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
