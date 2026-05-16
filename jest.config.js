// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
  },
  collectCoverageFrom: [
    'src/services/disponibilidad.service.js',
    'src/services/overbooking.service.js',
    'src/services/pasarela.service.js',
    'src/services/eventos.service.js',
    'src/services/auth.service.js',
    'src/services/auditoria.service.js',
    'src/services/consumos.service.js',
    'src/services/checkout.service.js',
    'src/services/habitaciones.service.js',
    'src/services/inventario.service.js',
    'src/services/reportes.service.js',
    'src/services/reservas.service.js',
    'src/middleware/auth.middleware.js',
    'src/utils/errors.js',
    '!src/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
