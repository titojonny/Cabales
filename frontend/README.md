# Cabales Frontend — Mobile-First React Client 🇸🇻

Frontend multiplataforma desarrollado en **React 19 + TypeScript + Vite**, optimizado para entornos móviles (PWA & Capacitor) con estética dark mode fresca inspirada en fintech moderna.

---

## 🎨 Paleta y Tokens de Diseño

| Token | Hex | Propósito |
|---|---|---|
| **Verde Cabales Primario** | `#4DBE55` | Acciones primarias, botones de confirmación, barras de conciliación |
| **Verde Menta / Éxito** | `#79ED91` | Saldado, saldos a favor (+ crédito), badges positivos |
| **Gris Oliva Pizarra** | `#71776D` | Bordes de tarjetas glassmorphism, chips inactivos, divisores |
| **Gris Plata / Neutro** | `#BEBEBE` | Tipografía secundaria, placeholders, íconos suaves |
| **Blanco Niebla** | `#F1F1F1` | Tipografía titular, cifras de montos destacados |
| **Rojo Alerta / Deuda** | `#EF4444` / `#F87171` | Deudas pendientes, estados no saldados, advertencias |
| **Fondo Oscuro** | `#171B16` | Background general de la aplicación |
| **Superficie de Tarjeta** | `#212620` | Superficies glassmorphism con `backdrop-filter: blur(16px)` |

---

## 📱 Capacidades Multiplataforma & Mobile-First

- **Diseño Mobile-First**: Look & feel idéntico a una app nativa con contenedor centrado en desktop y 100% de ancho en viewport móvil.
- **Teclado Virtual ATM (`MoneyInput`)**: Manejo directo de centavos enteros (`Int`) sin errores de punto flotante, con botones de acceso rápido (+$1, +$5, +$10, +$20).
- **Invitaciones con QR en Vivo**: Generación automática de QR para que amigos en la mesa se unan al instante.
- **Cobros por WhatsApp con 1 Toque**: Generador de mensaje formateado con transferencias mínimas y datos bancarios personalizados (BAC, Banco Agrícola, Chivo Wallet, etc.).
- **Subida y Visor de Comprobantes**: Drag & drop en desktop y acceso a la galería/cámara en dispositivos móviles para adjuntar screenshots de transferencias.
- **Capacitor Ready**: Preparado para compilación nativa en Android/iOS con `@capacitor/core`, `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard` y `@capacitor/status-bar`.

---

## 📁 Estructura del Proyecto

```
frontend/
├── public/                 # Favicon y assets estáticos
├── src/
│   ├── components/
│   │   └── common/         # MoneyInput, StatusBadge, ParticipantBadge, Modal
│   ├── context/            # AuthContext (cero fricción), ToastContext
│   ├── pages/              # DashboardPage, EventDetailPage, SettlementPage
│   ├── services/           # api.service.ts (cliente HTTP tipado con fetch)
│   ├── styles/             # index.css (tokens, resets, modales, animaciones)
│   ├── types/              # cabales.types.ts (contratos de dominio y API)
│   ├── utils/              # currency.ts, whatsapp.ts
│   ├── App.tsx             # Enrutador principal (React Router DOM)
│   ├── main.tsx            # Punto de entrada de React
│   └── vite-env.d.ts       # Tipado de Vite y variables de entorno
├── capacitor.config.ts     # Configuración para empaquetado móvil nativo
├── package.json
├── tsconfig.json
└── vite.config.ts          # Proxy reverso a la API en desarrollo
```

---

## 🚀 Comandos Rápidos

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con proxy a la API (http://localhost:5173)
npm run dev

# Compilar para producción (carpeta dist/)
npm run build

# Validar tipos de TypeScript
npm run typecheck
```

---

## 🔀 Guía para Separación en 2 Repositorios de Git

Este frontend ha sido diseñado de forma **100% desacoplada e independiente** del backend. En el momento en que se decida separarlo en dos repositorios de Git:

1. **Crear el nuevo repositorio remoto** (ej. `github.com/tu-organizacion/cabales-frontend`).
2. **Extraer el contenido de la carpeta `frontend/`** como la raíz del nuevo repositorio.
3. **Configurar la variable de entorno**:
   Crear un archivo `.env` en la raíz del frontend:
   ```env
   VITE_API_URL=https://api.tu-dominio.com/api
   ```
   *(En local, si se usa el proxy de Vite, no es necesario configurar nada)*.
4. **Hacer commit y push**. ¡Listo! No requiere ningún ajuste de código adicional.
