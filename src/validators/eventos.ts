import { z } from 'zod';

export const crearEventoSchema = z.object({
  nombre: z
    .string({ message: 'El nombre es obligatorio' })
    .min(1, 'El nombre no puede estar vacío')
    .max(200, 'El nombre es demasiado largo'),
  creador_id: z.string({ message: 'El creador_id es obligatorio' }).uuid('El creador_id debe ser un UUID válido'),
  auto_incluir_creador: z.boolean().optional(),
});

