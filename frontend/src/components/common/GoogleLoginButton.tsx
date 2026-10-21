import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import { User, Plus, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  text?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  text = 'Continuar con Google',
  className = ''
}) => {
  const { loginWithGoogle, devLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!googleClientId) return;

    const loadGoogleScript = () => {
      if (document.getElementById('google-jssdk')) return;
      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 320,
            locale: 'es'
          });
        }
      } catch (e) {
        console.warn('Google Identity Services init notice:', e);
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      loadGoogleScript();
    }
  }, [googleClientId]);

  const handleGoogleResponse = async (response: any) => {
    if (!response.credential) return;
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error al iniciar sesión con Google:', err);
      alert(err.message || 'Error al autenticar con Google. Si tu app está en modo de prueba en Google Cloud, asegúrate de haber agregado tu correo a la lista de usuarios de prueba.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevGoogleLogin = async (email: string) => {
    setLoading(true);
    try {
      await devLogin(email);
      setShowDevModal(false);
      onSuccess?.();
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch {
        setShowDevModal(true);
      }
    } else {
      setShowDevModal(true);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '10px' }}>
        {/* Contenedor del botón oficial de Google */}
        <div
          ref={googleBtnContainerRef}
          style={{
            display: googleClientId ? 'flex' : 'none',
            justifyContent: 'center',
            width: '100%',
            minHeight: '44px'
          }}
        />

        {/* Botón personalizado de respaldo (visible si no hay client ID o si GIS está cargando) */}
        {(!googleClientId || !window.google?.accounts?.id) && (
          <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className={`btn-google ${className}`}
          >
            <svg
              className="btn-google-icon"
              viewBox="0 0 24 24"
              style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>

            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {loading ? 'Conectando con Google...' : text}
            </span>
          </button>
        )}

        {/* Acceso rápido al simulador de cuentas locales para desarrollo */}
        <button
          type="button"
          onClick={() => setShowDevModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--cabales-slate)',
            fontSize: '0.78rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '2px 8px',
            textDecoration: 'underline'
          }}
        >
          ¿Probar con simulador de cuentas locales?
        </button>
      </div>

      {/* Selector de cuenta simple, elegante y ordenado */}
      <Modal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        title="Acceder con Google"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cabales-gray)', lineHeight: 1.4 }}>
            Elige tu cuenta para ingresar a Cabales y sincronizar tus mesas:
          </p>

          {/* Cuenta principal (Jonathan) destacada y limpia */}
          <button
            type="button"
            onClick={() => handleDevGoogleLogin('adonayjonathan1028@gmail.com')}
            className="google-account-card"
            style={{
              border: '1.5px solid rgba(66, 133, 244, 0.45)',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.16) 0%, rgba(33, 38, 32, 0.9) 100%)',
              padding: '16px'
            }}
          >
            <div
              className="google-avatar"
              style={{ background: '#1A73E8', width: '46px', height: '46px', fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(26, 115, 232, 0.4)' }}
            >
              J
            </div>
            <div className="google-account-details">
              <span className="google-account-name" style={{ fontSize: '1rem' }}>Jonathan Adonay</span>
              <span className="google-account-email" style={{ fontSize: '0.82rem' }}>adonayjonathan1028@gmail.com</span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--cabales-green-primary)',
                color: '#141F14',
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0
              }}
            >
              Entrar ➔
            </div>
          </button>

          {/* Opción de usar otra cuenta o ver comensales de prueba */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cabales-gray)',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '8px 0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> Probar con otra cuenta de Google
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleDevGoogleLogin('laura.gomez@gmail.com')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--cabales-offwhite)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Laura Gómez
                </button>
                <button
                  type="button"
                  onClick={() => handleDevGoogleLogin('carlos.mendoza@gmail.com')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--cabales-offwhite)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Carlos Mendoza
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="otro.correo@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="cabales-input"
                  style={{ flex: 1, height: '40px', fontSize: '0.85rem' }}
                  autoFocus
                />
                <button
                  type="button"
                  disabled={!customEmail.trim() || loading}
                  onClick={() => handleDevGoogleLogin(customEmail.trim())}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0 14px', height: '40px', fontSize: '0.85rem' }}
                >
                  Entrar
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDevModal(false)}
            style={{
              marginTop: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--cabales-slate)',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </>
  );
};
