import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { assertParamId } from '../middlewares/assertParamId.js';
import { broadcastTableUpdate } from '../socket.js';

/**
 * GET /api/invitations
 * Obtiene todas las invitaciones pendientes del usuario autenticado
 */
export const obtenerMisInvitaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user?.id || req.headers['x-user-id']) as string | undefined;
    if (!userId) {
      throw new HttpError(401, 'Debes iniciar sesión para ver tus invitaciones');
    }

    const invitaciones = await prisma.invitacionMesa.findMany({
      where: {
        invitado_id: userId,
        estado: 'PENDIENTE',
        evento: {
          estado: 'ACTIVO'
        }
      },
      include: {
        evento: {
          select: {
            id: true,
            nombre: true,
            fecha: true,
            total_gastado_centavos: true,
            _count: { select: { participantes: true } }
          }
        },
        anfitrion: {
          select: {
            id: true,
            nombre: true,
            avatar_url: true
          }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    const data = invitaciones.map((inv) => ({
      id: inv.id,
      evento_id: inv.evento.id,
      nombre_mesa: inv.evento.nombre,
      numero_comensales: inv.evento._count.participantes,
      anfitrion: inv.anfitrion,
      creado_en: inv.creado_en
    }));

    res.status(200).json({
      success: true,
      message: 'Invitaciones obtenidas',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitations/:id/accept
 * Acepta la invitación a la mesa y sienta al comensal
 */
export const aceptarInvitacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitacionId = assertParamId(req.params.id, 'invitación');
    const userId = (req.user?.id || req.headers['x-user-id']) as string | undefined;

    if (!userId) {
      throw new HttpError(401, 'Debes iniciar sesión para aceptar una invitación');
    }

    const invitacion = await prisma.invitacionMesa.findUnique({
      where: { id: invitacionId },
      include: {
        evento: true,
        invitado: { select: { id: true, nombre: true } }
      }
    });

    if (!invitacion) {
      throw new HttpError(404, 'La invitación no existe o ya no está disponible');
    }

    if (invitacion.invitado_id !== userId) {
      throw new HttpError(403, 'Esta invitación no te pertenece');
    }

    if (invitacion.evento.estado !== 'ACTIVO') {
      throw new HttpError(400, 'La mesa ya fue cerrada');
    }

    // 1. Marcar invitación como ACEPTADA
    await prisma.invitacionMesa.update({
      where: { id: invitacionId },
      data: { estado: 'ACEPTADA' }
    });

    // 2. Sentar al comensal en la mesa si no está ya sentado
    let participante = await prisma.participante.findFirst({
      where: {
        evento_id: invitacion.evento_id,
        usuario_id: userId
      }
    });

    if (!participante) {
      participante = await prisma.participante.create({
        data: {
          evento_id: invitacion.evento_id,
          usuario_id: userId
        }
      });
    }

    // 3. Emitir WebSocket a la mesa para que todos vean al nuevo comensal
    broadcastTableUpdate(invitacion.evento_id, {
      action: 'COMENSAL_AGREGADO',
      detalles: {
        id: participante.id,
        nombre: invitacion.invitado.nombre
      }
    });

    res.status(200).json({
      success: true,
      message: `¡Te has sentado a la mesa "${invitacion.evento.nombre}"!`,
      data: {
        evento_id: invitacion.evento_id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitations/:id/reject
 * Rechaza la invitación a la mesa
 */
export const rechazarInvitacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitacionId = assertParamId(req.params.id, 'invitación');
    const userId = (req.user?.id || req.headers['x-user-id']) as string | undefined;

    if (!userId) {
      throw new HttpError(401, 'Debes iniciar sesión para responder a la invitación');
    }

    const invitacion = await prisma.invitacionMesa.findUnique({
      where: { id: invitacionId }
    });

    if (!invitacion) {
      throw new HttpError(404, 'La invitación no existe');
    }

    if (invitacion.invitado_id !== userId) {
      throw new HttpError(403, 'Esta invitación no te pertenece');
    }

    await prisma.invitacionMesa.update({
      where: { id: invitacionId },
      data: { estado: 'RECHAZADA' }
    });

    res.status(200).json({
      success: true,
      message: 'Invitación rechazada'
    });
  } catch (error) {
    next(error);
  }
};
