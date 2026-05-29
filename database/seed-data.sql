-- database/seed-data.sql
-- Datos de prueba compatibles con database/grandstay_db.sql.
-- Ejecutar despues del esquema. No contiene credenciales en texto plano.

USE grandstay_db;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE log_auditoria;
TRUNCATE TABLE reportes;
TRUNCATE TABLE notificaciones;
TRUNCATE TABLE consumo_insumos;
TRUNCATE TABLE insumos_limpieza;
TRUNCATE TABLE consumo_servicios;
TRUNCATE TABLE servicios_adicionales;
TRUNCATE TABLE items_factura;
TRUNCATE TABLE facturas;
TRUNCATE TABLE checkout;
TRUNCATE TABLE checkin;
TRUNCATE TABLE tokens_pago;
TRUNCATE TABLE reservas;
TRUNCATE TABLE tarifas;
TRUNCATE TABLE habitaciones;
TRUNCATE TABLE tipos_habitacion;
TRUNCATE TABLE huespedes;
TRUNCATE TABLE administradores;
TRUNCATE TABLE servicio_tecnico;
TRUNCATE TABLE especialidades_tecnicas;
TRUNCATE TABLE personal_limpieza;
TRUNCATE TABLE recepcionistas;
TRUNCATE TABLE usuarios;
TRUNCATE TABLE roles;

INSERT INTO roles (id_rol, nombre) VALUES
  (1, 'Administrador'),
  (2, 'Recepcionista'),
  (3, 'PersonalLimpieza'),
  (4, 'ServicioTecnico'),
  (5, 'Huesped');

INSERT INTO usuarios
  (id_usuario, email, password_hash, id_rol, activo, nombre, apellido, ultimo_acceso)
VALUES
  (1, 'admin@grandstay.com',     '$2a$12$0i6Vdq4KxddBPRPuTApfjOe8e7Rh5nVHjOaBFYlSE3dskQiTvXn.m', 1, TRUE, 'Carlos',  'Mendoza',  NOW()),
  (2, 'recep1@grandstay.com',    '$2a$12$eF67Vfs7I/8DlMorTcgqd.LBwmRbgWtMXnmCCeFwHI/RFVWMS9eji', 2, TRUE, 'Laura',   'Gomez',    NOW()),
  (3, 'recep2@grandstay.com',    '$2a$12$eF67Vfs7I/8DlMorTcgqd.LBwmRbgWtMXnmCCeFwHI/RFVWMS9eji', 2, TRUE, 'Andres',  'Rios',     NOW()),
  (4, 'limpieza1@grandstay.com', '$2a$12$oiDY4aFhDrz0w2hh5KgmLOiclOtF8AP9RQ8c/N0WXtGSc.5PN4K22', 3, TRUE, 'Maria',   'Castillo', NULL),
  (5, 'tecnico1@grandstay.com',  '$2a$12$nQpphqjhx84qF/9ZtLxVmuPy341Bg2cPpWJ5NwRcTGv2eoCmClMTK', 4, TRUE, 'Jorge',   'Herrera',  NULL),
  (6, 'huesped1@grandstay.com',  '$2a$12$oXOytoHA/3RwzEfm2yPBU.A1beq3yEva0VnOJlVh/QvIyJptCEYui', 5, TRUE, 'Sofia',   'Torres',   NULL),
  (7, 'huesped2@grandstay.com',  '$2a$12$oXOytoHA/3RwzEfm2yPBU.A1beq3yEva0VnOJlVh/QvIyJptCEYui', 5, TRUE, 'Mateo',   'Vargas',   NULL);

INSERT INTO administradores (id_admin, id_usuario, otp_actual) VALUES
  (1, 1, '123456');

INSERT INTO recepcionistas (id_recepcionista, id_usuario) VALUES
  (1, 2),
  (2, 3);

INSERT INTO personal_limpieza (id_personal, id_usuario) VALUES
  (1, 4);

