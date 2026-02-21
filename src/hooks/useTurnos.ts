import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Turno, EstadoTurno, MetodoPago } from "@/types/database"

export function useTurnos() {
  const { negocio } = useAuth()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTurnos = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("turnos")
      .select("*, cliente:clientes(*), servicio:servicios(*)")
      .eq("negocio_id", negocio.id)
      .order("fecha", { ascending: true })

    if (data) setTurnos(data as unknown as Turno[])
    setLoading(false)
  }, [negocio])

  useEffect(() => {
    if (!negocio) return

    fetchTurnos()

    const channel = supabase
      .channel("turnos-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turnos",
          filter: `negocio_id=eq.${negocio.id}`,
        },
        () => {
          fetchTurnos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [negocio, fetchTurnos])

  const createTurno = async (turno: {
    cliente_id: string
    servicio_id: string
    fecha: string
    hora_inicio: string
    hora_fin: string
    estado?: EstadoTurno
    notas?: string
  }) => {
    if (!negocio) return { data: null, error: new Error("Sin negocio") }
    const { data, error } = await supabase
      .from("turnos")
      .insert({
        ...turno,
        negocio_id: negocio.id,
        estado: turno.estado ?? "pendiente",
      })
      .select("*, cliente:clientes(*), servicio:servicios(*)")
      .single()
    return { data: data as unknown as Turno | null, error }
  }

  const cobrarTurno = async (id: string, metodo_pago: MetodoPago, monto_cobrado: number) => {
    const { data, error } = await supabase
      .from("turnos")
      .update({ cobrado: true, metodo_pago, monto_cobrado } as never)
      .eq("id", id)
      .select("*, cliente:clientes(*), servicio:servicios(*)")
      .single()
    return { data: data as unknown as Turno | null, error }
  }

  const updateTurno = async (
    id: string,
    updates: Partial<Pick<Turno, "cliente_id" | "servicio_id" | "fecha" | "hora_inicio" | "hora_fin" | "estado" | "notas">>
  ) => {
    const { data, error } = await supabase
      .from("turnos")
      .update(updates)
      .eq("id", id)
      .select("*, cliente:clientes(*), servicio:servicios(*)")
      .single()
    return { data: data as unknown as Turno | null, error }
  }

  const updateEstado = async (id: string, estado: EstadoTurno) => {
    return updateTurno(id, { estado })
  }

  const deleteTurno = async (id: string) => {
    const { error } = await supabase.from("turnos").delete().eq("id", id)
    return { error }
  }

  return {
    turnos,
    loading,
    createTurno,
    updateTurno,
    updateEstado,
    cobrarTurno,
    deleteTurno,
    refetch: fetchTurnos,
  }
}
