import { useState } from "react"
import { useFinanzas } from "@/hooks/useFinanzas"
import { ResumenFinanzas } from "@/components/finanzas/ResumenFinanzas"
import { GraficoBarras } from "@/components/finanzas/GraficoBarras"
import { TablaMovimientos } from "@/components/finanzas/TablaMovimientos"
import { CrearMovimientoDialog } from "@/components/finanzas/CrearMovimientoDialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function Finanzas() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth())
  const [anio, setAnio] = useState(now.getFullYear())
  const [crearOpen, setCrearOpen] = useState(false)

  const { movimientos, loading, resumen, createMovimiento, deleteMovimiento } =
    useFinanzas(mes, anio)

  const mesAnterior = () => {
    if (mes === 0) {
      setMes(11)
      setAnio(anio - 1)
    } else {
      setMes(mes - 1)
    }
  }

  const mesSiguiente = () => {
    if (mes === 11) {
      setMes(0)
      setAnio(anio + 1)
    } else {
      setMes(mes + 1)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <Button
          onClick={() => setCrearOpen(true)}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar
        </Button>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={mesAnterior}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold min-w-[180px] text-center">
          {MESES[mes]} {anio}
        </span>
        <Button variant="outline" size="icon" onClick={mesSiguiente}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Cargando finanzas...</p>
          </div>
        </div>
      ) : (
        <>
          <ResumenFinanzas
            totalIngresos={resumen.totalIngresos}
            totalEgresos={resumen.totalEgresos}
            balance={resumen.balance}
          />

          <GraficoBarras datos={resumen.porDia} />

          <TablaMovimientos
            movimientos={movimientos}
            onDelete={deleteMovimiento}
          />
        </>
      )}

      <CrearMovimientoDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        onSubmit={createMovimiento}
        defaultFecha={`${anio}-${String(mes + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
      />
    </div>
  )
}
