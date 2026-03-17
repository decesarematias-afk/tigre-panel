-- =============================================
-- 007: Configuración de dueño en tabla negocios
-- Permite guardar teléfono y clave de acceso del dueño
-- para que el bot lo reconozca por WhatsApp
-- =============================================

ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_access_key TEXT;
