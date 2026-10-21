import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middlewares/errorHandler.js';
import {
  verificarGoogleIdToken,
  generarTokenCabales,
  TokenPayload
} from '../services/auth.js';

/**
 * POST /api/auth/google
 * Autenticación con Google (One Tap o botón oficial de Google)
 */
export const loginWithGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential, id_token, guest_user_id } = req.body as { credential?: string; id_token?: string; guest_user_id?: string };
    const rawToken = credential || id_token;

    if (!rawToken) {
      throw new HttpError(400, 'El token credential de Google es obligatorio');
    }

    // 1. Verificar el token con Google
    const googleUser = await verificarGoogleIdToken(rawToken);

    // 2. Buscar o crear el usuario en nuestra base de datos
    let user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { google_id: googleUser.googleId },
          { email: googleUser.email }
        ]
      }
    });

    if (user) {
      // Actualizar datos si cambiaron (foto o vincular google_id si se creó por email antes)
      user = await prisma.usuario.update({
        where: { id: user.id },
        data: {
          google_id: googleUser.googleId,
          avatar_url: googleUser.picture || user.avatar_url || null,
          nombre: user.nombre || googleUser.name
        }
      });
    } else {
      // Crear nuevo usuario registrado con Google
      user = await prisma.usuario.create({
        data: {
          nombre: googleUser.name,
          email: googleUser.email,
          avatar_url: googleUser.picture || null,
          google_id: googleUser.googleId
        }
      });
    }

    // 3. Si venía de una sesión de invitado temporal en este dispositivo, transferir sus mesas
    if (guest_user_id && guest_user_id !== user.id) {
      try {
        // Transferir eventos donde el invitado era creador
        await prisma.evento.updateMany({
          where: { creador_id: guest_user_id },
          data: { creador_id: user.id }
        });

        // Transferir participaciones
        const guestParticipations = await prisma.participante.findMany({
          where: { usuario_id: guest_user_id }
        });

        for (const p of guestParticipations) {
          const yaExiste = await prisma.participante.findFirst({
            where: { evento_id: p.evento_id, usuario_id: user.id }
          });
          if (!yaExiste) {
            await prisma.participante.update({
              where: { id: p.id },
              data: { usuario_id: user.id }
            });
          }
        }

        // Si el usuario guest era @guest, eliminarlo para no dejar basura
        const guestUser = await prisma.usuario.findUnique({ where: { id: guest_user_id } });
        if (guestUser && guestUser.email.includes('@guest.cabales.app')) {
          await prisma.usuario.delete({ where: { id: guest_user_id } }).catch(() => {});
        }
      } catch (migrationErr) {
        console.error('Error migrando mesas del invitado:', migrationErr);
      }
    }

    // 4. Generar token JWT firmado
    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      avatar_url: user.avatar_url,
      isGuest: false
    };

    const token = generarTokenCabales(tokenPayload);

    res.status(200).json({
      success: true,
      message: `¡Bienvenido a Cabales, ${user.nombre}!`,
      data: {
        user,
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/guest
 * Iniciar sesión rápida de invitado (1 toque, sin contraseñas ni registro)
 */
export const loginAsGuest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, nombre_invitado } = req.body as { nombre?: string; nombre_invitado?: string };
    const raw = nombre || nombre_invitado;
    const trimmed = (raw && raw.trim()) || 'Invitado';

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const guestEmail = `guest.${randomSuffix}@guest.cabales.app`;

    const user = await prisma.usuario.create({
      data: {
        nombre: trimmed,
        email: guestEmail
      }
    });

    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      avatar_url: null,
      isGuest: true
    };

    const token = generarTokenCabales(tokenPayload);

    res.status(201).json({
      success: true,
      message: 'Modo invitado iniciado',
      data: {
        user,
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/dev-login
 * Acceso directo para pruebas en desarrollo (por nombre o email registrado)
 */
export const devLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(403, 'El inicio de sesión de prueba solo está disponible en entorno de desarrollo.');
    }

    const { identifier, email, guest_user_id } = req.body as { identifier?: string; email?: string; guest_user_id?: string };
    const query = (identifier || email || '').trim();
    if (!query) {
      throw new HttpError(400, 'Debes ingresar un nombre o correo');
    }
    const queryLower = query.toLowerCase();

    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: { equals: queryLower, mode: 'insensitive' } },
          { nombre: { equals: query, mode: 'insensitive' } },
          { id: queryLower }
        ]
      }
    });

    if (!user) {
      throw new HttpError(404, `No se encontró ninguna cuenta con "${query}"`);
    }

    // Si había un invitado temporal en sesión, migrar sus mesas al usuario
    if (guest_user_id && guest_user_id !== user.id) {
      try {
        await prisma.evento.updateMany({
          where: { creador_id: guest_user_id },
          data: { creador_id: user.id }
        });
      } catch {}
    }

    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      avatar_url: user.avatar_url,
      isGuest: user.email.includes('@guest.cabales.app')
    };

    const token = generarTokenCabales(tokenPayload);

    res.status(200).json({
      success: true,
      message: `Sesión iniciada como ${user.nombre}`,
      data: {
        user,
        token
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Valida el token JWT y devuelve el perfil del usuario autenticado
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpError(401, 'No autenticado');
    }

    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};
