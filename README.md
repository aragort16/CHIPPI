# Chippi CRM

CRM + IA + Automatización, estilo GoHighLevel, para talleres de servicio y concesionarios.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20+, Express 4, PostgreSQL (`pg`), JWT, bcrypt, zod |
| Frontend | React 18, Vite, React Router, Recharts, lucide-react |
| Base de datos | PostgreSQL 14+ (esquema en `server/src/db/schema.sql`) |

## Estructura

```
CHIPPI/
├── server/                 # API REST (Express)
│   ├── .env                # variables sensibles (no se commitea)
│   └── src/
│       ├── index.js        # arranque del servidor
│       ├── app.js          # configuración de Express (middlewares, rutas, estáticos)
│       ├── config/         # env.js (variables), db.js (pool de PostgreSQL)
│       ├── middleware/     # auth (JWT + roles), validate (zod), errorHandler
│       ├── routes/         # definición de endpoints por módulo
│       ├── controllers/    # reciben la request, responden
│       ├── services/       # lógica de negocio y consultas SQL
│       ├── db/             # schema.sql, migrate.js, seed.js
│       └── utils/          # errores, asyncHandler
└── client/                 # SPA (React + Vite)
    ├── public/             # logo.svg, favicon
    └── src/
        ├── api/            # cliente HTTP con token
        ├── context/        # AuthContext (sesión)
        ├── components/     # layout (Sidebar, Topbar) y ui (Avatar, Badge...)
        ├── pages/          # Login, Register, Dashboard, módulos
        ├── hooks/          # useForm
        ├── styles/         # global.css (tema oscuro)
        └── utils/          # formato de moneda, fechas
```

## Instalación paso a paso (Windows / Mac)

> Los comandos se escriben en una **terminal del sistema**, no en la ventana de Node (la que muestra `>`).
> - **Windows**: abrí el menú Inicio, escribí `PowerShell` y abrilo.
> - **Mac**: abrí `Terminal` (Aplicaciones → Utilidades → Terminal).

**1. Instalar los dos programas necesarios (una sola vez)**

- Node.js 20 o superior: https://nodejs.org (botón "LTS", siguiente-siguiente-instalar).
- PostgreSQL 14 o superior: https://www.postgresql.org/download/ (instalador oficial). Durante la instalación te pide una **contraseña para el usuario `postgres`**: anotala, la vas a necesitar.

**2. Descomprimir el proyecto y entrar a la carpeta desde la terminal**

```powershell
cd Desktop\chippi-crm        # Windows (ajustá la ruta a donde lo descomprimiste)
cd ~/Desktop/chippi-crm       # Mac
```

**3. Instalar dependencias**

```bash
npm install
```

**4. Configurar**

```bash
npm run setup
```

Esto crea el archivo `server/.env`, crea la base de datos `chippi` y carga datos de ejemplo.
Si falla con *"Usuario o contraseña incorrectos"*: abrí `server/.env` con el Bloc de notas, y en la línea `DATABASE_URL` reemplazá el segundo `postgres` por la contraseña que elegiste al instalar PostgreSQL:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/chippi
```

Guardá y volvé a correr `npm run setup`.

**5. Arrancar**

```bash
npm run dev
```

Abrí http://localhost:5173 en el navegador. Usuario demo: `admin@chippi.app` / `Chippi2024!`.
Para detener la app: `Ctrl + C` en la terminal.

### Otros comandos

- `npm run db:reset` — borra todo, re-aplica el esquema y vuelve a cargar el seed.
- `npm run db:migrate` / `npm run db:seed` — pasos individuales del setup.
- `npm run build` — compila el cliente en `client/dist`; `npm start` sirve API y cliente juntos en el puerto 4000 (producción).

## API (hasta ahora)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/register` | Crea organización + usuario admin (con pipeline, tags y tipos de reunión por defecto) |
| POST | `/api/auth/login` | Devuelve `{ user, token }` |
| GET | `/api/auth/me` | Usuario actual (requiere `Authorization: Bearer <token>`) |
| PATCH | `/api/auth/me` | Actualiza nombre / teléfono / avatar |
| POST | `/api/auth/change-password` | Cambio de contraseña |
| GET | `/api/dashboard` | Métricas, revenue 6 meses, actividad, reuniones, tareas, pipeline |

## Roles

`admin`, `sales_manager`, `sales_rep`, `support`. Se restringen rutas con `requireRole('admin', ...)`.

## Módulos

- [x] Estructura, servidor, esquema de base de datos
- [x] Autenticación (registro + login, JWT, bcrypt)
- [x] Dashboard principal
- [ ] Contactos
- [ ] Pipeline (Kanban)
- [ ] Calendario y reservas
- [ ] Email marketing
- [ ] Automatizaciones
- [ ] Formularios
- [ ] Funnels / landing pages
- [ ] Facturación
- [ ] Reputación
- [ ] Reportes
- [ ] Equipo
