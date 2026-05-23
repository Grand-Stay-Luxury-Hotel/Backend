// src/index.js
import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido. Configure la variable de entorno.');
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Backend Grand-Stay escuchando en el puerto ${port}`);
  console.log(`Swagger UI disponible en http://localhost:${port}/api-docs`);
});
