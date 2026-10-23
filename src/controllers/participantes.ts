import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { assertParamId } from '../middlewares/assertParamId.js';
import { agregarParticipanteSchema } from '../validators/participantes.js';
import { broadcastTableUpdate, broadcastUserInvite } from '../socket.js';

type CuerpoParticipante = z.infer<typeof agregarParticipanteSchema>;

// Agregar un comensal a la mesa (invitado fantasma sin cuenta, unirse uno mismo, o invitar por código de amigo)
export const agregarParticipante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const evento_id = req.evento!.id;
    const { usuario_id, nombre_invitado, codigo_amigo } = req.body as CuerpoParticipante;
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    const usuarioId = (req.user?.id || headerUserId);

    // Regla de Permisos de Mesa:
    // Para agregar o invitar comensales, el solicitante debe pertenecer a la mesa:
    // 1. Ser el organizador (por ID directo o coincidencia de correo)
    // 2. O ser un comensal ya sentado en esta mesa
    // 3. O ser un auto-ingreso vía QR/enlace (isSelfJoin)
    const isSelfJoin = !!usuario_id && usuario_id === usuarioId;
    if (usuarioId && !isSelfJoin) {
      const isCreadorDirecto =
        req.evento!.creador_id === usuarioId ||
        (!!headerUserId && req.evento!.creador_id === headerUserId);
      const isCreadorPorEmail =
        !!req.user?.email &&
        !!req.evento?.creador?.email &&
        req.user.email.toLowerCase() === req.evento.creador.email.toLowerCase();

      let isComensalMesa = false;
      if (!isCreadorDirecto && !isCreadorPorEmail) {
        const comensal = await prisma.participante.findFirst({
          where: {
            evento_id,
            OR: [
              { usuario_id: usuarioId },
              ...(headerUserId ? [{ usuario_id: headerUserId }] : [])
            ]
          }
        });
        isComensalMesa = !!comensal;
      }

      if (!isCreadorDirecto && !isCreadorPorEmail && !isComensalMesa) {
        throw new HttpError(403, 'Debes ser parte de la mesa o su organizador para invitar comensales');
      }
    }

    // Si el usuario se sienta a sí mismo (vía QR / enlace directo o aceptando invitación)
    if (isSelfJoin && usuarioId) {
      try {
        const invitacionValida = await prisma.invitacionMesa.findUnique({
          where: {
            evento_id_invitado_id: {
              evento_id,
              invitado_id: usuarioId
            }
          }
        });

        if (invitacionValida && invitacionValida.estado === 'PENDIENTE') {
          await prisma.invitacionMesa.update({
            where: { id: invitacionValida.id },
            data: { estado: 'ACEPTADA' }
          });
        }
      } catch {}
    }

    // FLUJO 1: Invitación a amigo registrado mediante CÓDIGO DE AMIGO (8 caracteres)
    if (codigo_amigo) {
      const query = codigo_amigo.trim().toLowerCase();
      if (query.length < 6) {
        throw new HttpError(400, 'El código de amigo debe tener 8 caracteres');
      }

      // Buscar por ID exacto o prefijo de ID (código de 8 caracteres del usuario)
      const amigo = await prisma.usuario.findFirst({
        where: {
          OR: [
            { id: query },
            { id: { startsWith: query } }
          ]
        }
      });

      if (!amigo) {
        throw new HttpError(
          404,
          `No se encontró ningún usuario registrado con el código de amigo "${codigo_amigo.trim().toUpperCase()}"`
        );
      }

      // Evitar invitarse a uno mismo
      if (usuarioId && amigo.id === usuarioId) {
        throw new HttpError(400, 'Ya eres parte de esta mesa, no puedes invitarte a ti mismo.');
      }

      // Verificar si ya está sentado en la mesa
      const yaSentado = await prisma.participante.findFirst({
        where: { evento_id, usuario_id: amigo.id }
      });
      if (yaSentado) {
        throw new HttpError(409, `${amigo.nombre} ya está sentado en la mesa`);
      }

      // Verificar si ya tiene invitación pendiente
      const invitacionExistente = await prisma.invitacionMesa.findUnique({
        where: {
          evento_id_invitado_id: {
            evento_id,
            invitado_id: amigo.id
          }
        }
      });

      if (invitacionExistente && invitacionExistente.estado === 'PENDIENTE') {
        throw new HttpError(409, `Ya le enviaste una invitación a ${amigo.nombre}. Está pendiente de aceptar.`);
      }

      // Crear o reactivar la invitación
      const anfitrionId = usuarioId || req.evento!.creador_id;
      const anfitrion = await prisma.usuario.findUnique({ where: { id: anfitrionId } });

      const invitacion = await prisma.invitacionMesa.upsert({
        where: {
          evento_id_invitado_id: {
            evento_id,
            invitado_id: amigo.id
          }
        },
        update: {
          estado: 'PENDIENTE',
          anfitrion_id: anfitrionId
        },
        create: {
          evento_id,
          anfitrion_id: anfitrionId,
          invitado_id: amigo.id,
          estado: 'PENDIENTE'
        }
      });

      // Emitir notificación en vivo vía WebSockets al invitado
      broadcastUserInvite(amigo.id, {
        type: 'INVITACION_MESA',
        invitacion: {
          id: invitacion.id,
          evento_id,
          nombre_mesa: req.evento!.nombre,
          anfitrion_nombre: anfitrion?.nombre || 'El anfitrión',
          creado_en: invitacion.creado_en
        }
      });

      res.status(200).json({
        success: true,
        message: `Invitación enviada a ${amigo.nombre}. Le aparecerá una notificación para unirse a la mesa.`,
        data: {
          invitacion_id: invitacion.id,
          invitado_nombre: amigo.nombre,
          tipo: 'INVITACION_PENDIENTE'
        }
      });
      return;
    }

    // FLUJO 2: Comensal invitado sin cuenta (fantasma) o Auto-reclamo por QR
    let targetUserId: string | null = usuario_id ?? null;

    // 1. Evitar que el mismo usuario registrado se siente dos veces
    if (targetUserId) {
      const existe = await prisma.participante.findFirst({
        where: { evento_id, usuario_id: targetUserId }
      });
      if (existe) {
        throw new HttpError(409, 'Este usuario ya está sentado en la mesa');
      }
    }

    // 2. Sentar al comensal en la tabla pivote
    const nuevoParticipante = await prisma.participante.create({
      data: {
        evento_id,
        usuario_id: targetUserId,
        nombre_invitado: targetUserId ? null : (nombre_invitado ?? null)
      },
      include: {
        usuario: { select: { id: true, nombre: true, avatar_url: true } }
      }
    });

    broadcastTableUpdate(evento_id, {
      action: 'COMENSAL_AGREGADO',
      detalles: {
        id: nuevoParticipante.id,
        nombre: nuevoParticipante.usuario?.nombre || nuevoParticipante.nombre_invitado || 'Invitado'
      }
    });

    res.status(201).json({
      success: true,
      message: targetUserId ? 'Usuario agregado a la mesa' : 'Invitado fantasma agregado',
      data: nuevoParticipante
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id/participants/:participantId/claim
export const reclamarParticipante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventoId = req.evento!.id;
    const { usuario_id } = req.body as { usuario_id: string };
    const participanteId = assertParamId(req.params.participantId, 'participante');

    // 1. Verificar que el usuario exista
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuario_id }
    });
    if (!usuario) {
      throw new HttpError(404, 'El usuario que intenta reclamar el lugar no existe');
    }

    // 2. Verificar que el participante exista y pertenezca al evento
    const participante = await prisma.participante.findFirst({
      where: { id: participanteId, evento_id: eventoId },
      include: { usuario: { select: { id: true, nombre: true, avatar_url: true } } }
    });

    if (!participante) {
      throw new HttpError(404, 'El comensal no existe en esta mesa');
    }

    // Si ya está asignado al mismo usuario, es idempotente
    if (participante.usuario_id === usuario_id) {
      res.status(200).json({
        success: true,
        message: 'Este lugar ya está asignado a tu usuario',
        data: participante
      });
      return;
    }

    // Si ya está asignado a otro usuario registrado
    if (participante.usuario_id && participante.usuario_id !== usuario_id) {
      throw new HttpError(409, 'Este lugar ya ha sido reclamado por otro usuario registrado');
    }

    // 3. Evitar que el usuario ya tenga otro asiento en esta misma mesa
    const yaEstaEnMesa = await prisma.participante.findFirst({
      where: { evento_id: eventoId, usuario_id }
    });
    if (yaEstaEnMesa) {
      throw new HttpError(409, 'Ya tienes otro lugar asignado en esta mesa');
    }

    // 4. Vincular el participante al usuario
    const actualizado = await prisma.participante.update({
      where: { id: participanteId },
      data: {
        usuario_id
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, avatar_url: true }
        }
      }
    });

    broadcastTableUpdate(eventoId, {
      action: 'COMENSAL_AGREGADO',
      detalles: {
        id: actualizado.id,
        nombre: actualizado.usuario?.nombre || 'Comensal'
      }
    });

    res.status(200).json({
      success: true,
      message: '¡Lugar reclamado exitosamente!',
      data: actualizado
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id/participants/:participantId — Solo Organizador
export const eliminarParticipante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventoId = req.evento!.id;
    const participanteId = assertParamId(req.params.participantId, 'participante');
    const usuarioId = (req.user?.id || req.headers['x-user-id']) as string | undefined;

    const isCreadorDirecto = req.evento!.creador_id === usuarioId;
    const isCreadorPorEmail =
      !!req.user?.email &&
      !!req.evento?.creador?.email &&
      req.user.email.toLowerCase() === req.evento.creador.email.toLowerCase();

    if (usuarioId && !isCreadorDirecto && !isCreadorPorEmail) {
      throw new HttpError(403, 'Solo el organizador de la mesa puede eliminar comensales');
    }

    const participante = await prisma.participante.findFirst({
      where: { id: participanteId, evento_id: eventoId }
    });

    if (!participante) {
      throw new HttpError(404, 'El comensal no existe en esta mesa');
    }

    if (participante.usuario_id === req.evento!.creador_id) {
      throw new HttpError(400, 'No puedes eliminar al organizador de la mesa');
    }

    const tieneConsumos = await prisma.consumoParticipante.count({
      where: { participante_id: participanteId }
    });

    if (tieneConsumos > 0 || participante.monto_consumido_centavos > 0 || participante.monto_pagado_centavos > 0) {
      throw new HttpError(400, 'No puedes eliminar un comensal que ya tiene consumos o abonos registrados.');
    }

    await prisma.participante.delete({
      where: { id: participanteId }
    });

    // Revocar cualquier invitación para que el usuario eliminado no pueda volver a sentarse sin nueva invitación
    if (participante.usuario_id) {
      await prisma.invitacionMesa.deleteMany({
        where: {
          evento_id: eventoId,
          invitado_id: participante.usuario_id
        }
      });
    }

    broadcastTableUpdate(eventoId, {
      action: 'COMENSAL_ELIMINADO',
      detalles: { id: participanteId }
    });

    res.status(200).json({
      success: true,
      message: 'Comensal eliminado de la mesa'
    });
  } catch (error) {
    next(error);
  }
};