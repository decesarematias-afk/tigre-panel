-- TIGRE - Schema inicial para Cruz Barber Studio
-- Ejecutar en Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- NEGOCIOS
-- ============================================
CREATE TABLE public.negocios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver negocio propio" ON public.negocios
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Insertar negocio propio" ON public.negocios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Actualizar negocio propio" ON public.negocios
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- SERVICIOS
-- ============================================
CREATE TABLE public.servicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_minutos INTEGER NOT NULL DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver servicios del negocio" ON public.servicios
  FOR SELECT TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Insertar servicios" ON public.servicios
  FOR INSERT TO authenticated
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Actualizar servicios" ON public.servicios
  FOR UPDATE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Eliminar servicios" ON public.servicios
  FOR DELETE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  ultima_visita TIMESTAMPTZ
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver clientes del negocio" ON public.clientes
  FOR SELECT TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Insertar clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Actualizar clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Eliminar clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

-- ============================================
-- TURNOS
-- ============================================
CREATE TABLE public.turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  servicio_id UUID REFERENCES public.servicios(id) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmado', 'completado', 'cancelado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver turnos del negocio" ON public.turnos
  FOR SELECT TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Insertar turnos" ON public.turnos
  FOR INSERT TO authenticated
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Actualizar turnos" ON public.turnos
  FOR UPDATE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Eliminar turnos" ON public.turnos
  FOR DELETE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

-- Trigger: prevenir solapamiento de turnos
CREATE OR REPLACE FUNCTION check_turno_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.turnos
    WHERE negocio_id = NEW.negocio_id
      AND fecha = NEW.fecha
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND estado NOT IN ('cancelado')
      AND (
        (NEW.hora_inicio >= hora_inicio AND NEW.hora_inicio < hora_fin) OR
        (NEW.hora_fin > hora_inicio AND NEW.hora_fin <= hora_fin) OR
        (NEW.hora_inicio <= hora_inicio AND NEW.hora_fin >= hora_fin)
      )
  ) THEN
    RAISE EXCEPTION 'Ya existe un turno en ese horario';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_turno_overlap
  BEFORE INSERT OR UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION check_turno_overlap();

-- Trigger: actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- HORARIOS DE ATENCION
-- ============================================
CREATE TABLE public.horarios_atencion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_apertura_manana TIME,
  hora_cierre_manana TIME,
  hora_apertura_tarde TIME,
  hora_cierre_tarde TIME,
  cerrado BOOLEAN DEFAULT false,
  UNIQUE(negocio_id, dia_semana)
);

ALTER TABLE public.horarios_atencion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver horarios del negocio" ON public.horarios_atencion
  FOR SELECT TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Insertar horarios" ON public.horarios_atencion
  FOR INSERT TO authenticated
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Actualizar horarios" ON public.horarios_atencion
  FOR UPDATE TO authenticated
  USING (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (negocio_id IN (SELECT id FROM public.negocios WHERE user_id = (SELECT auth.uid())));

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX idx_turnos_negocio_fecha ON public.turnos(negocio_id, fecha);
CREATE INDEX idx_turnos_cliente ON public.turnos(cliente_id);
CREATE INDEX idx_clientes_negocio ON public.clientes(negocio_id);
CREATE INDEX idx_servicios_negocio ON public.servicios(negocio_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.turnos;
