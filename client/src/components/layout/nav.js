import {
  LayoutDashboard, Users, KanbanSquare, CalendarDays, Mail, Workflow, FileText,
  Layers, Receipt, Star, BarChart3, UsersRound, Settings,
} from 'lucide-react';

export const NAV = [
  { section: 'Principal' },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contactos', label: 'Contactos', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { section: 'Marketing' },
  { to: '/email', label: 'Email Marketing', icon: Mail },
  { to: '/automatizaciones', label: 'Automatizaciones', icon: Workflow },
  { to: '/formularios', label: 'Formularios', icon: FileText },
  { to: '/funnels', label: 'Funnels / Landings', icon: Layers },
  { section: 'Negocio' },
  { to: '/facturacion', label: 'Facturación', icon: Receipt },
  { to: '/reputacion', label: 'Reputación', icon: Star },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { section: 'Administración' },
  { to: '/equipo', label: 'Equipo', icon: UsersRound, roles: ['admin', 'sales_manager'] },
  { to: '/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
];
