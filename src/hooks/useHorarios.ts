import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { HorarioAtencion } from "@/types/database"

export function useHorarios() {
  const { negocio } = useAuth()
  const [horarios, setHorarios] = useState<HorarioAtencion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHorarios = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("horarios_atencion")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("dia_semana")

    if (data) setHorarios(data as HorarioAtencion[])
    setLoading(false)
  }, [negocio])

  useEffect(() => {
    fetchHorarios()
  }, [fetchHorarios])

  const updateHorario = async (
    id: string,
    updates: Partial<Pick<
      HorarioAtencion,
      "hora_apertura_manana" | "hora_cierre_manana" | "hora_apertura_tarde" | "hora_cierre_tarde" | "cerrado"
    >>
  ) => {
    const { data, error } = await supabase
      .from("horarios_atencion")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (!error) fetchHorarios()
    return { data: data as HorarioAtencion | null, error }
  }

  /**
   * Genera los slots de tiempo disponibles para un día específico.
   * Devuelve arrays de strings "HH:MM" en intervalos de 15 minutos.
   */
  function getAvailableSlots(fecha: Date): string[] {
    const diaSemana = fecha.getDay()
    const horario = horarios.find((h) => h.dia_semana === diaSemana)

    if (!horario || horario.cerrado) return []

    const slots: string[] = []

    // Turno mañana
    if (horario.hora_apertura_manana && horario.hora_cierre_manana) {
      const slotsManana = generateSlots(
        horario.hora_apertura_manana,
        horario.hora_cierre_manana
      )
      slots.push(...slotsManana)
    }

    // Turno tarde
    if (horario.hora_apertura_tarde && horario.hora_cierre_tarde) {
      const slotsTarde = generateSlots(
        horario.hora_apertura_tarde,
        horario.hora_cierre_tarde
      )
      slots.push(...slotsTarde)
    }

    return slots
  }

  /**
   * Verifica si un turno propuesto cae dentro del horario de atención.
   */
  function isWithinBusinessHours(
    fecha: Date,
    horaInicio: string,
    horaFin: string
  ): boolean {
    const diaSemana = fecha.getDay()
    const horario = horarios.find((h) => h.dia_semana === diaSemana)

    if (!horario || horario.cerrado) return false

    const inicio = timeToMinutes(horaInicio)
    const fin = timeToMinutes(horaFin)

    // Check mañana
    if (horario.hora_apertura_manana && horario.hora_cierre_manana) {
      const apertura = timeToMinutes(horario.hora_apertura_manana)
      const cierre = timeToMinutes(horario.hora_cierre_manana)
      if (inicio >= apertura && fin <= cierre) return true
    }

    // Check tarde
    if (horario.hora_apertura_tarde && horario.hora_cierre_tarde) {
      const apertura = timeToMinutes(horario.hora_apertura_tarde)
      const cierre = timeToMinutes(horario.hora_cierre_tarde)
      if (inicio >= apertura && fin <= cierre) return true
    }

    return false
  }

  return {
    horarios,
    loading,
    updateHorario,
    getAvailableSlots,
    isWithinBusinessHours,
    refetch: fetchHorarios,
  }
}

function generateSlots(horaInicio: string, horaFin: string): string[] {
  const slots: string[] = []
  let current = timeToMinutes(horaInicio)
  const end = timeToMinutes(horaFin)

  while (current < end) {
    slots.push(minutesToTime(current))
    current += 15
  }

  return slots
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}
