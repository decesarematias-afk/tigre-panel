import { useState } from "react"
import { toast } from "sonner"
import { useTurnos } from "@/hooks/useTurnos"
import { formatPrecio } from "@/lib/utils"
import type { Turno, MetodoPago } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Banknote, CreditCard, ArrowRightLeft, Smartphone } from "lucide-react"

const METODOS: { value: MetodoPago; label: string; icon: typeof Banknote }[] = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "transferencia", label: "Transferencia", icon: ArrowRightLeft },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { value: "mercadopago", label: "Mercado Pago", icon: Smartphone },
]

interface CobrarDialogProps {
  turno: Turno
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CobrarDialog({ turno, open, onOpenChange }: CobrarDialogProps) {
  const { cobrarTurno } = useTurnos()
  const precioServicio = turno.servicio?.precio ?? 0
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo")
  const [monto, setMonto] = useState(precioServicio.toString())
  const [loading, setLoading] = useState(false)

  const handleCobrar = async () => {
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("El monto debe ser mayor a 0")
      return
    }
    setLoading(true)
    const { error } = await cobrarTurno(turno.id, metodo, montoNum)
    setLoading(false)
    if (error) {
      toast.error("Error al registrar el cobro")
      return
    }
    toast.success(`Cobro de ${formatPrecio(montoNum)} registrado`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar turno</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info del turno */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">{turno.cliente?.nombre}</p>
            <p className="text-muted-foreground">
              {turno.servicio?.nombre} — {formatPrecio(precioServicio)}
            </p>
          </div>

          {/* Método de pago */}
          <div className="space-y-3">
            <Label>Método de pago</Label>
            <RadioGroup
              value={metodo}
              onValueChange={(val) => setMetodo(val as MetodoPago)}
              className="grid grid-cols-2 gap-2"
            >
              {METODOS.map((m) => (
                <Label
                  key={m.value}
                  htmlFor={m.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    metodo === m.value
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={m.value} id={m.value} className="sr-only" />
                  <m.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{m.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto a cobrar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                id="monto"
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="pl-7"
                min="0"
                step="100"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              onClick={handleCobrar}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Cobrando..." : `Cobrar ${formatPrecio(parseFloat(monto) || 0)}`}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
