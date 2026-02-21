-- Tabla de movimientos financieros (ingresos y egresos)
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria TEXT NOT NULL CHECK (categoria IN ('turno', 'producto', 'alquiler', 'servicios', 'insumos', 'impuestos', 'sueldo', 'otro')),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_movimientos_negocio_fecha ON movimientos(negocio_id, fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos(negocio_id, tipo);

-- RLS
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven movimientos de su negocio"
  ON movimientos FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()))
  WITH CHECK (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
