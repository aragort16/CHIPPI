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

## Puesta en marcha

```bash
# 1. Dependencias (instala server y client)
npm install

# 2. Variables de entorno
cp .env.example server/.env      # editar DATABASE_URL y JWT_SECRET

# 3. Base de datos (PostgreSQL debe estar corriendo)
createdb chippi                  # o crear la DB desde psql
npm run db:migrate               # aplica schema.sql
npm run db:seed                  # datos de demostración (opcional)

# 4. Desarrollo (API en :4000, cliente en :5173 con proxy a /api)
npm run dev
```

Usuario demo (creado por el seed): `admin@chippi.app` / `Chippi2024!`

Otros comandos:

- `npm run db:reset` — borra todo, re-aplica el esquema y vuelve a cargar el seed.
- `npm run build` — compila el cliente en `client/dist`; el servidor lo sirve automáticamente si existe (`npm start`).

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
