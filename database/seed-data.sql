-- =============================================================
--  GRAND-STAY — Datos de Prueba
--  Motor: MySQL / MariaDB  |  Compatible: HeidiSQL
--  Ejecutar DESPUÉS de grandstay_db.sql (F5 en HeidiSQL)
-- =============================================================
--
--  CREDENCIALES DE ACCESO
--  Email                            | Contraseña  | Rol
--  ---------------------------------|-------------|--------------------
--  admin@grandstay.com              | Admin2024!  | Administrador
--  recep1@grandstay.com             | Recep2024!  | Recepcionista
--  recep2@grandstay.com             | Recep2024!  | Recepcionista
--  limpieza1@grandstay.com          | Limp2024!   | Personal Limpieza
--  tecnico1@grandstay.com           | Tec2024!    | Servicio Tecnico
--  huesped1@grandstay.com           | Hues2024!   | Huesped
--  huesped2@grandstay.com           | Hues2024!   | Huesped
--
--  password_hash = SHA2('contraseña', 256)  (solo para pruebas)
--  En produccion usar bcrypt o Argon2
-- =============================================================

USE grandstay_db;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- 1. USUARIOS
-- =============================================================
INSERT INTO usuarios
  (id_usuario, id_rol, nombre, apellido, email, password_hash, activo, ultimo_acceso)
VALUES
  (1, 1, 'Carlos',  'Mendoza',  'admin@grandstay.com',     SHA2('Admin2024!', 256), TRUE, NOW()),
  (2, 2, 'Laura',   'Gomez',    'recep1@grandstay.com',    SHA2('Recep2024!', 256), TRUE, NOW()),
  (3, 2, 'Andres',  'Rios',     'recep2@grandstay.com',    SHA2('Recep2024!', 256), TRUE, NOW()),
  (4, 3, 'Maria',   'Castillo', 'limpieza1@grandstay.com', SHA2('Limp2024!',  256), TRUE, NULL),
  (5, 4, 'Jorge',   'Herrera',  'tecnico1@grandstay.com',  SHA2('Tec2024!',   256), TRUE, NULL),
  (6, 5, 'Sofia',   'Torres',   'huesped1@grandstay.com',  SHA2('Hues2024!',  256), TRUE, NULL),
  (7, 5, 'Mateo',   'Vargas',   'huesped2@grandstay.com',  SHA2('Hues2024!',  256), TRUE, NULL);

-- =============================================================
-- 2. ESPECIALIZACIONES DE USUARIO
-- =============================================================

INSERT INTO administradores (id_admin, id_usuario, nivel_acceso, departamento, fecha_ingreso) VALUES
  (1, 1, 3, 'Gerencia General', '2022-01-10');

INSERT INTO recepcionistas (id_recepcionista, id_usuario, codigo_empleado, turno, telefono_ext, fecha_ingreso) VALUES
  (1, 2, 'REC-001', 'manana', '101', '2023-03-15'),
  (2, 3, 'REC-002', 'tarde',  '102', '2023-07-01');

INSERT INTO personal_limpieza (id_personal, id_usuario, turno_asignado, zona_asignada, piso_asignado, fecha_ingreso) VALUES
  (1, 4, 'manana', 'Pisos 1-3', 2, '2023-05-20');

-- id_especialidad 1 = Electricidad (ya insertada en el esquema)
INSERT INTO servicio_tecnico (id_tecnico, id_usuario, id_especialidad, nivel_certificacion, turno, fecha_ingreso) VALUES
  (1, 5, 1, 'Nivel II', 'rotativo', '2023-02-01');

-- =============================================================
-- 3. HUESPEDES
-- =============================================================
INSERT INTO huespedes
  (id_huesped, id_usuario, nombres, apellidos, tipo_documento, num_documento,
   nacionalidad, fecha_nacimiento, genero, telefono, email,
   ciudad, pais, vip, nivel_fidelidad, puntos_fidelidad, consentimiento_datos, fecha_registro)
VALUES
  (1, 6, 'Sofia',  'Torres',  'CC',        '1020304050', 'Colombia', '1990-06-14', 'F', '3101234567',   'huesped1@grandstay.com', 'Bogota',   'Colombia', FALSE, 'Plata',  250, TRUE, '2024-01-15'),
  (2, 7, 'Mateo',  'Vargas',  'CC',        '1030405060', 'Colombia', '1985-11-23', 'M', '3209876543',   'huesped2@grandstay.com', 'Medellin', 'Colombia', TRUE,  'Oro',    900, TRUE, '2023-08-10'),
  (3, NULL,'Jean', 'Dupont',  'Pasaporte', 'FR9876543',  'Francia',  '1978-03-30', 'M', '+33612345678', 'jdupont@mail.fr',        'Paris',    'Francia',  FALSE, 'Bronce', 0,   TRUE, '2025-02-20');