INSERT INTO especialidades_tecnicas (id_especialidad, nombre, descripcion) VALUES
  (1, 'Electricidad', 'Mantenimiento electrico general');

INSERT INTO servicio_tecnico (id_tecnico, id_usuario, id_especialidad, nivel_certificacion, turno, fecha_ingreso) VALUES
  (1, 5, 1, 'Nivel II', 'rotativo', '2023-02-01');

INSERT INTO huespedes
  (id_huesped, id_usuario, nombres, apellidos, email, num_documento, telefono)
VALUES
  (1, 6, 'Sofia', 'Torres', 'huesped1@grandstay.com', '1020304050', '3101234567'),
  (2, 7, 'Mateo', 'Vargas', 'huesped2@grandstay.com', '1030405060', '3209876543'),
  (3, NULL, 'Jean', 'Dupont', 'jdupont@mail.fr', 'FR9876543', '+33612345678');

INSERT INTO tipos_habitacion
  (id_tipo, nombre, descripcion, capacidad, camas, activo)
VALUES
  (1, 'Estandar', 'Habitacion estandar para dos personas', 2, '1 cama doble', TRUE),
  (2, 'Deluxe', 'Habitacion deluxe con vista exterior', 3, '1 cama queen y 1 sencilla', TRUE),
  (3, 'Suite Junior', 'Suite junior con sala pequena', 2, '1 cama king', TRUE),
  (4, 'Suite Senior', 'Suite amplia para familia', 4, '1 cama king y 2 sencillas', TRUE),
  (5, 'Presidencial', 'Suite presidencial premium', 4, '2 camas king', TRUE);

INSERT INTO habitaciones (id_habitacion, id_tipo, numero, piso, estado, activo) VALUES
  (1, 1, '101', 1, 'disponible', TRUE),
  (2, 1, '102', 1, 'disponible', TRUE),
  (3, 2, '201', 2, 'ocupada', TRUE),
  (4, 2, '202', 2, 'limpieza', TRUE),
  (5, 3, '301', 3, 'disponible', TRUE),
  (6, 4, '401', 4, 'mantenimiento', TRUE),
  (7, 5, '501', 5, 'disponible', TRUE);

INSERT INTO tarifas (id_tarifa, id_tipo, nombre, temporada, precio_noche, fecha_inicio, fecha_fin, activa) VALUES
  (1, 1, 'Estandar media', 'media', 150000.00, '2026-01-01', '2026-12-31', TRUE),
  (2, 2, 'Deluxe alta', 'alta', 280000.00, '2026-01-01', '2026-12-31', TRUE),
  (3, 3, 'Suite Junior media', 'media', 450000.00, '2026-01-01', '2026-12-31', TRUE),
  (4, 4, 'Suite Senior alta', 'alta', 750000.00, '2026-01-01', '2026-12-31', TRUE),
  (5, 5, 'Presidencial alta', 'alta', 2000000.00, '2026-01-01', '2026-12-31', TRUE);

INSERT INTO reservas
  (id_reserva, codigo_confirmacion, id_huesped, id_recepcionista, id_tipo_habitacion,
   id_habitacion, fecha_entrada, fecha_salida, estado, canal_reserva, monto_pagado, observaciones)
VALUES
  (1, 'GS-2026-000001', 1, 1, 1, 1, '2026-06-10', '2026-06-13', 'confirmada', 'presencial', 150000.00, 'Reserva futura para pruebas de cancelacion'),
  (2, 'GS-2026-000002', 2, 2, 2, 3, '2026-05-28', '2026-06-02', 'en_curso', 'web', 560000.00, 'Reserva activa con consumos'),
  (3, 'GS-2026-000003', 3, 1, 3, 5, '2026-07-01', '2026-07-05', 'pendiente', 'web', 0.00, 'Reserva pendiente');

INSERT INTO tokens_pago
  (id_token, id_reserva, token, proveedor, monto_autorizado, referencia_ext, vigente)
