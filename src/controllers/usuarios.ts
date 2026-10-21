import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { assertParamId } from '../middlewares/assertParamId.js';
import { Prisma } from '@prisma/client';
import { crearUsuarioSchema } from '../validators/schemas.js';

type CuerpoUsuario = z.infer<typeof crearUsuarioSchema>;

// Crear un usuario nuevo
export const crearUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email } = req.body as CuerpoUsuario;

    const nuevoUsuario = await prisma.usuario.create({
      data: { nombre, email }
    });

    res.status(201).json({ success: true, message: 'Usuario creado', data: nuevoUsuario });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
      return;
    }
    next(error);
  }
};

// Listar todos los usuarios
export const listarUsuarios = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { fecha_registro: 'asc' }
    });
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
};

// Dashboard del usuario: sus salidas como creador o como invitado.
// El OR no duplica eventos: si es creador Y participante, sale una sola vez.
export const obtenerEventosDeUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioId = assertParamId(req.params.id, 'usuario');

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true }
    });
    if (!usuario) {
      throw new HttpError(404, 'El usuario no existe');
    }

    const eventos = await prisma.evento.findMany({
      where: {
        OR: [{ creador_id: usuarioId }, { participantes: { some: { usuario_id: usuarioId } } }]
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
        fecha: true,
        total_gastado_centavos: true,
        _count: { select: { participantes: true } },
        creador: { select: { id: true, nombre: true } },
        transacciones: { select: { estado: true } }
      },
      orderBy: { fecha: 'desc' }
    });

    const data = eventos.map((evento) => {
      const totalTx = evento.transacciones.length;
      const completadasTx = evento.transacciones.filter((t) => t.estado === 'COMPLETADO').length;
      const estaSaldado =
        evento.estado === 'CERRADO' && (totalTx === 0 || completadasTx === totalTx);

      return {
        id: evento.id,
        nombre: evento.nombre,
        estado: evento.estado,
        fecha: evento.fecha,
        total_gastado_centavos: evento.total_gastado_centavos,
        numero_comensales: evento._count.participantes,
        es_creador: evento.creador.id === usuarioId,
        creador: evento.creador,
        esta_saldado: estaSaldado,
        total_transacciones: totalTx,
        transacciones_completadas: completadasTx,
        transacciones_pendientes: totalTx - completadasTx
      };
    });

    res.status(200).json({ success: true, message: 'Eventos obtenidos', data });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id — Actualizar perfil de usuario (nombre o avatar)
