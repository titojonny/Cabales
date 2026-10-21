-- CreateEnum
CREATE TYPE "EstadoInvitacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "google_id" TEXT;

-- CreateTable
CREATE TABLE "InvitacionMesa" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "anfitrion_id" TEXT NOT NULL,
    "invitado_id" TEXT NOT NULL,
    "estado" "EstadoInvitacion" NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitacionMesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvitacionMesa_invitado_id_estado_idx" ON "InvitacionMesa"("invitado_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionMesa_evento_id_invitado_id_key" ON "InvitacionMesa"("evento_id", "invitado_id");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_google_id_key" ON "Usuario"("google_id");

-- AddForeignKey
ALTER TABLE "InvitacionMesa" ADD CONSTRAINT "InvitacionMesa_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitacionMesa" ADD CONSTRAINT "InvitacionMesa_anfitrion_id_fkey" FOREIGN KEY ("anfitrion_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitacionMesa" ADD CONSTRAINT "InvitacionMesa_invitado_id_fkey" FOREIGN KEY ("invitado_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
