import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, CreditCard, Sparkles, CheckCircle, Database } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior con navegación */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="btn-icon"
            style={{ width: '36px', height: '36px' }}
            aria-label="Regresar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="brand-logo" style={{ fontSize: '1.2rem' }}>
            <span>Cabales</span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '24px 16px 60px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        {/* Cabecera del documento */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="brand-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              marginBottom: '12px'
            }}
          >
            <ShieldCheck size={16} />
            <span>Documento Legal Oficial</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Política de Privacidad
          </h1>
          <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', margin: 0 }}>
            Última actualización y entrada en vigor: Octubre de 2026
          </p>
        </div>

        {/* Alerta Destacada: Cero almacenamiento de tarjetas */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            marginBottom: '24px',
            border: '1px solid rgba(77, 190, 85, 0.4)',
            background: 'linear-gradient(135deg, rgba(77, 190, 85, 0.12) 0%, rgba(23, 27, 22, 0.95) 100%)',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start'
          }}
        >
          <div
            style={{
              background: 'rgba(77, 190, 85, 0.2)',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--cabales-green-mint)',
              flexShrink: 0
            }}
          >
            <CreditCard size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--cabales-green-mint)' }}>
              Compromiso de Cero Almacenamiento de Tarjetas Bancarias
            </h2>
            <p style={{ color: 'var(--cabales-offwhite)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              <strong>Cabales NUNCA solicita, procesa, transmite ni almacena números de tarjeta de crédito o débito, códigos de seguridad (CVV) ni contraseñas bancarias en sus servidores.</strong> Las transferencias y liquidaciones de cuentas se ejecutan de manera privada e independiente entre los participantes.
            </p>
          </div>
        </div>

        {/* Secciones Legales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sección 1 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              1. Responsable del Tratamiento y Objeto
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              La plataforma web y aplicación móvil <strong>Cabales</strong> (accesible a través de <code>cabales.vercel.app</code>) es una solución tecnológica diseñada exclusivamente para facilitar el registro de consumos compartidos, la división equitativa de cuentas grupales y la sugerencia de rutas óptimas de liquidación entre amigos y conocidos. El tratamiento de cualquier dato personal se rige bajo los principios de licitud, consentimiento, proporcionalidad y seguridad.
            </p>
          </section>

          {/* Sección 2 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              2. Información que Recopilamos
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '12px' }}>
              Operamos bajo una política de minimización de datos. Solo recopilamos los datos estrictamente necesarios para el funcionamiento de las mesas:
            </p>
            <ul style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong style={{ color: '#fff' }}>Datos de perfil de usuario:</strong> Nombre o alias público, dirección de correo electrónico y fotografía de perfil (obtenidos de forma segura mediante el consentimiento explícito de autenticación con Google OAuth o registro directo).
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Modo Invitado / Cuentas temporales:</strong> Si ingresas como invitado sin registro, únicamente se genera un identificador local y un código aleatorio de acceso temporal.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Datos de mesas y eventos:</strong> Nombres de las mesas creadas, desglose de consumos o platillos ingresados y montos correspondientes en centavos.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Comprobantes de transferencia:</strong> Si un participante sube voluntariamente una imagen de comprobante de pago para validar una deuda saldada, dicha imagen se resguarda de forma segura y restringida al evento en cuestión.
              </li>
            </ul>
          </section>

          {/* Sección 3 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              3. Finalidad del Tratamiento de los Datos
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '10px' }}>
              Los datos recopilados se utilizan exclusivamente para:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {[
                'Calcular las porciones de pago exactas mediante nuestro algoritmo de liquidación voraz.',
                'Permitir que los participantes de una mesa visualicen el balance grupal en tiempo real.',
                'Generar enlaces directos de cobro y recordatorios a través de WhatsApp.',
                'Garantizar la seguridad, prevenir accesos no autorizados y auditar la integridad de las sesiones.'
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle size={16} color="var(--cabales-green-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem', lineHeight: 1.5, marginTop: '12px', marginBottom: 0 }}>
              <strong>Bajo ninguna circunstancia vendemos, alquilamos ni transferimos sus datos personales a agencias de publicidad o entidades comerciales de terceros.</strong>
            </p>
          </section>

          {/* Sección 4 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              4. Ciberseguridad y Protección Técnica
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 12px' }}>
              Cabales implementa controles técnicos e infraestructurales acordes a las mejores prácticas de la industria:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={18} color="var(--cabales-green-primary)" />
                <span style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem' }}>
                  <strong>Cifrado en tránsito:</strong> Todo el tráfico hacia y desde Cabales está protegido bajo protocolo HTTPS con certificados TLS de 256 bits.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color="var(--cabales-green-primary)" />
                <span style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem' }}>
                  <strong>Autenticación Criptográfica:</strong> Las sesiones utilizan JSON Web Tokens (JWT) firmados con algoritmos HMAC-SHA256 y secretos de entropía extendida.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={18} color="var(--cabales-green-primary)" />
                <span style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem' }}>
                  <strong>Base de Datos Blindada:</strong> Almacenamiento en entornos aislados con consultas parametrizadas (0% de inyección SQL) y limitación de tasa contra ataques de fuerza bruta.
                </span>
              </div>
            </div>
          </section>

          {/* Sección 5 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              5. Declaración de Inteligencia Artificial y Tecnologías de Terceros
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 10px' }}>
              En cumplimiento de los estándares internacionales de transparencia tecnológica:
            </p>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              Cabales no entrena modelos públicos de inteligencia artificial con la información financiera o privada de los usuarios. Cualquier herramienta o servicio de automatización integrado a la plataforma se ejecuta bajo acuerdos de privacidad empresarial que prohíben la retención o el uso de los datos del usuario para el entrenamiento de modelos de terceros.
            </p>
          </section>

          {/* Sección 6 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              6. Derechos del Usuario (Acceso, Rectificación y Eliminación)
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 10px' }}>
              Todo usuario tiene el derecho inalienable de:
            </p>
            <ul style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 12px', paddingLeft: '20px' }}>
              <li>Consultar en cualquier momento las mesas y saldos asociados a su perfil.</li>
              <li>Actualizar su nombre público o datos informativos de cobro (banco/alias de transferencia).</li>
              <li>Eliminar o cerrar las mesas de las cuales sea creador o administrador.</li>
              <li>Solicitar la eliminación definitiva e irreversible de su cuenta y todos sus registros asociados.</li>
            </ul>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              Para ejercer cualquiera de estos derechos, puedes utilizar los controles dentro de tu perfil en la aplicación o contactar al equipo a través de los canales oficiales del proyecto.
            </p>
          </section>
        </div>

        {/* Botón de regreso inferior */}
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '0.92rem' }}
          >
            <ArrowLeft size={16} />
            <span>Volver a Cabales</span>
          </button>
        </div>
      </main>

      {/* Footer legal */}
      <footer style={{ borderTop: '1px solid rgba(113, 119, 109, 0.25)', padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--cabales-slate)', fontSize: '0.8rem', margin: '0 0 6px' }}>
          © 2026 Cabales. Todos los derechos reservados.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/terms')}
            style={{ background: 'transparent', border: 'none', color: 'var(--cabales-gray)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Términos y Condiciones
          </button>
          <span style={{ color: 'var(--cabales-slate)' }}>•</span>
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            style={{ background: 'transparent', border: 'none', color: 'var(--cabales-green-mint)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Política de Privacidad
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
