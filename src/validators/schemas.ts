import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  nombre: z.string({ message: 'El nombre es obligatorio' }).min(1, 'El nombre no puede estar vacío').max(100, 'El nombre es demasiado largo'),
  email: z.string({ message: 'El email es obligatorio' }).email('El email no tiene un formato válido').max(254, 'El email es demasiado largo'),
});

export const crearEventoSchema = z.object({
  nombre: z.string({ message: 'El nombre es obligatorio' }).min(1, 'El nombre no puede estar vacío').max(200, 'El nombre es demasiado largo'),
  creador_id: z.string({ message: 'El creador_id es obligatorio' }).uuid('El creador_id debe ser un UUID válido'),
  auto_incluir_creador: z.boolean().optional(),
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío').max(100, 'El nombre es demasiado largo').optional(),
    avatar_url: z.string().url('El avatar_url debe ser una URL válida').optional(),
    email: z.string().email('El email no tiene un formato válido').max(254, 'El email es demasiado largo').optional()
  })
  .refine((data) => data.nombre !== undefined || data.avatar_url !== undefined || data.email !== undefined, {
    message: 'Debes proporcionar al menos un campo a actualizar'
  });

export const reclamarEventosSchema = z
  .object({
    event_ids: z.array(z.string().uuid('Cada event_id debe ser un UUID válido')).optional(),
    guest_user_id: z.string().uuid('El guest_user_id debe ser un UUID válido').optional()
  })
  .refine((data) => (data.event_ids && data.event_ids.length > 0) || !!data.guest_user_id, {
    message: 'Debes proporcionar event_ids o guest_user_id'
  });