export const actualizarUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioId = assertParamId(req.params.id, 'usuario');
    const { nombre, avatar_url, email } = req.body as { nombre?: string; avatar_url?: string; email?: string };

    const existe = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });
    if (!existe) {
      throw new HttpError(404, 'El usuario no existe');
    }

    const dataToUpdate: { nombre?: string; avatar_url?: string; email?: string } = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (avatar_url !== undefined) dataToUpdate.avatar_url = avatar_url;

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const yaExiste = await prisma.usuario.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: usuarioId }
        }
      });
      if (yaExiste) {
        throw new HttpError(409, 'Ya existe otro usuario registrado con este correo');
      }
      dataToUpdate.email = normalizedEmail;
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: dataToUpdate
    });

    res.status(200).json({
      success: true,
      message: 'Perfil de usuario actualizado exitosamente',
      data: actualizado
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id/financial-summary — Métricas y registro personal de gastos
export const obtenerResumenFinanciero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioId = assertParamId(req.params.id, 'usuario');

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nombre: true }
    });
    if (!usuario) {
      throw new HttpError(404, 'El usuario no existe');
    }

    // Participaciones del usuario con evento, deudas y créditos
    const participaciones = await prisma.participante.findMany({
      where: { usuario_id: usuarioId },
      include: {
        evento: {
          select: {
            id: true,
            nombre: true,
            fecha: true,
            estado: true
          }
        },
        deudas_a_cobrar: {
          where: {
            estado: { in: ['PENDIENTE', 'EN_REVISION', 'EN_DISPUTA'] }
          },
          include: {
            deudor: {
              include: {
                usuario: { select: { id: true, nombre: true } }
              }
            },
            evento: { select: { id: true, nombre: true } }
          }
        },
        deudas_a_pagar: {
          where: {
            estado: { in: ['PENDIENTE', 'EN_REVISION', 'EN_DISPUTA'] }
          },
          include: {
            acreedor: {
              include: {
                usuario: { select: { id: true, nombre: true } }
              }
            },
            evento: { select: { id: true, nombre: true } }
          }
        }
      }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalGastadoHistorico = 0;
    let totalGastadoMes = 0;
    let totalPorCobrar = 0;
    let totalPorPagar = 0;

    // Agrupación de deudores (quién me debe)
    const deudoresMap = new Map<string, {
      nombre: string;
      total_centavos: number;
      transacciones: Array<{
        transaccion_id: string;
        evento_id: string;
        evento_nombre: string;
        monto_centavos: number;
        estado: string;
      }>;
    }>();

    // Agrupación de acreedores (a quién le debo)
    const acreedoresMap = new Map<string, {
      nombre: string;
      total_centavos: number;
      transacciones: Array<{
        transaccion_id: string;
        evento_id: string;
        evento_nombre: string;
        monto_centavos: number;
        estado: string;
      }>;
    }>();

    for (const p of participaciones) {
      totalGastadoHistorico += p.monto_consumido_centavos;

      const fechaEv = new Date(p.evento.fecha);
      if (fechaEv.getMonth() === currentMonth && fechaEv.getFullYear() === currentYear) {
        totalGastadoMes += p.monto_consumido_centavos;
      }

      // Deudas que otros me deben (soy acreedor)
      for (const tx of p.deudas_a_cobrar) {
        totalPorCobrar += tx.monto_centavos;
        const nombreDeudor = tx.deudor.nombre_invitado || tx.deudor.usuario?.nombre || 'Amigo';
        const key = nombreDeudor.toLowerCase().trim();

        if (!deudoresMap.has(key)) {
          deudoresMap.set(key, {
            nombre: nombreDeudor,
            total_centavos: 0,
            transacciones: []
          });
        }

        const deudorEntry = deudoresMap.get(key)!;
        deudorEntry.total_centavos += tx.monto_centavos;
        deudorEntry.transacciones.push({
          transaccion_id: tx.id,
          evento_id: tx.evento.id,
          evento_nombre: tx.evento.nombre,
          monto_centavos: tx.monto_centavos,
          estado: tx.estado
        });
      }

      // Deudas que yo debo a otros (soy deudor)
      for (const tx of p.deudas_a_pagar) {
        totalPorPagar += tx.monto_centavos;
        const nombreAcreedor = tx.acreedor.nombre_invitado || tx.acreedor.usuario?.nombre || 'Amigo';
        const key = nombreAcreedor.toLowerCase().trim();

        if (!acreedoresMap.has(key)) {
          acreedoresMap.set(key, {
            nombre: nombreAcreedor,
            total_centavos: 0,
            transacciones: []
          });
        }

        const acreedorEntry = acreedoresMap.get(key)!;
        acreedorEntry.total_centavos += tx.monto_centavos;
        acreedorEntry.transacciones.push({
          transaccion_id: tx.id,
          evento_id: tx.evento.id,
          evento_nombre: tx.evento.nombre,
          monto_centavos: tx.monto_centavos,
          estado: tx.estado
        });
      }
    }

    const totalSalidas = participaciones.length;
    const ticketPromedio = totalSalidas > 0 ? Math.round(totalGastadoHistorico / totalSalidas) : 0;

    res.status(200).json({
      success: true,
      message: 'Resumen financiero obtenido exitosamente',
      data: {
        total_gastado_historico_centavos: totalGastadoHistorico,
        total_gastado_mes_centavos: totalGastadoMes,
        total_por_cobrar_centavos: totalPorCobrar,
        total_por_pagar_centavos: totalPorPagar,
        total_salidas: totalSalidas,
        ticket_promedio_centavos: ticketPromedio,
        quien_me_debe: Array.from(deudoresMap.values()),
        a_quien_le_debo: Array.from(acreedoresMap.values())
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/:id/claim-events — Asociar eventos creados como invitado local a la cuenta
export const reclamarEventosInvitado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioId = assertParamId(req.params.id, 'usuario');
    const { event_ids, guest_user_id } = req.body as { event_ids?: string[]; guest_user_id?: string };

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });
    if (!usuario) {
      throw new HttpError(404, 'El usuario no existe');
    }

    let eventosAsociados = 0;

    // 1. Migración global si se proporciona guest_user_id
    if (guest_user_id && guest_user_id !== usuarioId) {
      // Transferir mesas creadas por el invitado
      const actualizados = await prisma.evento.updateMany({
        where: { creador_id: guest_user_id },
        data: { creador_id: usuarioId }
      });
      eventosAsociados += actualizados.count;

      // Transferir participaciones del invitado
      const participacionesGuest = await prisma.participante.findMany({
        where: { usuario_id: guest_user_id }
      });

      for (const p of participacionesGuest) {
        const yaExiste = await prisma.participante.findFirst({
          where: { evento_id: p.evento_id, usuario_id: usuarioId }
        });
        if (!yaExiste) {
          await prisma.participante.update({
            where: { id: p.id },
            data: { usuario_id: usuarioId }
          });
        }
      }

      // Eliminar el usuario guest temporal si era @guest
      const guestUser = await prisma.usuario.findUnique({ where: { id: guest_user_id } });
      if (guestUser && guestUser.email.includes('@guest.cabales.app')) {
        const remainingEvents = await prisma.evento.count({ where: { creador_id: guest_user_id } });
        const remainingParts = await prisma.participante.count({ where: { usuario_id: guest_user_id } });
        if (remainingEvents === 0 && remainingParts === 0) {
          await prisma.usuario.delete({ where: { id: guest_user_id } }).catch(() => {});
        }
      }
    }

    // 2. Procesar lista de IDs específicos si se enviaron
    if (event_ids && Array.isArray(event_ids)) {
      for (const eventId of event_ids) {
        const evento = await prisma.evento.findUnique({
          where: { id: eventId },
          include: {
            creador: true,
            participantes: true
          }
        });

        if (!evento) continue;

        // Solo puede reclamar la titularidad si se acreditó que el usuario actual era el creador invitado (guest_user_id === evento.creador_id)
        const eraCreadorGuest =
          !!guest_user_id &&
          evento.creador_id === guest_user_id &&
          evento.creador.email.includes('@guest.cabales.app');

        if (eraCreadorGuest) {
          // El usuario toma la titularidad del evento que él mismo creó como invitado
          await prisma.evento.update({
            where: { id: eventId },
            data: { creador_id: usuarioId }
          });

          // Migrar el participante del creador invitado
          const participanteCreadorGuest = evento.participantes.find(
            (p) => p.usuario_id === evento.creador_id
          );

          if (participanteCreadorGuest) {
            await prisma.participante.update({
              where: { id: participanteCreadorGuest.id },
              data: { usuario_id: usuarioId }
            });
            eventosAsociados++;
            continue;
          }
        }

        // Si ya está sentado, no duplicar
        const yaParticipa = evento.participantes.some((p) => p.usuario_id === usuarioId);
        if (yaParticipa) {
          eventosAsociados++;
          continue;
        }

        // Si hay un invitado fantasma con su mismo nombre, vincularlo
        const coincidenciaFantasma = evento.participantes.find(
          (p) =>
            !p.usuario_id &&
            p.nombre_invitado &&
            p.nombre_invitado.trim().toLowerCase() === usuario.nombre.trim().toLowerCase()
        );

        if (coincidenciaFantasma) {
          await prisma.participante.update({
            where: { id: coincidenciaFantasma.id },
            data: {
              usuario_id: usuarioId,
              nombre_invitado: null
            }
          });
          eventosAsociados++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `${eventosAsociados} eventos sincronizados con tu cuenta`,
      data: { sincronizados: eventosAsociados }
    });
  } catch (error) {
    next(error);
  }
};

