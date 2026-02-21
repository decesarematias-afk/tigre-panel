import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { formatPrecio } from "@/lib/utils"

interface Props {
  totalIngresos: number
  totalEgresos: number
  balance: number
}

export function ResumenFinanzas({ totalIngresos, totalEgresos, balance }: Props) {
  const cards = [
    {
      label: "Ingresos",
      value: formatPrecio(totalIngresos),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Egresos",
      value: formatPrecio(totalEgresos),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Balance",
      value: formatPrecio(balance),
      icon: Wallet,
      color: balance >= 0 ? "text-green-600" : "text-red-600",
      bg: balance >= 0 ? "bg-green-50" : "bg-red-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
