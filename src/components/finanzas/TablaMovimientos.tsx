import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { formatPrecio, formatFecha } from "@/lib/utils"
import type { Movimiento } from "@/types/database"

const CATEGORIA_LABELS: Record<string, string> = {
  turno: "Turno",
  producto: "Producto",
  alquiler: "Alquiler",
  servicios: "Servicios",
  insumos: "Insumos",
  impuestos: "Impuestos",
  sueldo: "Sueldo",
  otro: "Otro",
}

interface Props {
  movimientos: Movimiento[]
  onDelete: (id: string) => Promise<{ error: Error | null }>
}

export function TablaMovimientos({ movimientos, onDelete }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await onDelete(deleteId)
    if (error) {
      toast.error("Error al eliminar el movimiento")
    } else {
      toast.success("Movimiento eliminado")
    }
    setDeleteId(null)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Movimientos del mes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay movimientos registrados este mes
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatFecha(m.fecha)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.tipo === "ingreso" ? "default" : "destructive"}
                          className={
                            m.tipo === "ingreso"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : ""
                          }
                        >
                          {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {CATEGORIA_LABELS[m.categoria] ?? m.categoria}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {m.descripcion}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium text-sm ${
                          m.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {m.tipo === "ingreso" ? "+" : "-"}
                        {formatPrecio(m.monto)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => setDeleteId(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar movimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el movimiento permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
