import { Router } from 'express';
import {
  obtenerMisInvitaciones,
  aceptarInvitacion,
  rechazarInvitacion
} from '../controllers/invitaciones.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = Router();

router.use(optionalAuth);

router.get('/invitations', obtenerMisInvitaciones);
router.post('/invitations/:id/accept', aceptarInvitacion);
router.post('/invitations/:id/reject', rechazarInvitacion);

export default router;
