import { toast } from "sonner"
import { useHorarios } from "@/hooks/useHorarios"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]

export function HorariosConfig() {
  const { horarios, loading, updateHorario } = useHorarios()

  const handleToggle = async (id: string, cerrado: boolean) => {
    const { error } = await updateHorario(id, { cerrado: !cerrado })
    if (error) {
      toast.error("Error al actualizar")
    }
  }

  const handleTimeChange = async (
    id: string,
    field:
      | "hora_apertura_manana"
      | "hora_cierre_manana"
      | "hora_apertura_tarde"
      | "hora_cierre_tarde",
    value: string
  ) => {
    const { error } = await updateHorario(id, { [field]: value || null })
    if (error) {
      toast.error("Error al actualizar horario")
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (horarios.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No hay horarios configurados. Ejecutá el seed en Supabase.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Horarios de atención</h3>
      <p className="text-sm text-muted-foreground">
        Configurá los horarios de apertura para cada día de la semana.
      </p>

      <div className="space-y-3">
        {horarios.map((horario) => (
          <div
            key={horario.id}
            className={`rounded-lg border p-4 transition-colors ${
              horario.cerrado ? "bg-muted/50 opacity-60" : "bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">
                {DIAS[horario.dia_semana]}
              </span>
              <button
                onClick={() => handleToggle(horario.id, horario.cerrado)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  horario.cerrado
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-green-100 text-green-600 hover:bg-green-200"
                }`}
              >
                {horario.cerrado ? "Cerrado" : "Abierto"}
              </button>
            </div>

            {!horario.cerrado && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Turno mañana */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Turno mañana
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={horario.hora_apertura_manana ?? ""}
                      onChange={(e) =>
                        handleTimeChange(
                          horario.id,
                          "hora_apertura_manana",
                          e.target.value
                        )
                      }
                      className="text-sm"
                    />
                    <span className="text-muted-foreground text-sm">a</span>
                    <Input
                      type="time"
                      value={horario.hora_cierre_manana ?? ""}
                      onChange={(e) =>
                        handleTimeChange(
                          horario.id,
                          "hora_cierre_manana",
                          e.target.value
                        )
                      }
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Turno tarde */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Turno tarde
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={horario.hora_apertura_tarde ?? ""}
                      onChange={(e) =>
                        handleTimeChange(
                          horario.id,
                          "hora_apertura_tarde",
                          e.target.value
                        )
                      }
                      className="text-sm"
                    />
                    <span className="text-muted-foreground text-sm">a</span>
                    <Input
                      type="time"
                      value={horario.hora_cierre_tarde ?? ""}
                      onChange={(e) =>
                        handleTimeChange(
                          horario.id,
                          "hora_cierre_tarde",
                          e.target.value
                        )
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
