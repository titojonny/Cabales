import { z } from 'zod';

// Regla de los Usuarios Fantasma: se envía el usuario de la app
// O el nombre del invitado, nunca ambos, nunca ninguno.
export const agregarParticipanteSchema = z
  .object({
    usuario_id: z.string().uuid('El ID de usuario debe ser un UUID válido').optional(),
    nombre_invitado: z.string().min(2, 'El nombre debe tener al menos 2 letras').max(100, 'El nombre es demasiado largo').optional(),
    codigo_amigo: z.string().min(3, 'El código o correo debe tener al menos 3 caracteres').max(150, 'El código es demasiado largo').optional()
  })
  .refine(
    (data) => [data.usuario_id, data.nombre_invitado, data.codigo_amigo].filter(Boolean).length === 1,
    {
      message: "Debes enviar exactamente uno: 'usuario_id', 'nombre_invitado' o 'codigo_amigo'.",
      path: ['usuario_id']
    }
  );

export const reclamarParticipanteSchema = z.object({
  usuario_id: z.string({ message: 'El usuario_id es obligatorio' }).uuid('El ID de usuario debe ser un UUID válido')
});