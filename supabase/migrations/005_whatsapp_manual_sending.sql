-- =============================================
-- 005: WhatsApp Manual Sending via Supabase Realtime
-- Permite al frontend insertar mensajes salientes
-- El bot los detecta via Realtime y envía por WAHA
-- =============================================

-- 1. Policy de INSERT en whatsapp_mensajes para authenticated users
CREATE POLICY "Insertar mensajes salientes" ON public.whatsapp_mensajes
  FOR INSERT TO authenticated
  WITH CHECK (
    negocio_id IN (
      SELECT id FROM public.negocios
      WHERE user_id = (SELECT auth.uid())
    )
    AND es_entrante = false
  );

-- 2. Policy de UPDATE en whatsapp_mensajes (para marcar como enviado)
CREATE POLICY "Actualizar mensajes del negocio" ON public.whatsapp_mensajes
  FOR UPDATE TO authenticated
  USING (
    negocio_id IN (
      SELECT id FROM public.negocios
      WHERE user_id = (SELECT auth.uid())
    )
  );
