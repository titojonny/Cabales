import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsMiddleware } from './config/cors.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import authRouter from './routes/auth.js';
import eventosRouter from './routes/eventos.js';
import healthRouter from './routes/health.js';
import transaccionesRouter from './routes/transacciones.js';
import usuariosRouter from './routes/usuarios.js';
import invitacionesRouter from './routes/invitaciones.js';

export const app = express();

// Confianza en proxies inversos (ej. Nginx, Fly.io, Railway, Render)
app.set('trust proxy', 1);

// Habilitar CORS para Angular, Ionic dev servers y WebView Capacitor
app.use(corsMiddleware);

// Seguridad HTTP permitiendo consumo cross-origin de recursos
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 100000 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/test-db',
    message: {
      success: false,
      message: 'Demasiadas peticiones desde este dispositivo, por favor intenta en unos minutos.'
    }
  })
);

// Middleware para que Express entienda JSON con límite de payload
app.use(express.json({ limit: '10kb' }));

// Rate limiting específico para rutas de autenticación (previene ataques de fuerza bruta / spam)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de autenticación desde este dispositivo. Intenta de nuevo en 15 minutos.'
  }
});

// Servir estáticamente archivos subidos (comprobantes de pago) de forma segura
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    dotfiles: 'ignore',
    etag: true,
    maxAge: '1d',
    index: false
  })
);

// Rutas de la API
app.use('/api', healthRouter);
app.use('/api/auth', authLimiter);
app.use('/api', authRouter);
app.use('/api', usuariosRouter);
app.use('/api', eventosRouter);
app.use('/api', transaccionesRouter);
app.use('/api', invitacionesRouter);

// Manejo de errores (siempre al final)
app.use(notFound);
app.use(errorHandler);