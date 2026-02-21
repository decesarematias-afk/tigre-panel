import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Movimiento, TipoMovimiento, CategoriaMovimiento } from "@/types/database"

interface ResumenMes {
  totalIngresos: number
  totalEgresos: number
  balance: number
  porCategoria: { categoria: string; tipo: TipoMovimiento; total: number }[]
  porDia: { fecha: string; ingresos: number; egresos: number }[]
}

export function useFinanzas(mes: number, anio: number) {
  const { negocio } = useAuth()
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)

  const desde = `${anio}-${String(mes + 1).padStart(2, "0")}-01`
  const hasta = new Date(anio, mes + 1, 0).toISOString().split("T")[0]

  const fetchMovimientos = useCallback(async () => {
    if (!negocio) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("movimientos")
      .select("*")
      .eq("negocio_id", negocio.id)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })

    if (data) setMovimientos(data as Movimiento[])
    setLoading(false)
  }, [negocio, desde, hasta])

  useEffect(() => {
    fetchMovimientos()
  }, [fetchMovimientos])

  const resumen: ResumenMes = useMemo(() => {
    const totalIngresos = movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((sum, m) => sum + m.monto, 0)
    const totalEgresos = movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((sum, m) => sum + m.monto, 0)

    // Agrupar por categoría
    const catMap = new Map<string, { categoria: string; tipo: TipoMovimiento; total: number }>()
    for (const m of movimientos) {
      const key = `${m.tipo}-${m.categoria}`
      const existing = catMap.get(key)
      if (existing) {
        existing.total += m.monto
      } else {
        catMap.set(key, { categoria: m.categoria, tipo: m.tipo, total: m.monto })
      }
    }

    // Agrupar por día para el gráfico
    const diaMap = new Map<string, { ingresos: number; egresos: number }>()
    for (const m of movimientos) {
      const existing = diaMap.get(m.fecha) ?? { ingresos: 0, egresos: 0 }
      if (m.tipo === "ingreso") {
        existing.ingresos += m.monto
      } else {
        existing.egresos += m.monto
      }
      diaMap.set(m.fecha, existing)
    }

    // Generar todos los días del mes
    const diasDelMes = new Date(anio, mes + 1, 0).getDate()
    const porDia: { fecha: string; ingresos: number; egresos: number }[] = []
    for (let d = 1; d <= diasDelMes; d++) {
      const fecha = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const dia = diaMap.get(fecha) ?? { ingresos: 0, egresos: 0 }
      porDia.push({ fecha, ...dia })
    }

    return {
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
      porCategoria: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
      porDia,
    }
  }, [movimientos, mes, anio])

  const createMovimiento = async (mov: {
    tipo: TipoMovimiento
    categoria: CategoriaMovimiento
    monto: number
    descripcion: string
    fecha: string
    turno_id?: string
  }) => {
    if (!negocio) return { data: null, error: new Error("Sin negocio") }
    const { data, error } = await supabase
      .from("movimientos")
      .insert({ ...mov, negocio_id: negocio.id })
      .select()
      .single()
    if (!error) fetchMovimientos()
    return { data: data as Movimiento | null, error }
  }

  const deleteMovimiento = async (id: string) => {
    const { error } = await supabase.from("movimientos").delete().eq("id", id)
    if (!error) fetchMovimientos()
    return { error }
  }

  return {
    movimientos,
    loading,
    resumen,
    createMovimiento,
    deleteMovimiento,
    refetch: fetchMovimientos,
  }
}
