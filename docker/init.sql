-- Grand-Stay Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS grandstay_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE grandstay_db;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
) ENGINE=InnoDB;

-- Recepcionistas
CREATE TABLE IF NOT EXISTS recepcionistas (
    id_recepcionista INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Personal de Limpieza
CREATE TABLE IF NOT EXISTS personal_limpieza (
    id_personal INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Administradores
CREATE TABLE IF NOT EXISTS administradores (
    id_admin INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    otp_actual VARCHAR(10),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Huespedes
CREATE TABLE IF NOT EXISTS huespedes (
    id_huesped INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    num_documento VARCHAR(50) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Tipos de Habitacion
CREATE TABLE IF NOT EXISTS tipos_habitacion (
    id_tipo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    capacidad INT NOT NULL DEFAULT 2,
    camas VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- Habitaciones
CREATE TABLE IF NOT EXISTS habitaciones (
    id_habitacion INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo INT NOT NULL,
    numero VARCHAR(10) NOT NULL UNIQUE,
    piso INT DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'disponible',
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_tipo) REFERENCES tipos_habitacion(id_tipo)
) ENGINE=InnoDB;

-- Tarifas
CREATE TABLE IF NOT EXISTS tarifas (
    id_tarifa INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo INT NOT NULL,
    precio_noche DECIMAL(10, 2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_tipo) REFERENCES tipos_habitacion(id_tipo)
) ENGINE=InnoDB;

-- Reservas
CREATE TABLE IF NOT EXISTS reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    codigo_confirmacion VARCHAR(20) NOT NULL UNIQUE,
    id_huesped INT NOT NULL,
    id_recepcionista INT,
    id_tipo_habitacion INT NOT NULL,
    id_habitacion INT NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'confirmada',
    canal_reserva VARCHAR(20) DEFAULT 'web',
    monto_pagado DECIMAL(10, 2) DEFAULT 0,
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_huesped) REFERENCES huespedes(id_huesped),
    FOREIGN KEY (id_recepcionista) REFERENCES recepcionistas(id_recepcionista),
    FOREIGN KEY (id_tipo_habitacion) REFERENCES tipos_habitacion(id_tipo),
    FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
) ENGINE=InnoDB;

-- Tokens de Pago
CREATE TABLE IF NOT EXISTS tokens_pago (
    id_token INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    proveedor VARCHAR(50) NOT NULL,
    monto_autorizado DECIMAL(10, 2) NOT NULL,
    referencia_ext VARCHAR(100),
    vigente BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva)
) ENGINE=InnoDB;

-- Check-in
CREATE TABLE IF NOT EXISTS checkin (
    id_checkin INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    id_recepcionista INT,
    id_habitacion INT NOT NULL,
    codigo_acceso VARCHAR(20) NOT NULL,
    documento_verificado BOOLEAN DEFAULT TRUE,
    observaciones TEXT,
    fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva),
    FOREIGN KEY (id_recepcionista) REFERENCES recepcionistas(id_recepcionista),
    FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
) ENGINE=InnoDB;

-- Check-out
CREATE TABLE IF NOT EXISTS checkout (
    id_checkout INT AUTO_INCREMENT PRIMARY KEY,
    id_checkin INT NOT NULL,
    id_recepcionista INT,
    total_cobrado DECIMAL(10, 2) NOT NULL,
    estado_habitacion VARCHAR(20) DEFAULT 'bueno',
    cargos_adicionales DECIMAL(10, 2) DEFAULT 0,
    observaciones TEXT,
    fecha_salida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_checkin) REFERENCES checkin(id_checkin),
    FOREIGN KEY (id_recepcionista) REFERENCES recepcionistas(id_recepcionista)
) ENGINE=InnoDB;

-- Facturas
CREATE TABLE IF NOT EXISTS facturas (
    id_factura INT AUTO_INCREMENT PRIMARY KEY,
    id_checkin INT NOT NULL,
    id_checkout INT NOT NULL,
    numero_factura VARCHAR(50) NOT NULL UNIQUE,
    subtotal DECIMAL(10, 2) NOT NULL,
    impuestos DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'tarjeta_credito',
    estado_pago VARCHAR(20) DEFAULT 'pagada',
    email_enviado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_checkin) REFERENCES checkin(id_checkin),
    FOREIGN KEY (id_checkout) REFERENCES checkout(id_checkout)
) ENGINE=InnoDB;

-- Servicios Adicionales
CREATE TABLE IF NOT EXISTS servicios_adicionales (
    id_servicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    disponible BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- Consumo de Servicios
CREATE TABLE IF NOT EXISTS consumo_servicios (
    id_consumo INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    id_habitacion INT NOT NULL,
    id_servicio INT NOT NULL,
    cantidad INT NOT NULL,
    precio_aplicado DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'completado',
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva),
    FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion),
    FOREIGN KEY (id_servicio) REFERENCES servicios_adicionales(id_servicio)
) ENGINE=InnoDB;

-- Insumos de Limpieza
CREATE TABLE IF NOT EXISTS insumos_limpieza (
    id_insumo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    faltante INT DEFAULT 0
) ENGINE=InnoDB;

-- Consumo de Insumos
CREATE TABLE IF NOT EXISTS consumo_insumos (
    id_consumo INT AUTO_INCREMENT PRIMARY KEY,
    id_personal INT NOT NULL,
    id_insumo INT NOT NULL,
    id_habitacion INT NOT NULL,
    tipo_tarea VARCHAR(50) DEFAULT 'limpieza_rutina',
    cantidad INT NOT NULL,
    observaciones TEXT,
    fecha_consumo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_personal) REFERENCES personal_limpieza(id_personal),
    FOREIGN KEY (id_insumo) REFERENCES insumos_limpieza(id_insumo),
    FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
) ENGINE=InnoDB;

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_dest INT,
    tipo VARCHAR(50) NOT NULL,
    evento VARCHAR(50) NOT NULL,
    destinatario VARCHAR(100),
    asunto VARCHAR(255) NOT NULL,
    cuerpo TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Log de Auditoria
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
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Vista para stock critico
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
