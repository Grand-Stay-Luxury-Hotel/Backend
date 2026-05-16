-- Grand-Stay Seed Data for Manual Testing
-- Run after init.sql

USE grandstay_db;

-- Roles
INSERT INTO roles (nombre) VALUES
    ('Administrador'),
    ('Recepcionista'),
    ('PersonalLimpieza'),
    ('Huesped');

-- Usuarios (password: "Password123!" hashed with bcrypt cost 12)
-- Hash generado: $2a$12$LJ3m4ys3Lk7M9gZVqK8F.eOqX5vN2wR8tY6uI0pA3sD7fG1hJ4kLm
INSERT INTO usuarios (email, password_hash, id_rol, activo, nombre, apellido) VALUES
    ('admin@grandstay.com', '$2a$12$Wqv2CEeoVNppWNKRO8EX/eCOM1BgSE.VUGBIL8qkJu1A4IfxOpIv.', 1, TRUE, 'Carlos', 'Admin'),
    ('recepcion@grandstay.com', '$2a$12$Wqv2CEeoVNppWNKRO8EX/eCOM1BgSE.VUGBIL8qkJu1A4IfxOpIv.', 2, TRUE, 'Maria', 'Recepcion'),
    ('limpieza@grandstay.com', '$2a$12$Wqv2CEeoVNppWNKRO8EX/eCOM1BgSE.VUGBIL8qkJu1A4IfxOpIv.', 3, TRUE, 'Jose', 'Limpieza'),
    ('huesped1@grandstay.com', '$2a$12$Wqv2CEeoVNppWNKRO8EX/eCOM1BgSE.VUGBIL8qkJu1A4IfxOpIv.', 4, TRUE, 'Ana', 'Garcia'),
    ('huesped2@grandstay.com', '$2a$12$Wqv2CEeoVNppWNKRO8EX/eCOM1BgSE.VUGBIL8qkJu1A4IfxOpIv.', 4, TRUE, 'Luis', 'Martinez');

-- Recepcionistas
INSERT INTO recepcionistas (id_usuario) VALUES (2);

-- Personal de Limpieza
INSERT INTO personal_limpieza (id_usuario) VALUES (3);

-- Administradores
INSERT INTO administradores (id_usuario, otp_actual) VALUES (1, '123456');

-- Huespedes
INSERT INTO huespedes (id_usuario, nombres, apellidos, email, num_documento, telefono) VALUES
    (4, 'Ana', 'Garcia', 'ana.garcia@email.com', '1234567890', '+57 300 123 4567'),
    (5, 'Luis', 'Martinez', 'luis.martinez@email.com', '0987654321', '+57 310 987 6543');

-- Tipos de Habitacion
INSERT INTO tipos_habitacion (nombre, descripcion, capacidad, camas, activo) VALUES
    ('Individual', 'Habitacion individual con cama sencilla', 1, '1 Cama Sencilla', TRUE),
    ('Doble', 'Habitacion doble con cama matrimonial', 2, '1 Cama Matrimonial', TRUE),
    ('Suite', 'Suite premium con vista a la ciudad', 3, '1 Cama King + 1 Sillon Cama', TRUE),
    ('Familiar', 'Habitacion familiar amplia', 4, '2 Camas Dobles', TRUE);

-- Habitaciones
INSERT INTO habitaciones (id_tipo, numero, piso, estado, activo) VALUES
    (1, '101', 1, 'disponible', TRUE),
    (1, '102', 1, 'disponible', TRUE),
    (2, '201', 2, 'disponible', TRUE),
    (2, '202', 2, 'disponible', TRUE),
    (2, '203', 2, 'disponible', TRUE),
    (3, '301', 3, 'disponible', TRUE),
    (3, '302', 3, 'disponible', TRUE),
    (4, '401', 4, 'disponible', TRUE),
    (4, '402', 4, 'disponible', TRUE),
    (1, '103', 1, 'mantenimiento', FALSE);

-- Tarifas
INSERT INTO tarifas (id_tipo, precio_noche, fecha_inicio, fecha_fin, activa) VALUES
    (1, 80.00, '2025-01-01', '2025-12-31', TRUE),
    (2, 120.00, '2025-01-01', '2025-12-31', TRUE),
    (3, 250.00, '2025-01-01', '2025-12-31', TRUE),
    (4, 180.00, '2025-01-01', '2025-12-31', TRUE);

-- Servicios Adicionales
INSERT INTO servicios_adicionales (nombre, categoria, precio, activo, disponible) VALUES
    ('Desayuno Buffet', 'restaurante', 25.00, TRUE, TRUE),
    ('Almuerzo Especial', 'restaurante', 35.00, TRUE, TRUE),
    ('Cena Gourmet', 'restaurante', 45.00, TRUE, TRUE),
    ('Lavado de Ropa', 'lavanderia', 15.00, TRUE, TRUE),
    ('Planchado', 'lavanderia', 10.00, TRUE, TRUE),
    ('Masaje Relajante 60min', 'spa', 60.00, TRUE, TRUE),
    ('Masaje Terapeutico 90min', 'spa', 85.00, TRUE, TRUE),
    ('Facial Premium', 'spa', 50.00, TRUE, TRUE);

-- Insumos de Limpieza
INSERT INTO insumos_limpieza (nombre, categoria, unidad_medida, stock_actual, stock_minimo, faltante) VALUES
    ('Shampoo', 'amenidades', 'unidad', 150, 30, 0),
    ('Jabon Corporal', 'amenidades', 'unidad', 120, 25, 0),
    ('Toallas de Mano', 'textiles', 'unidad', 80, 20, 0),
    ('Sabanas King', 'textiles', 'unidad', 40, 10, 0),
    ('Detergente Industrial', 'quimicos', 'litro', 50, 15, 0),
    ('Desinfectante', 'quimicos', 'litro', 35, 10, 0),
    ('Papel Higiene', 'amenidades', 'rollo', 200, 50, 0),
    ('Acondicionador', 'amenidades', 'unidad', 100, 25, 0);

-- Reservas de ejemplo
INSERT INTO reservas (codigo_confirmacion, id_huesped, id_recepcionista, id_tipo_habitacion, id_habitacion, fecha_entrada, fecha_salida, estado, canal_reserva, monto_pagado, observaciones) VALUES
    ('GS0000000001', 1, 1, 2, 3, '2025-06-01', '2025-06-05', 'confirmada', 'presencial', 480.00, 'Reserva para pruebas'),
    ('GS0000000002', 2, NULL, 3, 6, '2025-06-10', '2025-06-15', 'confirmada', 'web', 1250.00, 'Huesped frecuente'),
    ('GS0000000003', 1, 1, 1, 1, '2025-05-20', '2025-05-23', 'completada', 'presencial', 240.00, 'Reserva completada');

-- Tokens de Pago
INSERT INTO tokens_pago (id_reserva, token, proveedor, monto_autorizado, referencia_ext, vigente) VALUES
    (1, 'tok_test_001', 'mock', 480.00, 'ref_001', TRUE),
    (2, 'tok_test_002', 'mock', 1250.00, 'ref_002', TRUE),
    (3, 'tok_test_003', 'mock', 240.00, 'ref_003', FALSE);

-- Check-in de ejemplo
INSERT INTO checkin (id_reserva, id_recepcionista, id_habitacion, codigo_acceso, documento_verificado, observaciones) VALUES
    (1, 1, 3, 'GS-1234', TRUE, 'Check-in de prueba');

-- Habitaciones actualizadas a ocupada (reservas activas)
UPDATE habitaciones SET estado = 'ocupada' WHERE id_habitacion IN (3, 6);
