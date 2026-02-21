import { createBrowserRouter, RouterProvider, Navigate } from "react-router"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { Layout } from "@/components/layout/Layout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Clientes } from "@/pages/Clientes"
import { Reportes } from "@/pages/Reportes"
import { WhatsApp } from "@/pages/WhatsApp"
import { Finanzas } from "@/pages/Finanzas"
import { Configuracion } from "@/pages/Configuracion"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "clientes", element: <Clientes /> },
      { path: "whatsapp", element: <WhatsApp /> },
      { path: "finanzas", element: <Finanzas /> },
      { path: "reportes", element: <Reportes /> },
      { path: "configuracion", element: <Configuracion /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </AuthProvider>
  )
}
