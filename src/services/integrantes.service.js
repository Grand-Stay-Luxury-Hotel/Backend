import crypto from 'crypto';
import { getConnection, query } from '../utils/db.js';
import { ParametrosInvalidosError } from '../utils/errors.js';

const IDENTIFICADOR_REGEX = /^\d{3}$/;
const CODIGO_REGISTRO_REGEX = /^[A-Z0-9]{8,16}$/;
const TEXTO_SEGURO_REGEX = /^[a-zA-Z0-9\s-]{2,80}$/;
const NOMBRE_REAL_REGEX = /^[a-zA-Z\s-]{2,120}$/;
const GRUPOS_VALIDOS = new Set(['backend', 'frontend']);
const ROTATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const REGISTRATION_CODE_TTL_MS = 24 * 60 * 60 * 1000;

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function compararConstante(a, b) {
  const esperado = Buffer.from(String(a));
  const recibido = Buffer.from(String(b));
  return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
}

function sanitizarIntegrante(integrante) {
  const limpio = normalizarTexto(integrante);
  if (!TEXTO_SEGURO_REGEX.test(limpio)) {
    throw new ParametrosInvalidosError('El seudonimo del integrante contiene caracteres no permitidos');
  }
  return limpio;
}

function sanitizarNombreCompleto(nombreCompleto) {
  const limpio = String(nombreCompleto ?? '').trim().replace(/\s+/g, ' ');
  if (!NOMBRE_REAL_REGEX.test(limpio)) {
    throw new ParametrosInvalidosError('El nombre completo contiene caracteres no permitidos');
  }
  return limpio;
}

function sanitizarGrupo(grupo) {
  const limpio = String(grupo ?? '').trim().toLowerCase();
  if (!GRUPOS_VALIDOS.has(limpio)) {
    throw new ParametrosInvalidosError('El grupo debe ser backend o frontend');
  }
  return limpio;
}

function sanitizarIdentificador(identificador) {
  const limpio = String(identificador ?? '').trim();
  if (!IDENTIFICADOR_REGEX.test(limpio)) {
    throw new ParametrosInvalidosError('El identificador debe contener exactamente 3 digitos');
  }
  return limpio;
}

function sanitizarCodigoRegistro(codigoRegistro) {
  const limpio = String(codigoRegistro ?? '').trim().toUpperCase();
  if (!CODIGO_REGISTRO_REGEX.test(limpio)) {
    throw new ParametrosInvalidosError('El codigo de registro no es valido');
  }
  return limpio;
}

