-- =============================================
-- 003: Integración WhatsApp
-- Tabla de mensajes + columna origen en turnos
-- =============================================

-- 1. Agregar columna origen a turnos
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual'
    CHECK (origen IN ('manual', 'whatsapp'));

-- 2. Crear tabla de mensajes de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  chat_id TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  es_entrante BOOLEAN NOT NULL DEFAULT true,
  mensaje_tipo TEXT DEFAULT 'text',
  wa_message_id TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_chat
  ON public.whatsapp_mensajes(negocio_id, chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_cliente
  ON public.whatsapp_mensajes(cliente_id)
  WHERE cliente_id IS NOT NULL;

-- 4. RLS
ALTER TABLE public.whatsapp_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver mensajes del negocio" ON public.whatsapp_mensajes
  FOR SELECT TO authenticated
  USING (
    negocio_id IN (
      SELECT id FROM public.negocios
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- El bot usa service_role key (bypasea RLS) para INSERT
-- No se necesita policy de INSERT para authenticated

-- 5. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensajes;
