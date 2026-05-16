// src/index.js
import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Backend Grand-Stay escuchando en el puerto ${port}`);
  console.log(`Swagger UI disponible en http://localhost:${port}/api-docs`);
});