function toMysqlDateTime(fecha) {
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function getRotatingSecret() {
  return process.env.INTEGRANTES_CODE_SECRET
    ?? process.env.JWT_SECRET
    ?? 'grandstay-integrantes-local-secret';
}

function getWindowIndex(fecha) {
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  return Math.floor(date.getTime() / ROTATION_WINDOW_MS);
}

function rowToIntegrante(row) {
  return {
    idIntegrante: row.id_integrante,
    id: row.seudonimo,
    seudonimo: row.seudonimo,
    nombreCompleto: row.nombre_completo,
    grupo: row.grupo,
  };
}

function codigoParaVentana(integrante, windowIndex) {
  const digest = crypto
    .createHmac('sha256', getRotatingSecret())
    .update(`${integrante.id}:${windowIndex}`)
    .digest();
  return String(digest.readUInt32BE(0) % 1000).padStart(3, '0');
}

function hashCodigoRegistro(codigoRegistro) {
  return crypto
    .createHmac('sha256', getRotatingSecret())
    .update(`registro:${codigoRegistro}`)
    .digest('hex');
}

async function buscarIntegrantePorIdentidad(identidadNormalizada) {
  const [row] = await query(
    `
      SELECT id_integrante, seudonimo, nombre_completo, grupo
      FROM integrantes_equipo
      WHERE activo = TRUE
        AND (
          seudonimo_normalizado = :identidad
          OR nombre_normalizado = :identidad
        )
      LIMIT 1
    `,
    { identidad: identidadNormalizada },
  );
  return row ? rowToIntegrante(row) : null;
}

async function validarCodigoRegistroTx(conn, codigoRegistro, fecha = new Date()) {
  const codigoLimpio = sanitizarCodigoRegistro(codigoRegistro);
  const codigoHash = hashCodigoRegistro(codigoLimpio);
  const ahora = toMysqlDateTime(fecha);

  const [[codigo]] = await conn.execute(
    `
      SELECT id_codigo
      FROM integrantes_codigos_registro
      WHERE codigo_hash = :codigoHash
        AND usado = FALSE
        AND expira_en > :ahora
      LIMIT 1
      FOR UPDATE
    `,
    { codigoHash, ahora },
  );

  if (!codigo) {
    throw new ParametrosInvalidosError('El codigo de registro no es valido o ya fue utilizado');
  }

  return codigo;
}

export async function obtenerCodigoRotativo(integranteId, fecha = new Date()) {
  const identidad = sanitizarIntegrante(integranteId);
  const integrante = await buscarIntegrantePorIdentidad(identidad);
  if (!integrante) {
    throw new ParametrosInvalidosError('Integrante no configurado');
  }
  return codigoParaVentana(integrante, getWindowIndex(fecha));
}

export async function obtenerCodigoRotativoDev(integranteId, fecha = new Date()) {
  const identidad = sanitizarIntegrante(integranteId);
  const integrante = await buscarIntegrantePorIdentidad(identidad);
  if (!integrante) {
    throw new ParametrosInvalidosError('Integrante no configurado');
  }

  const ahora = fecha instanceof Date ? fecha : new Date(fecha);
  const windowIndex = getWindowIndex(ahora);
  const vigenteHastaMs = (windowIndex + 1) * ROTATION_WINDOW_MS;

  return {
    id: integrante.id,
    seudonimo: integrante.seudonimo,
    nombreCompleto: integrante.nombreCompleto,
    grupo: integrante.grupo,
    identificador: codigoParaVentana(integrante, windowIndex),
    vigente_hasta: new Date(vigenteHastaMs).toISOString(),
    expira_en_segundos: Math.max(0, Math.ceil((vigenteHastaMs - ahora.getTime()) / 1000)),
  };
}

function validarCodigoRotativo(integrante, identificador, fecha = new Date()) {
  const windowIndex = getWindowIndex(fecha);
  return [windowIndex, windowIndex - 1].some((index) => (
    compararConstante(codigoParaVentana(integrante, index), identificador)
  ));
}

export async function listarIntegrantes() {
  const integrantes = await query(
    `
      SELECT id_integrante, seudonimo, nombre_completo, grupo
      FROM integrantes_equipo
      WHERE activo = TRUE
      ORDER BY FIELD(grupo, 'backend', 'frontend'), seudonimo ASC
    `,
  );

  return {
    data: integrantes.map((row) => {
      const integrante = rowToIntegrante(row);
      return {
        id: integrante.id,
        seudonimo: integrante.seudonimo,
        grupo: integrante.grupo,
      };
    }),
    total: integrantes.length,
  };
}

export async function generarCodigoRegistro({ generadoPor } = {}, fecha = new Date()) {
  const ahora = fecha instanceof Date ? fecha : new Date(fecha);
  const expiraEn = new Date(ahora.getTime() + REGISTRATION_CODE_TTL_MS);
  let codigoRegistro = '';
  let codigoHash = '';

  for (let intentos = 0; intentos < 5; intentos += 1) {
    codigoRegistro = crypto.randomBytes(5).toString('hex').toUpperCase();
    codigoHash = hashCodigoRegistro(codigoRegistro);
    const existentes = await query(
      'SELECT id_codigo FROM integrantes_codigos_registro WHERE codigo_hash = :codigoHash LIMIT 1',
      { codigoHash },
    );
    if (existentes.length === 0) break;
  }

  await query(
    `
      INSERT INTO integrantes_codigos_registro
        (codigo_hash, generado_por, usado, expira_en, creado_en)
      VALUES
        (:codigoHash, :generadoPor, FALSE, :expiraEn, :creadoEn)
    `,
    {
      codigoHash,
      generadoPor: generadoPor ?? null,
      expiraEn: toMysqlDateTime(expiraEn),
      creadoEn: toMysqlDateTime(ahora),
    },
  );

  return {
    codigo: 'CODIGO_REGISTRO_GENERADO',
    mensaje: 'Codigo de registro generado correctamente',
    codigoRegistro,
    expira_en: expiraEn.toISOString(),
    expira_en_segundos: Math.ceil(REGISTRATION_CODE_TTL_MS / 1000),
  };
}

export async function listarCodigosRegistro() {
  const codigos = await query(
    `
      SELECT
        c.id_codigo,
        c.creado_en,
        c.expira_en,
        c.usado,
        u.email AS generado_por
      FROM integrantes_codigos_registro c
      LEFT JOIN usuarios u ON u.id_usuario = c.generado_por
      WHERE c.usado = FALSE
        AND c.expira_en > CURRENT_TIMESTAMP
      ORDER BY c.creado_en DESC, c.id_codigo DESC
    `,
  );

  return {
    data: codigos.map((item) => ({
      id: String(item.id_codigo),
      creado_en: toIso(item.creado_en),
      expira_en: toIso(item.expira_en),
      usado: Boolean(item.usado),
      generado_por: item.generado_por ?? null,
    })),
    total: codigos.length,
  };
}

export async function registrarIntegrante({ seudonimo, nombreCompleto, grupo, codigoRegistro, fechaActual }) {
  const seudonimoLimpio = String(seudonimo ?? '').trim();
  const seudonimoNormalizado = sanitizarIntegrante(seudonimoLimpio);
  const nombreCompletoLimpio = sanitizarNombreCompleto(nombreCompleto);
  const nombreNormalizado = normalizarTexto(nombreCompletoLimpio);
  const grupoLimpio = sanitizarGrupo(grupo);
  const fecha = fechaActual ? new Date(fechaActual) : new Date();
  const conn = await getConnection();

  try {
    await conn.beginTransaction();
    const codigo = await validarCodigoRegistroTx(conn, codigoRegistro, fecha);

    const [[existente]] = await conn.execute(
      `
        SELECT id_integrante
        FROM integrantes_equipo
        WHERE seudonimo_normalizado = :seudonimoNormalizado
          OR nombre_normalizado = :nombreNormalizado
        LIMIT 1
        FOR UPDATE
      `,
      { seudonimoNormalizado, nombreNormalizado },
    );

    if (existente) {
      throw new ParametrosInvalidosError('El integrante ya esta registrado');
    }

    const [resultado] = await conn.execute(
      `
        INSERT INTO integrantes_equipo
          (seudonimo, seudonimo_normalizado, nombre_completo, nombre_normalizado, grupo, activo)
        VALUES
          (:seudonimo, :seudonimoNormalizado, :nombreCompleto, :nombreNormalizado, :grupo, TRUE)
      `,
      {
        seudonimo: seudonimoLimpio,
        seudonimoNormalizado,
        nombreCompleto: nombreCompletoLimpio,
        nombreNormalizado,
        grupo: grupoLimpio,
      },
    );

    await conn.execute(
      `
        UPDATE integrantes_codigos_registro
        SET usado = TRUE,
            usado_por = :idIntegrante,
            usado_en = :usadoEn
        WHERE id_codigo = :idCodigo
      `,
      {
        idIntegrante: resultado.insertId,
        idCodigo: codigo.id_codigo,
        usadoEn: toMysqlDateTime(fecha),
      },
    );

    await conn.commit();

    const nuevoIntegrante = {
      idIntegrante: resultado.insertId,
      id: seudonimoLimpio,
      seudonimo: seudonimoLimpio,
      nombreCompleto: nombreCompletoLimpio,
      grupo: grupoLimpio,
    };

    return {
      codigo: 'INTEGRANTE_REGISTRADO',
      mensaje: 'Integrante registrado correctamente',
      codigoIngreso: codigoParaVentana(nuevoIntegrante, getWindowIndex(fecha)),
      integrante: {
        id: nuevoIntegrante.id,
        seudonimo: nuevoIntegrante.seudonimo,
        nombreCompleto: nuevoIntegrante.nombreCompleto,
        grupo: nuevoIntegrante.grupo,
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function validarIntegrante({
  integrante,
  seudonimo,
  nombreCompleto,
  nombre,
  identificador,
  fechaActual,
}) {
  const identidadNormalizada = sanitizarIntegrante(seudonimo ?? nombreCompleto ?? nombre ?? integrante);
  const identificadorNormalizado = sanitizarIdentificador(identificador);
  const encontrado = await buscarIntegrantePorIdentidad(identidadNormalizada);

  if (!encontrado) {
    return {
      valido: false,
      codigo: 'INTEGRANTE_NO_VALIDO',
      mensaje: 'No se pudo validar el integrante con los datos ingresados',
    };
  }

  const valido = validarCodigoRotativo(encontrado, identificadorNormalizado, fechaActual);
  return {
    valido,
    codigo: valido ? 'INTEGRANTE_VALIDADO' : 'INTEGRANTE_NO_VALIDO',
    mensaje: valido
      ? 'Integrante validado correctamente'
      : 'No se pudo validar el integrante con los datos ingresados',
    integrante: valido
      ? {
          id: encontrado.id,
          seudonimo: encontrado.seudonimo,
          nombreCompleto: encontrado.nombreCompleto,
          grupo: encontrado.grupo,
        }
      : undefined,
  };
}
