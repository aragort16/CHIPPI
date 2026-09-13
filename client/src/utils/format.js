export const formatCurrency = (value, currency = 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);

export const formatNumber = (value) => new Intl.NumberFormat('es-AR').format(Number(value) || 0);

export const formatDate = (date, opts = {}) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', ...opts }).format(new Date(date));

export const formatTime = (date) =>
  new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(date));

export const formatMonth = (yyyyMm) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '');
};

export function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (diff < 60) return 'hace instantes';
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
  if (diff < 86400 * 30) return rtf.format(-Math.floor(diff / 86400), 'day');
  return formatDate(date, { year: 'numeric' });
}

export function dueLabel(date) {
  if (!date) return { text: 'Sin fecha', tone: 'muted' };
  const d = new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return { text: `Vencida · ${formatDate(d)}`, tone: 'danger' };
  if (days === 0) return { text: 'Hoy', tone: 'warning' };
  if (days === 1) return { text: 'Mañana', tone: 'info' };
  return { text: formatDate(d), tone: 'muted' };
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
