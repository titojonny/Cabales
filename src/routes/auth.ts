import { Router } from 'express';
import { loginWithGoogle, loginAsGuest, devLogin, getMe } from '../controllers/auth.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Iniciar sesión / Registro con Google
router.post('/auth/google', loginWithGoogle);

// Iniciar sesión rápida de invitado (1 toque, sin registro)
router.post('/auth/guest', loginAsGuest);

// Acceso de desarrollo (pruebas en local con nombres de seed)
router.post('/auth/dev-login', devLogin);

// Validar token y obtener perfil del usuario activo
router.get('/auth/me', requireAuth, getMe);

export default router;