-- =============================================================
-- 4. HABITACIONES
--    tipos_habitacion ids 1-5 ya vienen en el esquema
-- =============================================================
INSERT INTO habitaciones (id_habitacion, id_tipo, numero_habitacion, piso, estado) VALUES
  (1, 1, '101', 1, 'disponible'),
  (2, 1, '102', 1, 'disponible'),
  (3, 2, '201', 2, 'disponible'),
  (4, 2, '202', 2, 'limpieza'),
  (5, 3, '301', 3, 'disponible'),
  (6, 4, '401', 4, 'disponible'),
  (7, 5, '501', 5, 'disponible');

-- =============================================================
-- 5. TARIFAS (vigentes todo 2025)
-- =============================================================
INSERT INTO tarifas (id_tarifa, id_tipo, nombre, precio_noche, temporada, fecha_inicio, fecha_fin, activa, created_by) VALUES
  (1, 1, 'Estandar Media',          150000.00,  'media',    '2025-01-01', '2025-12-31', TRUE, 1),
  (2, 2, 'Deluxe Alta',             280000.00,  'alta',     '2025-01-01', '2025-12-31', TRUE, 1),
  (3, 3, 'Suite Junior Media',      450000.00,  'media',    '2025-01-01', '2025-12-31', TRUE, 1),
  (4, 4, 'Suite Senior Alta',       750000.00,  'alta',     '2025-01-01', '2025-12-31', TRUE, 1),
  (5, 5, 'Presidencial Especial', 2000000.00,   'especial', '2025-01-01', '2025-12-31', TRUE, 1);

-- =============================================================
-- 6. RESERVAS
-- =============================================================
INSERT INTO reservas
  (id_reserva, codigo_confirmacion, id_huesped, id_recepcionista, id_tipo_habitacion,
   id_habitacion, fecha_entrada, fecha_salida, num_adultos, num_ninos,
   estado, canal_reserva, monto_pagado, politica_cancelacion)
VALUES
  (1, 'GS-2025-000001', 1, 1, 1, 1, '2025-05-20', '2025-05-23', 2, 0, 'completada', 'presencial', 450000.00, 'moderada'),
  (2, 'GS-2025-000002', 2, 2, 2, 3, '2025-05-21', '2025-05-25', 2, 1, 'confirmada', 'web',        560000.00, 'flexible'),
  (3, 'GS-2025-000003', 3, 1, 3, 5, '2025-06-01', '2025-06-05', 1, 0, 'pendiente',  'OTA',        0.00,      'estricta');

-- =============================================================
-- 7. TOKENS DE PAGO
-- =============================================================
INSERT INTO tokens_pago
  (id_token, id_reserva, token, proveedor, monto_autorizado, moneda, fecha_expiracion, vigente, referencia_ext)
VALUES
  (1, 1, 'tok_test_ABC123XYZ', 'Wompi', 450000.00, 'COP', '2025-05-20 23:59:00', FALSE, 'WMP-20250520-001'),
  (2, 2, 'tok_test_DEF456UVW', 'Wompi', 560000.00, 'COP', '2025-05-21 23:59:00', TRUE,  'WMP-20250521-002');

-- =============================================================
-- 8. CHECK-IN
-- =============================================================
INSERT INTO checkin
  (id_checkin, id_reserva, id_recepcionista, id_habitacion,
   fecha_hora, codigo_acceso, documento_verificado, deposito_garantia, metodo_deposito)
VALUES
  (1, 1, 1, 1, '2025-05-20 14:30:00', 'ACC-7823', TRUE, 200000.00, 'tarjeta'),
  (2, 2, 2, 3, '2025-05-21 15:00:00', 'ACC-9941', TRUE, 300000.00, 'tarjeta');

-- =============================================================
-- 9. CHECK-OUT (reserva 1 completada)
-- =============================================================
INSERT INTO checkout
  (id_checkout, id_checkin, id_recepcionista, fecha_hora,
   total_cobrado, estado_habitacion, deposito_devuelto, cargos_adicionales)
