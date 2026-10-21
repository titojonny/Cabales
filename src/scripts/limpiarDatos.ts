import { prisma, pool } from '../config/prisma.js';

async function limpiar() {
  console.log('🧹 Limpiando registros de prueba...');
  try {
    await prisma.transaccion.deleteMany();
    await prisma.consumoParticipante.deleteMany();
    await prisma.consumo.deleteMany();
    await prisma.participante.deleteMany();
    await prisma.evento.deleteMany();
    await prisma.usuario.deleteMany();
    console.log('✅ Base de datos completamente limpia.');
  } catch (err) {
    console.error('❌ Error limpiando base de datos:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

limpiar();
