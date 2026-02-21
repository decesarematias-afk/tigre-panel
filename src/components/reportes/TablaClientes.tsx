import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Download } from "lucide-react"
import { formatPrecio, formatFecha } from "@/lib/utils"
import { exportToCSV } from "@/lib/export"

interface ClienteStats {
  nombre: string
  telefono: string | null
  turnos: number
  ingresos: number
  ultimaVisita: string
}

interface Props {
  clientes: ClienteStats[]
}

export function TablaClientes({ clientes }: Props) {
  const handleExport = () => {
    exportToCSV(
      clientes.map((c) => ({
        ...c,
        ultimaVisita: formatFecha(c.ultimaVisita),
      })) as unknown as Record<string, unknown>[],
      [
        { key: "nombre", label: "Cliente" },
        { key: "telefono", label: "Teléfono" },
        { key: "turnos", label: "Turnos" },
        { key: "ingresos", label: "Ingresos" },
        { key: "ultimaVisita", label: "Última visita" },
      ],
      "clientes_reporte"
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" />
          Top 10 clientes
        </CardTitle>
        {clientes.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin datos para este período
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pl-4 sm:pl-0 font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-center">
                    Turnos
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Ingresos
                  </th>
                  <th className="pb-2 pr-4 sm:pr-0 font-medium text-muted-foreground text-right hidden sm:table-cell">
                    Última visita
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2.5 pl-4 sm:pl-0">
                      <div>
                        <p className="font-medium">{c.nombre}</p>
                        {c.telefono && (
                          <p className="text-xs text-muted-foreground">
                            {c.telefono}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-center">{c.turnos}</td>
                    <td className="py-2.5 text-right font-medium">
                      {formatPrecio(c.ingresos)}
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-0 text-right text-muted-foreground hidden sm:table-cell">
                      {formatFecha(c.ultimaVisita)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
