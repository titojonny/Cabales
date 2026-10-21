import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { registrarPagoSchema } from '../validators/pagos.js';
import { broadcastTableUpdate } from '../socket.js';

type CuerpoPago = z.infer<typeof registrarPagoSchema>;

// Registrar que un comensal pagó (suma a monto_pagado_centavos).
// Soporta pagos parciales: 3000 + 2000 acumulan sin necesidad de leer el total previo.
export const registrarPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventoId = req.evento!.id;
    const { participante_id, monto_centavos } = req.body as CuerpoPago;

    const participante = await prisma.participante.findFirst({
      where: { id: participante_id, evento_id: eventoId }
    });
    if (!participante) {
      throw new HttpError(400, 'El participante no pertenece a este evento');
    }

    const usuarioId = (req.user?.id || req.headers['x-user-id']) as string | undefined;
    if (usuarioId && req.evento!.creador_id !== usuarioId) {
      if (participante.usuario_id !== usuarioId) {
        throw new HttpError(403, 'Como comensal solo puedes registrar abonos a tu propia cuenta');
      }
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      return tx.participante.update({
        where: { id: participante_id },
        data: { monto_pagado_centavos: { increment: monto_centavos } }
      });
    });

    broadcastTableUpdate(eventoId, {
      action: 'ABONO_REGISTRADO',
      detalles: {
        participanteId: participante_id,
        monto_centavos,
        total_pagado: actualizado.monto_pagado_centavos
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pago registrado',
      data: actualizado
    });
  } catch (error) {
    next(error);
  }
};