VALUES
  (1, 1, 1, '2025-05-23 11:00:00', 535500.00, 'bueno', 200000.00, 0.00);

-- =============================================================
-- 10. FACTURAS E ITEMS
-- =============================================================
-- Factura 1: pagada (reserva completada)
INSERT INTO facturas
  (id_factura, id_checkin, id_checkout, numero_factura, fecha_emision,
   subtotal, impuesto_pct, impuestos, descuentos, total,
   metodo_pago, moneda, estado_pago, email_enviado)
VALUES
  (1, 1, 1, 'FAC-2025-0001', '2025-05-23 11:05:00',
   450000.00, 19.00, 85500.00, 0.00, 535500.00,
   'tarjeta_credito', 'COP', 'pagada', TRUE);

INSERT INTO items_factura (id_item, id_factura, concepto, categoria, cantidad, precio_unitario, subtotal, fecha) VALUES
  (1, 1, 'Alojamiento Estandar - 3 noches', 'alojamiento', 3, 150000.00, 450000.00, '2025-05-23');

-- Factura 2: parcial (huesped en estadía)
INSERT INTO facturas
  (id_factura, id_checkin, id_checkout, numero_factura, fecha_emision,
   subtotal, impuesto_pct, impuestos, descuentos, total,
   metodo_pago, moneda, estado_pago, email_enviado)
VALUES
  (2, 2, NULL, 'FAC-2025-0002', '2025-05-21 15:10:00',
   1235000.00, 19.00, 234650.00, 0.00, 1469650.00,
   'tarjeta_credito', 'COP', 'parcial', FALSE);

INSERT INTO items_factura (id_item, id_factura, concepto, categoria, cantidad, precio_unitario, subtotal, fecha) VALUES
  (2, 2, 'Alojamiento Deluxe - 4 noches', 'alojamiento',        4, 280000.00, 1120000.00, '2025-05-21'),
  (3, 2, 'Desayuno buffet x2 personas',   'servicio_adicional', 2,  45000.00,   90000.00, '2025-05-22'),
  (4, 2, 'Room Service - cena',            'servicio_adicional', 1,  25000.00,   25000.00, '2025-05-22');

-- =============================================================
-- 11. SERVICIOS ADICIONALES
-- =============================================================
INSERT INTO servicios_adicionales
  (id_servicio, nombre, descripcion, categoria, precio, duracion_minutos, requiere_reserva, disponible)
VALUES
  (1, 'Masaje relajante 60 min', 'Masaje corporal completo en spa',           'spa',         120000.00, 60,  TRUE,  TRUE),
  (2, 'Desayuno buffet',         'Desayuno continental y caliente',           'restaurante',  45000.00, 90,  FALSE, TRUE),
  (3, 'Transfer aeropuerto',     'Traslado ida/vuelta en van privada',        'transporte',   80000.00, 60,  TRUE,  TRUE),
  (4, 'Lavanderia express',      'Entrega en menos de 4 horas',              'lavanderia',   35000.00, 240, FALSE, TRUE),
  (5, 'Room Service 24h',        'Carta completa de cocina a la habitacion', 'room_service', 25000.00, 30,  FALSE, TRUE);

-- Consumos de servicio en reserva 2
INSERT INTO consumo_servicios
  (id_consumo_servicio, id_reserva, id_habitacion, id_servicio,
   cantidad, precio_aplicado, subtotal, fecha, estado, id_factura)
VALUES
  (1, 2, 3, 2, 2, 45000.00, 90000.00, '2025-05-22 08:30:00', 'completado', 2),
  (2, 2, 3, 5, 1, 25000.00, 25000.00, '2025-05-22 22:00:00', 'completado', 2);

-- =============================================================
-- 12. INSUMOS DE LIMPIEZA
-- =============================================================
INSERT INTO insumos_limpieza
  (id_insumo, nombre, categoria, unidad_medida, stock_actual, stock_minimo, proveedor)
VALUES
  (1, 'Desinfectante multiusos', 'quimico',     'litro',  40.00, 10.00, 'CleanPro SAS'),
  (2, 'Detergente ropa blanca',  'quimico',     'kg',     25.00,  5.00, 'CleanPro SAS'),
  (3, 'Trapo de microfibra',     'textil',      'unidad', 80.00, 20.00, 'TextilHotel'),
  (4, 'Papel higienico rollo',   'papel',       'unidad',500.00, 50.00, 'PapelCo'),
  (5, 'Escoba plastica',         'herramienta', 'unidad', 15.00,  4.00, 'HerramientasPro'),
  (6, 'Limpiavidrios spray',     'quimico',     'unidad',  3.00,  5.00, 'CleanPro SAS');
