import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Servicio } from "@/types/database"

export function useServicios() {
  const { negocio } = useAuth()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)

  const fetchServicios = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("servicios")
      .select("*")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .order("nombre")

    if (data) setServicios(data as Servicio[])
    setLoading(false)
  }, [negocio])

  const fetchAllServicios = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("servicios")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre")

    if (data) setServicios(data as Servicio[])
    setLoading(false)
  }, [negocio])

  useEffect(() => {
    fetchServicios()
  }, [fetchServicios])

  const createServicio = async (servicio: {
    nombre: string
    precio: number
    duracion_minutos: number
  }) => {
    if (!negocio) return { data: null, error: new Error("Sin negocio") }
    const { data, error } = await supabase
      .from("servicios")
      .insert({ ...servicio, negocio_id: negocio.id, activo: true })
      .select()
      .single()
    if (!error) fetchServicios()
    return { data: data as Servicio | null, error }
  }

  const updateServicio = async (
    id: string,
    updates: Partial<Pick<Servicio, "nombre" | "precio" | "duracion_minutos" | "activo">>
  ) => {
    const { data, error } = await supabase
      .from("servicios")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (!error) fetchServicios()
    return { data: data as Servicio | null, error }
  }

  const deleteServicio = async (id: string) => {
    const { error } = await supabase.from("servicios").delete().eq("id", id)
    if (!error) fetchServicios()
    return { error }
  }

  return {
    servicios,
    loading,
    createServicio,
    updateServicio,
    deleteServicio,
    fetchAllServicios,
    refetch: fetchServicios,
  }
}
