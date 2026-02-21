import { useState, useMemo } from "react"
import { useClientes } from "@/hooks/useClientes"
import { ClienteDialog } from "@/components/clientes/ClienteDialog"
import { HistorialCliente } from "@/components/clientes/HistorialCliente"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Cliente } from "@/types/database"
import {
  Plus,
  Search,
  Phone,
  Mail,
  History,
  Pencil,
  Trash2,
  Download,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { exportToCSV } from "@/lib/export"

export function Clientes() {
  const { clientes, loading, deleteCliente } = useClientes()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [historialCliente, setHistorialCliente] = useState<Cliente | null>(null)
  const filtered = useMemo(() => {
    if (!search.trim()) return clientes
    const q = search.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clientes, search])

  const handleDelete = async (id: string) => {
    const { error } = await deleteCliente(id)
    if (error) {
      toast.error("Error al eliminar. Puede tener turnos asociados.")
    } else {
      toast.success("Cliente eliminado")
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex items-center gap-2">
          {clientes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  clientes as unknown as Record<string, unknown>[],
                  [
                    { key: "nombre", label: "Nombre" },
                    { key: "telefono", label: "Teléfono" },
                    { key: "email", label: "Email" },
                    { key: "notas", label: "Notas" },
                    { key: "created_at", label: "Registrado" },
                  ],
                  "clientes"
                )
              }
            >
              <Download className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingCliente(null)
              setDialogOpen(true)
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nuevo cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-secondary/10 text-secondary">
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 md:p-4 rounded-lg border border-border bg-card"
            >
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-3 w-[200px]" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {search ? "No se encontraron clientes" : "No hay clientes todavía"}
          </p>
          {!search && (
            <p className="text-sm text-muted-foreground mt-1">
              Agregá tu primer cliente para empezar
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cliente) => (
            <div
              key={cliente.id}
              className="flex items-center gap-3 p-3 md:p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-secondary">
                  {cliente.nombre[0]?.toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{cliente.nombre}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                  {cliente.telefono && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {cliente.telefono}
                    </span>
                  )}
                  {cliente.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {cliente.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setHistorialCliente(cliente)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-colors"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Ver historial</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setEditingCliente(cliente)
                        setDialogOpen(true)
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <button className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar a {cliente.nombre}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Si el cliente tiene turnos asociados, no podrá ser eliminado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cliente.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ClienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cliente={editingCliente}
      />

      {historialCliente && (
        <HistorialCliente
          cliente={historialCliente}
          open={!!historialCliente}
          onOpenChange={(isOpen) => {
            if (!isOpen) setHistorialCliente(null)
          }}
        />
      )}
    </div>
  )
}