--  ^ stock 3 < minimo 5 → aparecera en v_stock_critico

-- Consumos de insumos
INSERT INTO consumo_insumos
  (id_consumo_insumo, id_personal, id_insumo, id_habitacion, tipo_tarea, cantidad, fecha)
VALUES
  (1, 1, 1, 1, 'limpieza_rutina', 0.50, '2025-05-23 10:00:00'),
  (2, 1, 3, 1, 'limpieza_rutina', 2.00, '2025-05-23 10:05:00'),
  (3, 1, 4, 1, 'checkin_prep',    4.00, '2025-05-23 10:10:00');

-- =============================================================
-- 13. NOTIFICACIONES
-- =============================================================
INSERT INTO notificaciones
  (id_notificacion, id_reserva, id_huesped, tipo, evento, destinatario, asunto, cuerpo, estado, fecha_envio)
VALUES
  (1, 1, 1, 'email', 'confirmacion_reserva',
   'huesped1@grandstay.com',
   'Confirmacion reserva GS-2025-000001',
   'Estimada Sofia, su reserva ha sido confirmada para el 20 de mayo. Le esperamos.',
   'enviada', '2025-05-15 09:00:00'),
  (2, 1, 1, 'email', 'checkout_completado',
   'huesped1@grandstay.com',
   'Gracias por su estadia en Grand-Stay',
   'Estimada Sofia, ha sido un placer recibirle. Adjuntamos su factura FAC-2025-0001.',
   'enviada', '2025-05-23 11:10:00'),
  (3, 2, 2, 'email', 'confirmacion_reserva',
   'huesped2@grandstay.com',
   'Confirmacion reserva GS-2025-000002',
   'Estimado Mateo, su reserva VIP ha sido confirmada para el 21 de mayo.',
   'enviada', '2025-05-16 10:00:00'),
  (4, 3, 3, 'email', 'confirmacion_reserva',
   'jdupont@mail.fr',
   'Reservation GS-2025-000003 en attente de paiement',
   'Estimado Jean, su reserva esta pendiente de confirmacion de pago.',
   'pendiente', NULL);

-- =============================================================
-- 14. REPORTES
-- =============================================================
INSERT INTO reportes
  (id_reporte, generado_por, tipo_reporte, titulo, periodo_inicio, periodo_fin, formato)
VALUES
  (1, 1, 'ocupacion',  'Ocupacion Mayo 2025',           '2025-05-01', '2025-05-31', 'PDF'),
  (2, 1, 'financiero', 'Ingresos acumulados Mayo 2025', '2025-05-01', '2025-05-31', 'XLSX');

-- =============================================================
-- 15. LOG DE AUDITORIA
-- =============================================================
INSERT INTO log_auditoria
  (id_log, id_usuario, tabla_afectada, accion, id_registro, ip_origen, fecha_hora)
VALUES
  (1, 1, 'usuarios',  'LOGIN',  1, '192.168.1.10', '2025-05-20 08:00:00'),
  (2, 2, 'reservas',  'INSERT', 1, '192.168.1.11', '2025-05-15 10:30:00'),
  (3, 2, 'checkin',   'INSERT', 1, '192.168.1.11', '2025-05-20 14:30:00'),
  (4, 1, 'facturas',  'INSERT', 1, '192.168.1.10', '2025-05-23 11:05:00'),
  (5, 1, 'reportes',  'INSERT', 1, '192.168.1.10', '2025-05-31 17:00:00');

-- =============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- RESUMEN
-- Tabla                   | Filas
-- ----------------------- | -----
-- usuarios                |   7
-- administradores         |   1
-- recepcionistas          |   2
-- personal_limpieza       |   1
-- servicio_tecnico        |   1
-- huespedes               |   3
-- habitaciones            |   7
-- tarifas                 |   5
-- reservas                |   3
-- tokens_pago             |   2
-- checkin                 |   2
-- checkout                |   1
-- facturas                |   2
-- items_factura           |   4
-- servicios_adicionales   |   5
-- consumo_servicios       |   2
-- insumos_limpieza        |   6  (insumo 6 aparece en v_stock_critico)
-- consumo_insumos         |   3
-- notificaciones          |   4
-- reportes                |   2
-- log_auditoria           |   5
-- =============================================================