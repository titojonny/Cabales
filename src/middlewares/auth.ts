import { NextFunction, Request, Response } from 'express';
import { verificarTokenCabales, TokenPayload } from '../services/auth.js';
import { prisma } from '../config/prisma.js';
import { HttpError } from './errorHandler.js';

// Extender el tipo Request de Express
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware para requerir autenticación vía JWT (Authorization: Bearer <token>)
 * o fallback a X-User-Id en desarrollo.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verificarTokenCabales(token);
      req.user = payload;
      return next();
    }

    // Fallback de desarrollo para retrocompatibilidad con header X-User-Id (DESACTIVADO en producción)
    if (process.env.NODE_ENV !== 'production') {
      const fallbackUserId = req.headers['x-user-id'] as string | undefined;
      if (fallbackUserId) {
        const user = await prisma.usuario.findUnique({
          where: { id: fallbackUserId }
        });
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            avatar_url: user.avatar_url,
            isGuest: user.email.includes('@guest.cabales.app')
          };
          return next();
        }
      }
    }

    throw new HttpError(401, 'No autenticado. Por favor inicia sesión.');
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware opcional: si viene token lo decodifica, pero no bloquea si no hay.
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        req.user = verificarTokenCabales(token);
      } catch {
        // ignorar si es inválido
      }
    }

    // Si no vino token o falló, usar header X-User-Id únicamente fuera de producción
    if (!req.user && process.env.NODE_ENV !== 'production') {
      const fallbackUserId = req.headers['x-user-id'] as string | undefined;
      if (fallbackUserId) {
        const user = await prisma.usuario.findUnique({
          where: { id: fallbackUserId }
        });
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            avatar_url: user.avatar_url,
            isGuest: user.email.includes('@guest.cabales.app')
          };
        }
      }
    }

    next();
  } catch {
    next();
  }
};
