-- Esquema para Supabase - Dashboard Comercial Pachamama

-- 1. Tabla asesores
CREATE TABLE IF NOT EXISTS asesores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar los 7 registros exactos
INSERT INTO asesores (nombre) VALUES
  ('Adrian Emir Flores Cossio'),
  ('Brunella Sanchez Velasco'),
  ('Segundo Adelmo Gutierrez Barrios'),
  ('Andrea Antuane Valerio Moreno'),
  ('Fátima Lucia Abad Rios'),
  ('Jhon Bryan Pullo Perales'),
  ('Vanessa Albornoz Moncada')
ON CONFLICT DO NOTHING;

-- 2. Tabla gestiones_diarias
CREATE TABLE IF NOT EXISTS gestiones_diarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asesor_id UUID REFERENCES asesores(id) ON DELETE CASCADE,
  cant_leads_gestionados INTEGER DEFAULT 0,
  acciones_efectivas INTEGER DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(asesor_id, fecha)
);

-- 3. Tabla citas
CREATE TABLE IF NOT EXISTS citas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asesor_id UUID REFERENCES asesores(id) ON DELETE CASCADE,
  cliente_nombre VARCHAR(255),
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_cita VARCHAR(100),
  nivel_interes VARCHAR(50),
  estado VARCHAR(50) DEFAULT 'Pendiente',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asesor_id UUID REFERENCES asesores(id) ON DELETE CASCADE,
  cliente_nombre VARCHAR(255),
  monto DECIMAL(12, 2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Emitida',
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla ventas
CREATE TABLE IF NOT EXISTS ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asesor_id UUID REFERENCES asesores(id) ON DELETE CASCADE,
  cliente_nombre VARCHAR(255),
  monto DECIMAL(12, 2) DEFAULT 0,
  proyecto VARCHAR(255),
  fecha_venta TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) - opcional según el enfoque
ALTER TABLE asesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestiones_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para un MVP (Considerar ajustar esto para producción)
CREATE POLICY "Permitir todo acceso a asesores" ON asesores FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a gestiones_diarias" ON gestiones_diarias FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a citas" ON citas FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a cotizaciones" ON cotizaciones FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a ventas" ON ventas FOR ALL USING (true);
