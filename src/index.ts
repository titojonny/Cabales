import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { initSocket } from './socket.js';

// Levantar el servidor HTTP y WebSockets
const PORT = Number(process.env.PORT) || 3000;
const httpServer = http.createServer(app);

// Inicializar Socket.io sobre el servidor HTTP
initSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend + WebSockets activo en http://0.0.0.0:${PORT} (accesible en tu red local)`);
});