-- SEED DATA para Cruz Barber Studio
-- ============================================
-- INSTRUCCIONES:
-- 1. Primero creá un usuario en Supabase Auth (email: decesarematias@gmail.com)
-- 2. Copiá el UUID del usuario creado
-- 3. Reemplazá '95e92951-b532-4031-83f1-137161194aaf' con ese UUID
-- 4. Ejecutá este SQL en el SQL Editor de Supabase
-- ============================================

-- Crear negocio
INSERT INTO public.negocios (user_id, nombre, direccion, telefono, email) VALUES
('95e92951-b532-4031-83f1-137161194aaf', 'Cruz Barber Studio', 'Tucumán 2945, Lanús Este, Buenos Aires', '+5491165839170', 'decesarematias@gmail.com');

-- Obtener el ID del negocio recién creado
-- (usamos una variable para el resto de los inserts)
DO $$
DECLARE
  v_negocio_id UUID;
BEGIN
  SELECT id INTO v_negocio_id FROM public.negocios WHERE email = 'decesarematias@gmail.com' LIMIT 1;

  -- Servicios
  INSERT INTO public.servicios (negocio_id, nombre, precio, duracion_minutos, activo) VALUES
  (v_negocio_id, 'Corte', 14000, 30, true),
  (v_negocio_id, 'Corte + barba', 16000, 45, true),
  (v_negocio_id, 'Barba', 8000, 20, true),
  (v_negocio_id, 'Jubilados', 8000, 30, true),
  (v_negocio_id, 'Lunes especial', 20000, 30, true);

  -- Horarios de atención (0=domingo ... 6=sábado)
  INSERT INTO public.horarios_atencion (negocio_id, dia_semana, hora_apertura_manana, hora_cierre_manana, hora_apertura_tarde, hora_cierre_tarde, cerrado) VALUES
  (v_negocio_id, 0, NULL, NULL, NULL, NULL, true),          -- Domingo cerrado
  (v_negocio_id, 1, NULL, NULL, NULL, NULL, true),          -- Lunes cerrado
  (v_negocio_id, 2, '10:00', '13:00', '16:00', '20:00', false), -- Martes
  (v_negocio_id, 3, '10:00', '13:00', '16:00', '20:00', false), -- Miércoles
  (v_negocio_id, 4, '10:00', '13:00', '16:00', '20:00', false), -- Jueves
  (v_negocio_id, 5, '10:00', '13:00', '16:00', '20:00', false), -- Viernes
  (v_negocio_id, 6, '10:00', '13:00', '16:00', '20:00', false); -- Sábado

  -- Clientes de ejemplo
  INSERT INTO public.clientes (negocio_id, nombre, telefono) VALUES
  (v_negocio_id, 'Carlos Pérez', '+5491112345678'),
  (v_negocio_id, 'Martín González', '+5491187654321'),
  (v_negocio_id, 'Diego López', '+5491155667788');
END $$;
