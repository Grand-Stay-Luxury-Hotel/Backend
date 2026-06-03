-- Normalizacion de categorias ambientales para la BD actual de Green Alert.
-- La tabla reportes usa tipo_contaminacion como ENUM; este script migra valores
-- antiguos al catalogo canonico sin perder reportes existentes.

CREATE TABLE IF NOT EXISTS categorias_ambientales (
  codigo VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  activa BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

INSERT INTO categorias_ambientales (codigo, nombre, activa) VALUES
  ('basura', 'Basura', TRUE),
  ('contaminacion_hidrica', 'Contaminacion hidrica', TRUE),
  ('deforestacion', 'Deforestacion', TRUE),
  ('vertidos_ilegales', 'Vertidos ilegales', TRUE),
  ('humo_quemas', 'Humo y quemas', TRUE),
  ('contaminacion_aire', 'Contaminacion del aire', TRUE),
  ('mineria_ilegal', 'Mineria ilegal', TRUE),
  ('fauna_flora', 'Fauna y flora', TRUE),
  ('otro', 'Otro', TRUE)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  activa = VALUES(activa);

-- Paso 1: permitir temporalmente valores antiguos y canonicos.
ALTER TABLE reportes
  MODIFY tipo_contaminacion ENUM(
    'agua',
    'aire',
    'suelo',
    'ruido',
    'residuos',
    'luminica',
    'incendios_forestales',
    'deslizamientos',
    'avalanchas_fluviotorrenciales',
    'basura',
    'contaminacion_hidrica',
    'deforestacion',
    'vertidos_ilegales',
    'humo_quemas',
    'contaminacion_aire',
    'mineria_ilegal',
    'fauna_flora',
    'otro'
  ) NOT NULL;

-- Paso 2: migrar los datos actuales al catalogo Green Alert.
UPDATE reportes
SET tipo_contaminacion = CASE tipo_contaminacion
  WHEN 'agua' THEN 'contaminacion_hidrica'
  WHEN 'aire' THEN 'contaminacion_aire'
  WHEN 'residuos' THEN 'basura'
  WHEN 'incendios_forestales' THEN 'humo_quemas'
  WHEN 'suelo' THEN 'otro'
  WHEN 'ruido' THEN 'otro'
  WHEN 'luminica' THEN 'otro'
  WHEN 'deslizamientos' THEN 'otro'
  WHEN 'avalanchas_fluviotorrenciales' THEN 'otro'
  ELSE tipo_contaminacion
END;

-- Paso 3: restringir nuevas escrituras exclusivamente al catalogo canonico.
ALTER TABLE reportes
  MODIFY tipo_contaminacion ENUM(
    'basura',
    'contaminacion_hidrica',
    'deforestacion',
    'vertidos_ilegales',
    'humo_quemas',
    'contaminacion_aire',
    'mineria_ilegal',
    'fauna_flora',
    'otro'
  ) NOT NULL;
