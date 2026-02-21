import { useMemo } from "react"
import { useTurnos } from "@/hooks/useTurnos"
import type { Turno } from "@/types/database"

interface ServicioStats {
  nombre: string
  cantidad: number
  ingresos: number
}

interface ClienteStats {
  nombre: string
  telefono: string | null
  turnos: number
  ingresos: number
  ultimaVisita: string
}

interface ReporteStats {
  totalTurnos: number
  turnosCompletados: number
  turnosCancelados: number
  ingresosCobrados: number
  ingresosPendientes: number
  tasaCompletados: number
  tasaCancelados: number
  ticketPromedio: number
  serviciosRanking: ServicioStats[]
  clientesRanking: ClienteStats[]
  turnosFiltrados: Turno[]
}

export function useReportes(desde: string, hasta: string): ReporteStats {
  const { turnos } = useTurnos()

  return useMemo(() => {
    // Filtrar turnos por rango de fechas
    const turnosFiltrados = turnos.filter(
      (t) => t.fecha >= desde && t.fecha <= hasta
    )

    const completados = turnosFiltrados.filter((t) => t.estado === "completado")
    const cancelados = turnosFiltrados.filter((t) => t.estado === "cancelado")
    const cobrados = turnosFiltrados.filter((t) => t.cobrado && t.monto_cobrado)

    const ingresosCobrados = cobrados.reduce(
      (sum, t) => sum + (t.monto_cobrado ?? 0),
      0
    )

    const pendientesCobro = completados.filter((t) => !t.cobrado)
    const ingresosPendientes = pendientesCobro.reduce(
      (sum, t) => sum + (t.servicio?.precio ?? 0),
      0
    )

    const totalTurnos = turnosFiltrados.length
    const tasaCompletados =
      totalTurnos > 0 ? (completados.length / totalTurnos) * 100 : 0
    const tasaCancelados =
      totalTurnos > 0 ? (cancelados.length / totalTurnos) * 100 : 0
    const ticketPromedio =
      cobrados.length > 0 ? ingresosCobrados / cobrados.length : 0

    // Ranking de servicios
    const serviciosMap = new Map<string, ServicioStats>()
    for (const t of turnosFiltrados) {
      if (t.estado === "cancelado") continue
      const nombre = t.servicio?.nombre ?? "Sin servicio"
      const existing = serviciosMap.get(nombre) ?? {
        nombre,
        cantidad: 0,
        ingresos: 0,
      }
      existing.cantidad += 1
      if (t.cobrado && t.monto_cobrado) {
        existing.ingresos += t.monto_cobrado
      }
      serviciosMap.set(nombre, existing)
    }
    const serviciosRanking = Array.from(serviciosMap.values()).sort(
      (a, b) => b.cantidad - a.cantidad
    )

    // Ranking de clientes
    const clientesMap = new Map<string, ClienteStats>()
    for (const t of turnosFiltrados) {
      if (t.estado === "cancelado") continue
      const clienteId = t.cliente_id
      const existing = clientesMap.get(clienteId) ?? {
        nombre: t.cliente?.nombre ?? "Sin nombre",
        telefono: t.cliente?.telefono ?? null,
        turnos: 0,
        ingresos: 0,
        ultimaVisita: t.fecha,
      }
      existing.turnos += 1
      if (t.cobrado && t.monto_cobrado) {
        existing.ingresos += t.monto_cobrado
      }
      if (t.fecha > existing.ultimaVisita) {
        existing.ultimaVisita = t.fecha
      }
      clientesMap.set(clienteId, existing)
    }
    const clientesRanking = Array.from(clientesMap.values())
      .sort((a, b) => b.turnos - a.turnos)
      .slice(0, 10)

    return {
      totalTurnos,
      turnosCompletados: completados.length,
      turnosCancelados: cancelados.length,
      ingresosCobrados,
      ingresosPendientes,
      tasaCompletados,
      tasaCancelados,
      ticketPromedio,
      serviciosRanking,
      clientesRanking,
      turnosFiltrados,
    }
  }, [turnos, desde, hasta])
}
