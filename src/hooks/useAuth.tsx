import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import type { Negocio } from "@/types/database"

interface AuthContextType {
  user: User | null
  session: Session | null
  negocio: Negocio | null
  loading: boolean
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateNegocio: (updates: Partial<Pick<Negocio, "nombre" | "direccion" | "telefono" | "email" | "waha_url" | "waha_api_key">>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchNegocio(userId: string) {
    const { data, error } = await supabase
      .from("negocios")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error al cargar negocio:", error.message, "| userId:", userId)
    }
    if (data) setNegocio(data as Negocio)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchNegocio(s.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchNegocio(s.user.id)
      } else {
        setNegocio(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const updateNegocio = async (
    updates: Partial<Pick<Negocio, "nombre" | "direccion" | "telefono" | "email" | "waha_url" | "waha_api_key">>
  ) => {
    if (!negocio) return { error: new Error("Sin negocio") }
    const { data, error } = await supabase
      .from("negocios")
      .update(updates)
      .eq("id", negocio.id)
      .select()
      .single()
    if (data) setNegocio(data as Negocio)
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setNegocio(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, session, negocio, loading, signIn, signOut, updateNegocio }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
