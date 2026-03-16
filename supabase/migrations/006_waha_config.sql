-- =============================================
-- 006: Configuración de WAHA en tabla negocios
-- Permite guardar URL y API key de WAHA por negocio
-- =============================================

ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS waha_url TEXT,
  ADD COLUMN IF NOT EXISTS waha_api_key TEXT;
