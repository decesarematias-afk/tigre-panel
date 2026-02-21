-- =============================================
-- 004: Modo Manual de Chat WhatsApp
-- Config por conversación: bot vs manual
-- =============================================

-- 1. Tabla de configuración por chat
CREATE TABLE IF NOT EXISTS public.whatsapp_chat_config (
  chat_id TEXT NOT NULL,
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  modo TEXT DEFAULT 'bot' CHECK (modo IN ('bot', 'manual')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (chat_id, negocio_id)
);

-- 2. RLS
ALTER TABLE public.whatsapp_chat_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver config del negocio" ON public.whatsapp_chat_config
  FOR SELECT TO authenticated
  USING (
    negocio_id IN (
      SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Gestionar config del negocio" ON public.whatsapp_chat_config
  FOR ALL TO authenticated
  USING (
    negocio_id IN (
      SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())
    )
  );

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chat_config;
