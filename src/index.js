// src/index.js
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { validarVariablesCriticas } from './config/env.js';

dotenv.config();

try {
  validarVariablesCriticas();
} catch (error) {
  console.error(`FATAL: ${error.message}`);
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Backend Grand-Stay escuchando en el puerto ${port}`);
  console.log(`Swagger UI disponible en http://localhost:${port}/api-docs`);
});
