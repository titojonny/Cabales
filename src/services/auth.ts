import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { HttpError } from '../middlewares/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cabales_jwt_secret_dev_key_2026_sv';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'cabales_jwt_secret_dev_key_2026_sv') {
  console.warn('⚠️ [ALERTA DE SEGURIDAD]: Estás corriendo en producción con el JWT_SECRET por defecto. Define una clave secreta segura en tus variables de entorno.');
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface TokenPayload {
  id: string;
  email: string;
  nombre: string;
  avatar_url?: string | null;
  isGuest: boolean;
}

/**
 * Genera un token JWT firmado de Cabales válido por 30 días
 */
export const generarTokenCabales = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

/**
 * Verifica y decodifica un token JWT de Cabales
 */
export const verificarTokenCabales = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new HttpError(401, 'Token de sesión inválido o expirado');
  }
};

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Valida el ID Token de Google recibido desde el frontend
 */
export const verificarGoogleIdToken = async (idToken: string): Promise<GoogleUserInfo> => {
  // Modo de desarrollo/fallback solo si no es producción
  if (!GOOGLE_CLIENT_ID) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(500, 'El servidor no tiene configurado GOOGLE_CLIENT_ID en producción');
    }
    try {
      const decoded = jwt.decode(idToken) as any;
      if (decoded && decoded.email) {
        return {
          googleId: decoded.sub || `google_dev_${Date.now()}`,
          email: decoded.email.toLowerCase(),
          name: decoded.name || decoded.email.split('@')[0],
          picture: decoded.picture
        };
      }
    } catch {
      // seguir a validación formal
    }
  }

  try {
    const options: { idToken: string; audience?: string | string[] } = { idToken };
    if (GOOGLE_CLIENT_ID) {
      options.audience = GOOGLE_CLIENT_ID;
    }
    const ticket = await (googleClient as any).verifyIdToken(options);

    const payload = ticket.getPayload ? ticket.getPayload() : ticket;
    if (!payload || !payload.email) {
      throw new HttpError(400, 'El token de Google no contiene un correo electrónico válido');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture
    };
  } catch (err: any) {
    // Si viene en formato simulado de desarrollo (NUNCA en producción)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const decoded = jwt.decode(idToken) as any;
        if (decoded && decoded.email) {
          return {
            googleId: decoded.sub || `google_${decoded.email}`,
            email: decoded.email.toLowerCase(),
            name: decoded.name || decoded.email.split('@')[0],
            picture: decoded.picture
          };
        }
      } catch {}
    }

    throw new HttpError(401, 'No se pudo verificar la autenticación con Google');
  }
};
