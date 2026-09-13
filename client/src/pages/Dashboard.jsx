import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, KanbanSquare, CalendarDays, CheckSquare, DollarSign, TrendingUp, TrendingDown,
  Mail, Workflow, FileText, Layers, Receipt, Star, BarChart3, UsersRound,
  UserPlus, Handshake, Trophy, ClipboardList, LogIn, Activity, Inbox, RefreshCw,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { formatCurrency, formatNumber, formatMonth, formatTime, formatDate, timeAgo, dueLabel } from '../utils/format.js';

const QUICK_LINKS = [
  { to: '/contactos', label: 'Contactos', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/email', label: 'Email', icon: Mail },
  { to: '/automatizaciones', label: 'Automatizaciones', icon: Workflow },
  { to: '/formularios', label: 'Formularios', icon: FileText },
  { to: '/funnels', label: 'Funnels', icon: Layers },
  { to: '/facturacion', label: 'Facturación', icon: Receipt },
  { to: '/reputacion', label: 'Reputación', icon: Star },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/equipo', label: 'Equipo', icon: UsersRound },
  { to: '/contactos?nuevo=1', label: 'Nuevo contacto', icon: UserPlus },
];

const ACTIVITY_ICONS = {
  contact: { icon: Users, color: 'var(--info)', bg: 'var(--info-soft)' },
  deal: { icon: Handshake, color: 'var(--purple)', bg: 'rgba(139,92,246,.14)' },
  won: { icon: Trophy, color: 'var(--success)', bg: 'var(--success-soft)' },
  task: { icon: ClipboardList, color: 'var(--warning)', bg: 'var(--warning-soft)' },
  appointment: { icon: CalendarDays, color: 'var(--primary)', bg: 'var(--primary-soft)' },
  user: { icon: LogIn, color: 'var(--text-muted)', bg: '#262626' },
  default: { icon: Activity, color: 'var(--text-muted)', bg: '#262626' },
};

const PRIORITY = {
  urgent: { label: 'Urgente', color: 'var(--danger)' },
  high: { label: 'Alta', color: 'var(--warning)' },
  medium: { label: 'Media', color: 'var(--info)' },
  low: { label: 'Baja', color: 'var(--text-faint)' },
};

function StatCard({ label, value, icon: Icon, color, foot, delta }) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" style={{ background: `${color}22`, color }}><Icon /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        {delta !== undefined && delta !== null && (
          <span className={`stat-delta ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? <TrendingUp size={13} style={{ verticalAlign: -2 }} /> : <TrendingDown size={13} style={{ verticalAlign: -2 }} />}
            {' '}{Math.abs(delta).toFixed(0)}%
          </span>
        )}
        <span>{foot}</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="fw-600" style={{ textTransform: 'capitalize' }}>{formatMonth(label)}</div>
      <div style={{ color: 'var(--primary)' }}>{formatCurrency(p.revenue)}</div>
      <div className="muted">{p.deals} {p.deals === 1 ? 'deal cerrado' : 'deals cerrados'}</div>
    </div>
  );
}

function StatsSkeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="card stat-card"><div className="skeleton" style={{ height: 14, width: '50%' }} /><div className="skeleton" style={{ height: 28, width: '40%' }} /><div className="skeleton" style={{ height: 12, width: '70%' }} /></div>
  ));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      setData(await api.get('/dashboard'));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const s = data?.summary;
  const currency = user?.currency || 'USD';
  const revenueDelta = s && s.revenue_prev_month > 0 ? ((s.revenue_month - s.revenue_prev_month) / s.revenue_prev_month) * 100 : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.name?.split(' ')[0];
  const openPipeline = (data?.pipeline || []).filter((st) => !st.is_won && !st.is_lost);
  const pipelineTotal = openPipeline.reduce((a, st) => a + st.value, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {firstName} 👋</h1>
          <p className="page-subtitle">Esto es lo que está pasando hoy en {user?.organization_name}.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Actualizar
          </button>
          <Link to="/pipeline?nuevo=1" className="btn btn-primary btn-sm"><KanbanSquare size={15} /> Nueva oportunidad</Link>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="stats-grid">
        {!s ? <StatsSkeleton /> : (
          <>
            <StatCard label="Contactos totales" value={formatNumber(s.total_contacts)} icon={Users} color="#0ea5e9"
              foot={`${s.new_contacts_month} nuevos este mes`} />
            <StatCard label="Deals activos" value={formatNumber(s.active_deals)} icon={KanbanSquare} color="#8b5cf6"
              foot={`${formatCurrency(s.active_deals_value, currency)} en pipeline`} />
            <StatCard label="Reuniones de hoy" value={formatNumber(s.meetings_today)} icon={CalendarDays} color="#3b82f6"
              foot={s.meetings_today ? 'Revisá tu agenda' : 'Sin reuniones hoy'} />
            <StatCard label="Tareas pendientes" value={formatNumber(s.pending_tasks)} icon={CheckSquare} color="#f59e0b"
              foot={s.overdue_tasks ? `${s.overdue_tasks} vencidas` : 'Todo al día'} />
            <StatCard label="Revenue del mes" value={formatCurrency(s.revenue_month, currency)} icon={DollarSign} color="#22c55e"
              delta={revenueDelta} foot={revenueDelta === null ? `${s.won_deals_month} deals ganados` : 'vs. mes anterior'} />
          </>
        )}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue últimos 6 meses</div>
              <div className="text-sm muted">Deals cerrados como ganados por mes</div>
            </div>
            <Link to="/reportes" className="card-link">Ver reportes</Link>
          </div>
          <div className="card-body" style={{ height: 300 }}>
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#262626" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fill: '#a3a3a3', fontSize: 12, textTransform: 'capitalize' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b6b6b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#333' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#rev)" dot={{ r: 3, fill: '#0f0f0f', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="skeleton" style={{ height: '100%' }} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Accesos rápidos</div></div>
          <div className="card-body">
            <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="quick-link"><span className="qi"><Icon /></span><span>{label}</span></Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid-3">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Actividad reciente</div>
            <Link to="/reportes" className="card-link">Ver todo</Link>
          </div>
          <div className="card-body">
            {!data ? <div className="skeleton" style={{ height: 200 }} /> : data.activity.length === 0 ? (
              <EmptyState icon={Inbox}>Todavía no hay actividad. Empezá creando un contacto.</EmptyState>
            ) : (
              <div className="list list-scroll">
                {data.activity.map((a) => {
                  const cfg = ACTIVITY_ICONS[a.action === 'won' ? 'won' : a.entity_type] || ACTIVITY_ICONS.default;
                  const Icon = cfg.icon;
                  return (
                    <div key={a.id} className="list-item">
                      <span className="activity-icon" style={{ background: cfg.bg, color: cfg.color }}><Icon /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{a.description}</div>
                        <div className="text-xs faint">{timeAgo(a.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Próximas reuniones</div>
              <Link to="/calendario" className="card-link">Calendario</Link>
            </div>
            <div className="card-body">
              {!data ? <div className="skeleton" style={{ height: 120 }} /> : data.meetings.length === 0 ? (
                <EmptyState icon={CalendarDays}>No hay reuniones próximas.</EmptyState>
              ) : (
                <div className="list">
                  {data.meetings.map((m) => {
                    const isToday = new Date(m.starts_at).toDateString() === new Date().toDateString();
                    return (
                      <div key={m.id} className="list-item" style={{ alignItems: 'center' }}>
                        <div className="meeting-time" style={{ borderColor: m.color || 'var(--border)' }}>
                          <b>{formatTime(m.starts_at)}</b>
                          <span>{isToday ? 'Hoy' : formatDate(m.starts_at)}</span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="fw-600 truncate" style={{ fontSize: 13 }}>{m.title}</div>
                          <div className="text-xs muted truncate">{m.company || m.contact_name || 'Sin contacto'} · {m.meeting_type || 'Reunión'}</div>
                        </div>
                        <Badge tone={m.status === 'confirmed' ? 'success' : 'info'}>{m.status === 'confirmed' ? 'Confirmada' : 'Agendada'}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Pipeline abierto</div>
              <Link to="/pipeline" className="card-link">Ver tablero</Link>
            </div>
            <div className="card-body">
              {!data ? <div className="skeleton" style={{ height: 100 }} /> : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="muted text-sm">Valor total</span>
                    <b>{formatCurrency(pipelineTotal, currency)}</b>
                  </div>
                  <div className="pipeline-bar">
                    {openPipeline.map((st) => (
                      <div key={st.id} title={`${st.name}: ${formatCurrency(st.value, currency)}`}
                        style={{ background: st.color, flex: Math.max(st.value, pipelineTotal ? 0 : 1), opacity: st.value ? 1 : 0.25 }} />
                    ))}
                  </div>
                  <div className="pipeline-legend">
                    {openPipeline.map((st) => (
                      <div key={st.id} className="pipeline-legend-item">
                        <span className="dot" style={{ background: st.color }} />
                        <span className="truncate">{st.name}</span>
                        <span className="val">{st.deals}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tareas pendientes</div>
            <Link to="/contactos" className="card-link">Ver todas</Link>
          </div>
          <div className="card-body">
            {!data ? <div className="skeleton" style={{ height: 200 }} /> : data.tasks.length === 0 ? (
              <EmptyState icon={CheckSquare}>Sin tareas pendientes. ¡Bien ahí!</EmptyState>
            ) : (
              <div className="list">
                {data.tasks.map((t) => {
                  const due = dueLabel(t.due_at);
                  const pr = PRIORITY[t.priority] || PRIORITY.medium;
                  return (
                    <div key={t.id} className="list-item">
                      <span className="task-check" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                        <div className="text-xs muted flex items-center gap-1" style={{ flexWrap: 'wrap' }}>
                          <span className="priority-dot" style={{ background: pr.color }} /> {pr.label}
                          {t.contact_name && <> · {t.contact_name}</>}
                          {t.assignee_name && <> · {t.assignee_name}</>}
                        </div>
                      </div>
                      <Badge tone={due.tone}>{due.text}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
