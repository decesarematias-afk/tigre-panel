import { useState } from "react"
import { useTurnos } from "@/hooks/useTurnos"
import { CalendarioTurnos } from "@/components/turnos/CalendarioTurnos"
import { CrearTurnoDialog } from "@/components/turnos/CrearTurnoDialog"
import { VerTurnoDialog } from "@/components/turnos/VerTurnoDialog"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Turno } from "@/types/database"

export function Dashboard() {
  const { turnos } = useTurnos()
  const [crearOpen, setCrearOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null)

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setCrearOpen(true)
  }

  const handleEventClick = (turno: Turno) => {
    setSelectedTurno(turno)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button
          onClick={() => {
            setSelectedDate(null)
            setCrearOpen(true)
          }}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo turno
        </Button>
      </div>

      <StatsCards turnos={turnos} />

      <CalendarioTurnos
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
      />

      <CrearTurnoDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        defaultDate={selectedDate}
      />

      {selectedTurno && (
        <VerTurnoDialog
          turno={selectedTurno}
          open={!!selectedTurno}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedTurno(null)
          }}
        />
      )}
    </div>
  )
}
