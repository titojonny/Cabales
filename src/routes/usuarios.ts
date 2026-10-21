import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { assertParamId } from '../middlewares/assertParamId.js';
import {
  crearUsuario,
  listarUsuarios,
  obtenerEventosDeUsuario,
  actualizarUsuario,
  obtenerResumenFinanciero,
  reclamarEventosInvitado
} from '../controllers/usuarios.js';
import {
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  reclamarEventosSchema
} from '../validators/schemas.js';

const router = Router();

// Listar usuarios registrados
router.get('/users', listarUsuarios);

// Crear un usuario nuevo
router.post('/users', validateBody(crearUsuarioSchema), crearUsuario);

// Actualizar perfil de usuario
router.patch('/users/:id', assertParamId('usuario'), validateBody(actualizarUsuarioSchema), actualizarUsuario);

// Dashboard: eventos donde el usuario es creador o participante
router.get('/users/:id/events', assertParamId('usuario'), obtenerEventosDeUsuario);

// Resumen financiero personal: estadísticas de gasto, créditos por cobrar y deudas
router.get('/users/:id/financial-summary', assertParamId('usuario'), obtenerResumenFinanciero);

// Reclamar mesas creadas o visitadas como invitado temporal en el dispositivo
router.post('/users/:id/claim-events', assertParamId('usuario'), validateBody(reclamarEventosSchema), reclamarEventosInvitado);

export default router;