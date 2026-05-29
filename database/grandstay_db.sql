-- database/grandstay_db.sql
-- Esquema completo de Grand-Stay para MySQL 8.0 / Aiven.
-- No incluye datos de prueba ni credenciales.

CREATE DATABASE IF NOT EXISTS grandstay_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE grandstay_db;

CREATE TABLE IF NOT EXISTS roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  id_rol INT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  ultimo_acceso TIMESTAMP NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recepcionistas (
  id_recepcionista INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  CONSTRAINT fk_recepcionistas_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS personal_limpieza (
  id_personal INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  CONSTRAINT fk_limpieza_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS especialidades_tecnicas (
  id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicio_tecnico (
  id_tecnico INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  id_especialidad INT,
  nivel_certificacion VARCHAR(50),
  turno VARCHAR(50),
  fecha_ingreso DATE,
  CONSTRAINT fk_tecnico_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_tecnico_especialidades FOREIGN KEY (id_especialidad) REFERENCES especialidades_tecnicas(id_especialidad)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS administradores (
  id_admin INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  otp_actual VARCHAR(10),
  CONSTRAINT fk_administradores_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS huespedes (
  id_huesped INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  num_documento VARCHAR(50) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_huespedes_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_habitacion (
  id_tipo INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  capacidad INT NOT NULL DEFAULT 2,
  camas VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habitaciones (
  id_habitacion INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo INT NOT NULL,
  numero VARCHAR(10) NOT NULL UNIQUE,
  piso INT DEFAULT 1,
  estado ENUM('disponible', 'ocupada', 'mantenimiento', 'limpieza', 'bloqueada') DEFAULT 'disponible',
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_habitaciones_tipos FOREIGN KEY (id_tipo) REFERENCES tipos_habitacion(id_tipo),
  INDEX idx_habitaciones_estado_activo (estado, activo),
  INDEX idx_habitaciones_tipo (id_tipo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tarifas (
  id_tarifa INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo INT NOT NULL,
  nombre VARCHAR(120) NOT NULL DEFAULT 'Tarifa general',
  temporada ENUM('alta', 'media', 'baja') DEFAULT 'media',
  precio_noche DECIMAL(10, 2) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  activa BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tarifas_tipos FOREIGN KEY (id_tipo) REFERENCES tipos_habitacion(id_tipo),
  INDEX idx_tarifas_tipo_vigencia (id_tipo, activa, fecha_inicio, fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservas (
  id_reserva INT AUTO_INCREMENT PRIMARY KEY,
  codigo_confirmacion VARCHAR(20) NOT NULL UNIQUE,
  id_huesped INT NOT NULL,
  id_recepcionista INT,
  id_tipo_habitacion INT NOT NULL,
  id_habitacion INT NOT NULL,
  fecha_entrada DATE NOT NULL,
  fecha_salida DATE NOT NULL,
  estado ENUM('pendiente', 'confirmada', 'en_curso', 'cancelada', 'no_show', 'completada') DEFAULT 'confirmada',
  canal_reserva VARCHAR(20) DEFAULT 'web',
  monto_pagado DECIMAL(10, 2) DEFAULT 0,
  observaciones TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservas_huespedes FOREIGN KEY (id_huesped) REFERENCES huespedes(id_huesped),
  CONSTRAINT fk_reservas_recepcionistas FOREIGN KEY (id_recepcionista) REFERENCES recepcionistas(id_recepcionista),
  CONSTRAINT fk_reservas_tipos FOREIGN KEY (id_tipo_habitacion) REFERENCES tipos_habitacion(id_tipo),
  CONSTRAINT fk_reservas_habitaciones FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion),
  INDEX idx_reservas_habitacion_fechas (id_habitacion, fecha_entrada, fecha_salida, estado),
  INDEX idx_reservas_huesped (id_huesped)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tokens_pago (
  id_token INT AUTO_INCREMENT PRIMARY KEY,
  id_reserva INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  proveedor VARCHAR(50) NOT NULL,
  monto_autorizado DECIMAL(10, 2) NOT NULL,
  referencia_ext VARCHAR(100),
  vigente BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_reservas FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva),
  INDEX idx_tokens_reserva_vigente (id_reserva, vigente)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS checkin (
  id_checkin INT AUTO_INCREMENT PRIMARY KEY,
  id_reserva INT NOT NULL,
  id_recepcionista INT,
  id_habitacion INT NOT NULL,
  codigo_acceso VARCHAR(20) NOT NULL,
  documento_verificado BOOLEAN DEFAULT TRUE,
  observaciones TEXT,
  fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checkin_reservas FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva),
  CONSTRAINT fk_checkin_recepcionistas FOREIGN KEY (id_recepcionista) REFERENCES recepcionistas(id_recepcionista),
  CONSTRAINT fk_checkin_habitaciones FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion),
  UNIQUE KEY uk_checkin_reserva (id_reserva)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS checkout (
  id_checkout INT AUTO_INCREMENT PRIMARY KEY,
  id_checkin INT NOT NULL,
  id_recepcionista INT,
  total_cobrado DECIMAL(10, 2) NOT NULL,
  estado_habitacion ENUM('bueno', 'danos_menores', 'danos_graves', 'pendiente_revision') DEFAULT 'pendiente_revision',
  cargos_adicionales DECIMAL(10, 2) DEFAULT 0,
  observaciones TEXT,
  fecha_salida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checkout_checkin FOREIGN KEY (id_checkin) REFERENCES checkin(id_checkin),
  CONSTRAINT fk_checkout_recepcionistas FOREIGN KEY (id_recepcionista) REFERENCES recepcionistas(id_recepcionista),
  UNIQUE KEY uk_checkout_checkin (id_checkin)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facturas (
  id_factura INT AUTO_INCREMENT PRIMARY KEY,
  id_checkin INT NOT NULL,
  id_checkout INT,
  numero_factura VARCHAR(50) NOT NULL UNIQUE,
  fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(10, 2) NOT NULL,
  impuesto_pct DECIMAL(5, 2) DEFAULT 19.00,
  impuestos DECIMAL(10, 2) NOT NULL,
  descuentos DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  metodo_pago VARCHAR(50) DEFAULT 'tarjeta_credito',
  moneda CHAR(3) DEFAULT 'COP',
  estado_pago VARCHAR(20) DEFAULT 'pagada',
  email_enviado BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_facturas_checkin FOREIGN KEY (id_checkin) REFERENCES checkin(id_checkin),
  CONSTRAINT fk_facturas_checkout FOREIGN KEY (id_checkout) REFERENCES checkout(id_checkout),
  INDEX idx_facturas_fecha (fecha_emision)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS items_factura (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  id_factura INT NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  fecha DATE DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_items_factura FOREIGN KEY (id_factura) REFERENCES facturas(id_factura),
  INDEX idx_items_factura_categoria (id_factura, categoria)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicios_adicionales (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  disponible BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_servicios_categoria (categoria, activo, disponible)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consumo_servicios (
  id_consumo INT AUTO_INCREMENT PRIMARY KEY,
  id_reserva INT NOT NULL,
  id_habitacion INT NOT NULL,
  id_servicio INT NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  precio_aplicado DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'completado',
  id_factura INT,
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consumos_reservas FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva),
  CONSTRAINT fk_consumos_habitaciones FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion),
  CONSTRAINT fk_consumos_servicios FOREIGN KEY (id_servicio) REFERENCES servicios_adicionales(id_servicio),
  CONSTRAINT fk_consumos_facturas FOREIGN KEY (id_factura) REFERENCES facturas(id_factura),
  INDEX idx_consumos_reserva_estado (id_reserva, estado),
  INDEX idx_consumos_fecha (fecha)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS insumos_limpieza (
  id_insumo INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  stock_actual DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(10, 2) NOT NULL DEFAULT 5,
  faltante DECIMAL(10, 2) DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_insumos_stock (stock_actual, stock_minimo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consumo_insumos (
  id_consumo INT AUTO_INCREMENT PRIMARY KEY,
  id_personal INT NOT NULL,
  id_insumo INT NOT NULL,
  id_habitacion INT NOT NULL,
  tipo_tarea VARCHAR(50) DEFAULT 'limpieza_rutina',
  cantidad DECIMAL(10, 2) NOT NULL,
  observaciones TEXT,
  fecha_consumo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consumo_insumos_personal FOREIGN KEY (id_personal) REFERENCES personal_limpieza(id_personal),
  CONSTRAINT fk_consumo_insumos_insumos FOREIGN KEY (id_insumo) REFERENCES insumos_limpieza(id_insumo),
  CONSTRAINT fk_consumo_insumos_habitaciones FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario_dest INT,
  id_reserva INT,
  id_huesped INT,
  tipo VARCHAR(50) NOT NULL,
  evento VARCHAR(50) NOT NULL,
  destinatario VARCHAR(100),
  asunto VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  fecha_envio TIMESTAMP NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notificaciones_evento_estado (evento, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log_auditoria (
  id_log INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT,
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(100) NOT NULL,
  id_registro INT,
  valor_anterior JSON,
  valor_nuevo JSON,
  ip VARCHAR(45),
  user_agent TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_auditoria_tabla_registro (tabla_afectada, id_registro),
  INDEX idx_auditoria_usuario_fecha (id_usuario, creado_en)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reportes (
  id_reporte INT AUTO_INCREMENT PRIMARY KEY,
  generado_por INT,
  tipo_reporte VARCHAR(50) NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  periodo_inicio DATE,
  periodo_fin DATE,
  formato VARCHAR(20) DEFAULT 'JSON',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reportes_usuarios FOREIGN KEY (generado_por) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW v_stock_critico AS
SELECT
  id_insumo,
  nombre,
  categoria,
  unidad_medida,
  stock_actual,
  stock_minimo,
  (stock_minimo - stock_actual) AS faltante
FROM insumos_limpieza
WHERE stock_actual <= stock_minimo;
