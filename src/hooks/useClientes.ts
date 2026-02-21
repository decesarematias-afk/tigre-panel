import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Cliente, Turno } from "@/types/database"

export function useClientes() {
  const { negocio } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClientes = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre")

    if (data) setClientes(data as Cliente[])
    setLoading(false)
  }, [negocio])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const searchClientes = async (query: string) => {
    if (!negocio || !query.trim()) return clientes
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("negocio_id", negocio.id)
      .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%`)
      .order("nombre")
      .limit(20)
    return (data as Cliente[]) ?? []
  }

  const createCliente = async (cliente: {
    nombre: string
    telefono?: string
    email?: string
    notas?: string
  }) => {
    if (!negocio) return { data: null, error: new Error("Sin negocio") }
    const { data, error } = await supabase
      .from("clientes")
      .insert({ ...cliente, negocio_id: negocio.id })
      .select()
      .single()
    if (!error) fetchClientes()
    return { data: data as Cliente | null, error }
  }

  const updateCliente = async (
    id: string,
    updates: Partial<Pick<Cliente, "nombre" | "telefono" | "email" | "notas">>
  ) => {
    const { data, error } = await supabase
      .from("clientes")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (!error) fetchClientes()
    return { data: data as Cliente | null, error }
  }

  const deleteCliente = async (id: string) => {
    const { error } = await supabase.from("clientes").delete().eq("id", id)
    if (!error) fetchClientes()
    return { error }
  }

  const getHistorial = async (clienteId: string) => {
    const { data } = await supabase
      .from("turnos")
      .select("*, servicio:servicios(*)")
      .eq("cliente_id", clienteId)
      .order("fecha", { ascending: false })
      .limit(50)
    return (data as unknown as Turno[]) ?? []
  }

  return {
    clientes,
    loading,
    searchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    getHistorial,
    refetch: fetchClientes,
  }
}
