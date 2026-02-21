import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventInput, EventClickArg } from "@fullcalendar/core"
import type { DateClickArg } from "@fullcalendar/interaction"
import { useTurnos } from "@/hooks/useTurnos"
import type { Turno, EstadoTurno } from "@/types/database"

const STATUS_COLORS: Record<EstadoTurno, string> = {
  pendiente: "#EAB308",
  confirmado: "#3B82F6",
  completado: "#22C55E",
  cancelado: "#EF4444",
}

interface CalendarioTurnosProps {
  onDateClick: (date: Date) => void
  onEventClick: (turno: Turno) => void
}

export function CalendarioTurnos({
  onDateClick,
  onEventClick,
}: CalendarioTurnosProps) {
  const { turnos, loading } = useTurnos()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const events: EventInput[] = turnos.map((turno) => ({
    id: turno.id,
    title: `${turno.cliente?.nombre ?? "Cliente"} - ${turno.servicio?.nombre ?? "Servicio"}`,
    start: `${turno.fecha}T${turno.hora_inicio}`,
    end: `${turno.fecha}T${turno.hora_fin}`,
    backgroundColor: STATUS_COLORS[turno.estado],
    borderColor: STATUS_COLORS[turno.estado],
    extendedProps: { turno },
  }))

  const handleDateClick = (info: DateClickArg) => {
    onDateClick(info.date)
  }

  const handleEventClick = (info: EventClickArg) => {
    const turno = info.event.extendedProps.turno as Turno
    onEventClick(turno)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Cargando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-2 md:p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
        locale="es"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: isMobile
            ? "timeGridDay,dayGridMonth"
            : "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
        }}
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        height="auto"
        nowIndicator
        editable={false}
        selectable
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        dayHeaderFormat={{
          weekday: "short",
          day: "numeric",
        }}
        eventContent={(eventInfo) => (
          <div className="p-0.5 text-xs overflow-hidden leading-tight">
            <div className="font-semibold truncate">{eventInfo.timeText}</div>
            <div className="truncate opacity-90">{eventInfo.event.title}</div>
          </div>
        )}
      />
    </div>
  )
}
