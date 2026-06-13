import {
  generarCodigoRegistro,
  listarCodigosRegistro,
  listarIntegrantes,
  obtenerCodigoRotativoDev,
  registrarIntegrante,
  validarIntegrante,
} from '../services/integrantes.service.js';

export async function getIntegrantes(_req, res, next) {
  try {
    res.status(200).json(await listarIntegrantes());
  } catch (error) {
    next(error);
  }
}

export async function postValidarIntegrante(req, res, next) {
  try {
    res.status(200).json(await validarIntegrante(req.body));
  } catch (error) {
    next(error);
  }
}

export async function postRegistrarIntegrante(req, res, next) {
  try {
    res.status(201).json(await registrarIntegrante(req.body));
  } catch (error) {
    next(error);
  }
}

export async function getCodigosRegistro(req, res, next) {
  try {
    res.status(200).json(await listarCodigosRegistro());
  } catch (error) {
    next(error);
  }
}

export async function postCodigoRegistro(req, res, next) {
  try {
    res.status(201).json(await generarCodigoRegistro({
      generadoPor: req.user?.id_usuario ?? req.user?.id ?? null,
    }));
  } catch (error) {
    next(error);
  }
}

export async function getCodigoIntegranteDev(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({
        error: true,
        codigo: 'RUTA_NO_ENCONTRADA',
        mensaje: 'La ruta solicitada no existe',
      });
      return;
    }

    res.status(200).json(await obtenerCodigoRotativoDev(req.params.integrante));
  } catch (error) {
    next(error);
  }
}
