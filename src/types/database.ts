export type EstadoTurno = "pendiente" | "confirmado" | "completado" | "cancelado"
export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "mercadopago"
export type OrigenTurno = "manual" | "whatsapp"

export interface Negocio {
  id: string
  user_id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  created_at: string
}

export interface Servicio {
  id: string
  negocio_id: string
  nombre: string
  precio: number
  duracion_minutos: number
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  negocio_id: string
  nombre: string
  telefono: string | null
  email: string | null
  notas: string | null
  created_at: string
  ultima_visita: string | null
}

export interface Turno {
  id: string
  negocio_id: string
  cliente_id: string
  servicio_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: EstadoTurno
  notas: string | null
  cobrado: boolean
  metodo_pago: MetodoPago | null
  monto_cobrado: number | null
  origen: OrigenTurno
  created_at: string
  updated_at: string
  cliente?: Cliente
  servicio?: Servicio
}

export interface WhatsAppMensaje {
  id: string
  negocio_id: string
  chat_id: string
  mensaje: string
  es_entrante: boolean
  mensaje_tipo: string
  wa_message_id: string | null
  cliente_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  cliente?: Cliente
}

export interface WhatsAppConversacion {
  chat_id: string
  cliente_id: string | null
  cliente_nombre: string | null
  ultimo_mensaje: string
  ultimo_mensaje_fecha: string
  total_mensajes: number
}

export type ChatMode = "bot" | "manual"

export interface WhatsAppChatConfig {
  chat_id: string
  negocio_id: string
  modo: ChatMode
  updated_at: string
}

export interface HorarioAtencion {
  id: string
  negocio_id: string
  dia_semana: number
  hora_apertura_manana: string | null
  hora_cierre_manana: string | null
  hora_apertura_tarde: string | null
  hora_cierre_tarde: string | null
  cerrado: boolean
}

export interface Database {
  public: {
    Tables: {
      negocios: {
        Row: Negocio
        Insert: Omit<Negocio, "id" | "created_at">
        Update: Partial<Omit<Negocio, "id" | "created_at">>
      }
      servicios: {
        Row: Servicio
        Insert: Omit<Servicio, "id" | "created_at">
        Update: Partial<Omit<Servicio, "id" | "created_at">>
      }
      clientes: {
        Row: Cliente
        Insert: Omit<Cliente, "id" | "created_at">
        Update: Partial<Omit<Cliente, "id" | "created_at">>
      }
      turnos: {
        Row: Turno
        Insert: Omit<Turno, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Turno, "id" | "created_at">>
      }
      horarios_atencion: {
        Row: HorarioAtencion
        Insert: Omit<HorarioAtencion, "id">
        Update: Partial<Omit<HorarioAtencion, "id">>
      }
    }
  }
}
