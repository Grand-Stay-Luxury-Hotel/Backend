-- Persistencia del modulo de integrantes GrandStay.
-- Ejecutar sobre la base grandstay_db.

USE grandstay_db;

CREATE TABLE IF NOT EXISTS integrantes_equipo (
  id_integrante INT AUTO_INCREMENT PRIMARY KEY,
  seudonimo VARCHAR(80) NOT NULL,
  seudonimo_normalizado VARCHAR(80) NOT NULL,
  nombre_completo VARCHAR(120) NOT NULL,
  nombre_normalizado VARCHAR(120) NOT NULL,
  grupo ENUM('backend', 'frontend') NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_integrantes_seudonimo (seudonimo_normalizado),
  UNIQUE KEY uk_integrantes_nombre (nombre_normalizado),
  INDEX idx_integrantes_grupo_activo (grupo, activo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS integrantes_codigos_registro (
  id_codigo INT AUTO_INCREMENT PRIMARY KEY,
  codigo_hash CHAR(64) NOT NULL,
  generado_por BIGINT UNSIGNED,
  usado_por INT,
  usado BOOLEAN DEFAULT FALSE,
  usado_en TIMESTAMP NULL,
  expira_en TIMESTAMP NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_codigos_registro_hash (codigo_hash),
  INDEX idx_codigos_registro_estado (usado, expira_en),
  CONSTRAINT fk_codigos_registro_usado_por FOREIGN KEY (usado_por) REFERENCES integrantes_equipo(id_integrante)
) ENGINE=InnoDB;

INSERT INTO integrantes_equipo
  (seudonimo, seudonimo_normalizado, nombre_completo, nombre_normalizado, grupo, activo)
VALUES
  ('Akczul', 'akczul', 'Juan Diego Delgado Espana', 'juan diego delgado espana', 'backend', TRUE),
  ('Alexsters', 'alexsters', 'Yamith Alexander Ardila Cabrera', 'yamith alexander ardila cabrera', 'backend', TRUE),
  ('JDav117', 'jdav117', 'Jhoan David Ortega Ramos', 'jhoan david ortega ramos', 'frontend', TRUE),
  ('Pan', 'pan', 'Fabian Andres Coral Garcia', 'fabian andres coral garcia', 'frontend', TRUE)
ON DUPLICATE KEY UPDATE
  seudonimo = VALUES(seudonimo),
  nombre_completo = VALUES(nombre_completo),
  grupo = VALUES(grupo),
  activo = TRUE;
