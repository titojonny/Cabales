import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, ShieldAlert, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
            <Scale size={16} />
            <span>Condiciones Contractuales</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Términos y Condiciones de Uso
          </h1>
          <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', margin: 0 }}>
            Última actualización y entrada en vigor: Octubre de 2026
          </p>
        </div>

        {/* Alerta de Deslinde Financiero */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            marginBottom: '24px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(23, 27, 22, 0.95) 100%)',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start'
          }}
        >
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', color: '#fca5a5' }}>
              Deslinde Expreso de Responsabilidad Financiera
            </h2>
            <p style={{ color: 'var(--cabales-offwhite)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              <strong>Cabales es exclusivamente un software de cálculo y optimización matemática entre particulares.</strong> Cabales NO es un banco, ni una institución emisora de dinero electrónico, ni una casa de cambio, ni un custodio de fondos. <strong>Cabales no capta ni resguarda dinero en ningún momento.</strong> Las liquidaciones y pagos se realizan directa y privadamente entre los usuarios.
            </p>
          </div>
        </div>

        {/* Secciones Contractuales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sección 1 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              1. Aceptación de los Términos
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              Al ingresar, navegar, registrarse o utilizar la plataforma web o móvil <strong>Cabales</strong> (incluyendo el acceso mediante código QR o enlaces compartidos), usted declara ser mayor de edad o contar con la capacidad legal suficiente en su jurisdicción para celebrar acuerdos vinculantes y acepta sujetarse de forma irrevocable a estos Términos y Condiciones.
            </p>
          </section>

          {/* Sección 2 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              2. Naturaleza y Alcance del Servicio
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '10px' }}>
              Cabales proporciona una herramienta tecnológica cuyo fin es:
            </p>
            <ul style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Permitir que un grupo de comensales registre gastos compartidos en salidas, comidas o viajes.</li>
              <li>Calcular con precisión de centavos la deuda individual y el balance total.</li>
              <li>Sugerir rutas simplificadas de pago mutuo (algoritmo voraz de minimización de transacciones).</li>
              <li>Facilitar la redacción y envío de mensajes informativos a través de aplicaciones de mensajería como WhatsApp.</li>
            </ul>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.88rem', lineHeight: 1.5, marginTop: '12px', marginBottom: 0 }}>
              Cabales no actúa como garante, intermediario financiero ni cobrador compulsivo. Cualquier diferencia o disputa sobre el pago efectivo de una deuda compete de manera exclusiva a los participantes del evento.
            </p>
          </section>

          {/* Sección 3 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              3. Propiedad Intelectual, Marca y Derechos de Autor
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '10px' }}>
              Todos los derechos de propiedad intelectual, derechos de autor y signos distintivos pertenecen exclusivamente a sus creadores y desarrolladores originales:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--cabales-gray)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              <div>• <strong>Marca Comercial:</strong> El nombre <em>"Cabales"</em>, los logotipos, esquemas de color, eslóganes comerciales (<em>"Cuentas claras, amistades largas / cabales"</em>) y diseño de marca están protegidos legalmente.</div>
              <div>• <strong>Código y Software:</strong> El código fuente, compilado, frontend, backend, esquemas de base de datos, algoritmos de resolución y diseño de interfaz de usuario son obra protegida con todos los derechos reservados.</div>
              <div>• <strong>Prohibición Expresa:</strong> Queda terminantemente prohibida la copia no autorizada, clonación, ingeniería inversa, extracción masiva de datos (scraping) o creación de productos derivados con fines comerciales sin autorización escrita previa.</div>
            </div>
          </section>

          {/* Sección 4 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              4. Cuentas de Usuario y Modo Invitado
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 10px' }}>
              Los usuarios pueden participar a través de cuentas vinculadas a Google OAuth o como invitados con sesiones efímeras. Usted es el único responsable de:
            </p>
            <ul style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, paddingLeft: '20px' }}>
              <li>Mantener la confidencialidad de su cuenta y código de acceso.</li>
              <li>Ingresar montos y datos fidedignos en las mesas que administra o participa.</li>
              <li>No suplantar la identidad de otras personas ni subir contenidos ofensivos o ilícitos.</li>
            </ul>
          </section>

          {/* Sección 5 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              5. Limitación de Responsabilidad
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              El servicio se provee "tal cual" (<em>as is</em>) y "según disponibilidad". En la máxima medida permitida por las leyes aplicables, Cabales y su equipo de desarrollo no serán responsables por daños indirectos, pérdidas financieras derivadas de acuerdos informales incumplidos entre usuarios, errores de cálculo ocasionados por datos erróneos ingresados por los comensales o interrupciones temporales de servicio ajenas a su control directo.
            </p>
          </section>

          {/* Sección 6 */}
          <section className="glass-card" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--cabales-green-mint)' }}>
              6. Modificaciones y Ley Aplicable
            </h2>
            <p style={{ color: 'var(--cabales-gray)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              Cabales se reserva el derecho de modificar estos términos para adaptarlos a mejoras del servicio o requerimientos regulatorios. El uso continuado del servicio tras la publicación de cambios implicará su aceptación. Estos términos se rigen por las normas de derecho común y tratados internacionales de comercio electrónico y propiedad intelectual.
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
            style={{ background: 'transparent', border: 'none', color: 'var(--cabales-green-mint)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Términos y Condiciones
          </button>
          <span style={{ color: 'var(--cabales-slate)' }}>•</span>
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            style={{ background: 'transparent', border: 'none', color: 'var(--cabales-gray)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Política de Privacidad
          </button>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
