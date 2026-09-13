import { CheckCircle2 } from 'lucide-react';
import { NAV } from '../components/layout/nav.js';

const FEATURES = {
  '/contactos': ['Lista con búsqueda y filtros', 'Perfil completo con timeline y notas', 'Tags personalizables', 'Importar / exportar CSV'],
  '/pipeline': ['Tablero Kanban con drag & drop', 'Etapas configurables', 'Filtros por responsable, fecha y valor', 'Resumen de valor por etapa'],
  '/calendario': ['Vista semanal y mensual', 'Tipos de reunión y disponibilidad', 'Link público de reservas', 'Recordatorios automáticos por email'],
  '/email': ['Editor de bloques (texto, imagen, botón, separador)', 'Plantillas reutilizables', 'Envío a listas y segmentos', 'Tracking de aperturas y clics'],
  '/automatizaciones': ['Builder visual de flujos', 'Triggers: nuevo lead, cambio de etapa, formulario, tag, reunión', 'Acciones: email, tarea, etapa, tag, asignar, esperar, notificar', 'Condiciones si / entonces'],
  '/formularios': ['Builder drag & drop', 'Campos: texto, email, teléfono, dropdown, checkbox, rating, texto largo', 'Código para embeber', 'Los envíos crean contactos automáticamente'],
  '/funnels': ['Editor visual de landing pages', 'Hero, texto, imagen, formulario, video, testimonios, pricing, FAQ', 'Preview desktop / móvil', 'Cada página con su URL propia'],
  '/facturacion': ['Facturas con ítems y cantidades', 'Datos del cliente desde el CRM', 'Estados: borrador, enviada, pagada, vencida', 'Envío por email y resumen de ingresos'],
  '/reputacion': ['Links de reseñas (Google, Facebook...)', 'Campañas de solicitud de reseñas', 'Rating promedio y reseñas recientes', 'Flujo automático post-reunión'],
  '/reportes': ['Revenue por período', 'Tasa de conversión del pipeline', 'Leads por fuente y funnel visual', 'Métricas de email y exportación'],
  '/equipo': ['Invitación de usuarios', 'Roles: Admin, Sales Manager, Sales Rep, Support', 'Permisos por rol', 'Log de actividad por usuario'],
  '/configuracion': ['Datos del negocio y logo', 'Color principal', 'Integraciones y email (SMTP)', 'Campos personalizados'],
  '/perfil': ['Editar nombre y teléfono', 'Cambiar contraseña', 'Avatar'],
};

export default function ComingSoon({ path }) {
  const item = NAV.find((n) => n.to === path) || { label: 'Mi perfil', icon: CheckCircle2 };
  const Icon = item.icon;
  return (
    <div className="card coming-soon">
      <div className="big-icon"><Icon /></div>
      <h2 style={{ fontSize: 20 }}>{item.label}</h2>
      <p className="muted mt-2">Este módulo se construye en la próxima etapa. Lo que va a incluir:</p>
      <ul>
        {(FEATURES[path] || []).map((f) => <li key={f}><CheckCircle2 />{f}</li>)}
      </ul>
    </div>
  );
}
