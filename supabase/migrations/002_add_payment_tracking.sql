-- TIGRE - Migración 002: Tracking de pagos
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_initial_schema.sql

-- Agregar campos de pago a turnos
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS cobrado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'mercadopago')),
  ADD COLUMN IF NOT EXISTS monto_cobrado DECIMAL(10,2);

-- Index para queries de cobros
CREATE INDEX IF NOT EXISTS idx_turnos_cobrado ON public.turnos(cobrado, fecha) WHERE cobrado = true;
