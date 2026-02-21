import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrecio } from "@/lib/utils"

interface DatosDia {
  fecha: string
  ingresos: number
  egresos: number
}

interface Props {
  datos: DatosDia[]
}

export function GraficoBarras({ datos }: Props) {
  const chartData = datos.map((d) => ({
    dia: d.fecha.split("-")[2],
    Ingresos: d.ingresos,
    Egresos: d.egresos,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ingresos vs Egresos por día</CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip
                formatter={(value) => formatPrecio(value as number)}
                labelFormatter={(label) => `Día ${label}`}
                contentStyle={{
                  backgroundColor: "#1A1A1A",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="Ingresos"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
              <Bar
                dataKey="Egresos"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