VALUES
  (1, 1, 'tok_test_reserva_1', 'mock', 150000.00, 'MOCK-RES-1', TRUE),
  (2, 2, 'tok_test_reserva_2', 'mock', 560000.00, 'MOCK-RES-2', TRUE);

INSERT INTO checkin
  (id_checkin, id_reserva, id_recepcionista, id_habitacion, codigo_acceso, documento_verificado, observaciones)
VALUES
  (1, 2, 2, 3, 'GS-9941', TRUE, 'Check-in de prueba para checkout y consumos');

INSERT INTO servicios_adicionales
  (id_servicio, nombre, categoria, precio, activo, disponible)
VALUES
  (1, 'Masaje relajante 60 min', 'spa', 120000.00, TRUE, TRUE),
  (2, 'Desayuno buffet', 'restaurante', 45000.00, TRUE, TRUE),
  (3, 'Lavanderia express', 'lavanderia', 35000.00, TRUE, TRUE),
  (4, 'Room Service 24h', 'room_service', 25000.00, TRUE, TRUE);

INSERT INTO consumo_servicios
  (id_consumo, id_reserva, id_habitacion, id_servicio, cantidad, precio_aplicado, subtotal, fecha, estado, id_factura, notas)
VALUES
  (1, 2, 3, 2, 2, 45000.00, 90000.00, '2026-05-29 08:30:00', 'completado', NULL, 'Desayuno buffet'),
  (2, 2, 3, 3, 1, 35000.00, 35000.00, '2026-05-29 10:00:00', 'completado', NULL, 'Lavanderia express');

INSERT INTO insumos_limpieza
  (id_insumo, nombre, categoria, unidad_medida, stock_actual, stock_minimo, faltante)
VALUES
  (1, 'Desinfectante multiusos', 'quimico', 'litro', 40.00, 10.00, 0.00),
  (2, 'Trapo de microfibra', 'textil', 'unidad', 80.00, 20.00, 0.00),
  (3, 'Papel higienico rollo', 'papel', 'unidad', 3.00, 10.00, 7.00);

INSERT INTO consumo_insumos
  (id_consumo, id_personal, id_insumo, id_habitacion, tipo_tarea, cantidad, observaciones)
VALUES
  (1, 1, 1, 4, 'limpieza_rutina', 0.50, 'Limpieza posterior a salida'),
  (2, 1, 2, 4, 'limpieza_rutina', 2.00, 'Reposicion de textiles');

INSERT INTO notificaciones
  (id_notificacion, id_usuario_dest, id_reserva, id_huesped, tipo, evento, destinatario, asunto, cuerpo, estado)
VALUES
  (1, 6, 1, 1, 'email', 'confirmacion_reserva', 'huesped1@grandstay.com', 'Confirmacion reserva GS-2026-000001', 'Su reserva fue confirmada.', 'pendiente'),
  (2, 7, 2, 2, 'email', 'factura_checkout', 'huesped2@grandstay.com', 'Factura pendiente Grand-Stay', 'Factura generada para su reserva.', 'pendiente');

INSERT INTO reportes
  (id_reporte, generado_por, tipo_reporte, titulo, periodo_inicio, periodo_fin, formato)
VALUES
  (1, 1, 'ocupacion', 'Ocupacion Junio 2026', '2026-06-01', '2026-06-30', 'JSON'),
  (2, 1, 'financiero', 'Ingresos Junio 2026', '2026-06-01', '2026-06-30', 'JSON');

INSERT INTO log_auditoria
  (id_log, id_usuario, accion, tabla_afectada, id_registro, valor_anterior, valor_nuevo, ip)
VALUES
  (1, 1, 'LOGIN', 'usuarios', 1, NULL, JSON_OBJECT('resultado', 'exitoso'), '127.0.0.1');

SET FOREIGN_KEY_CHECKS = 1;
