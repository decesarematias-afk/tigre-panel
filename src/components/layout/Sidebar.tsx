import { NavLink } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { Calendar, Users, MessageCircle, BarChart3, DollarSign, Settings, LogOut, Scissors } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { to: "/dashboard", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/finanzas", label: "Finanzas", icon: DollarSign },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", icon: Settings },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, negocio, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2
              className="text-lg font-bold text-secondary tracking-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              TIGRE
            </h2>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {negocio?.nombre ?? "Cargando..."}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-secondary border-l-2 border-secondary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Cerrar sesión</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
