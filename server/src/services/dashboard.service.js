import { query } from '../config/db.js';

/**
 * Métricas principales del dashboard.
 * Revenue = valor de deals ganados (closed_at) en el período. Cuando esté el módulo
 * de facturación también se podrá medir por facturas pagadas.
 */
export async function getSummary(organizationId) {
  const { rows } = await query(
    `SELECT
       (SELECT count(*) FROM contacts WHERE organization_id = $1)::int AS total_contacts,
       (SELECT count(*) FROM contacts WHERE organization_id = $1
          AND created_at >= date_trunc('month', now()))::int AS new_contacts_month,
       (SELECT count(*) FROM deals WHERE organization_id = $1 AND status = 'open')::int AS active_deals,
       (SELECT coalesce(sum(value),0) FROM deals WHERE organization_id = $1 AND status = 'open')::float AS active_deals_value,
       (SELECT count(*) FROM appointments WHERE organization_id = $1
          AND status IN ('scheduled','confirmed')
          AND starts_at::date = CURRENT_DATE)::int AS meetings_today,
       (SELECT count(*) FROM tasks WHERE organization_id = $1 AND status IN ('pending','in_progress'))::int AS pending_tasks,
       (SELECT count(*) FROM tasks WHERE organization_id = $1 AND status IN ('pending','in_progress')
          AND due_at < now())::int AS overdue_tasks,
       (SELECT coalesce(sum(value),0) FROM deals WHERE organization_id = $1 AND status = 'won'
          AND closed_at >= date_trunc('month', now()))::float AS revenue_month,
       (SELECT coalesce(sum(value),0) FROM deals WHERE organization_id = $1 AND status = 'won'
          AND closed_at >= date_trunc('month', now()) - interval '1 month'
          AND closed_at <  date_trunc('month', now()))::float AS revenue_prev_month,
       (SELECT count(*) FROM deals WHERE organization_id = $1 AND status = 'won'
          AND closed_at >= date_trunc('month', now()))::int AS won_deals_month`,
    [organizationId],
  );
  return rows[0];
}

/** Revenue mensual de los últimos 6 meses (incluye meses en 0). */
export async function getRevenueByMonth(organizationId, months = 6) {
  const { rows } = await query(
    `WITH meses AS (
       SELECT generate_series(
         date_trunc('month', now()) - ($2::int - 1) * interval '1 month',
         date_trunc('month', now()),
         interval '1 month'
       ) AS mes
     )
     SELECT to_char(m.mes, 'YYYY-MM') AS month,
            coalesce(sum(d.value), 0)::float AS revenue,
            count(d.id)::int AS deals
       FROM meses m
       LEFT JOIN deals d
         ON d.organization_id = $1 AND d.status = 'won'
        AND date_trunc('month', d.closed_at) = m.mes
      GROUP BY m.mes ORDER BY m.mes`,
    [organizationId, months],
  );
  return rows;
}

export async function getRecentActivity(organizationId, limit = 15) {
  const { rows } = await query(
    `SELECT a.id, a.entity_type, a.entity_id, a.action, a.description, a.metadata, a.created_at,
            a.contact_id, a.deal_id,
            u.id AS user_id, u.name AS user_name, u.avatar_url AS user_avatar
       FROM activities a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.organization_id = $1
        AND a.action <> 'login'
      ORDER BY a.created_at DESC
      LIMIT $2`,
    [organizationId, limit],
  );
  return rows;
}

export async function getUpcomingMeetings(organizationId, limit = 5) {
  const { rows } = await query(
    `SELECT ap.id, ap.title, ap.starts_at, ap.ends_at, ap.status, ap.location,
            c.id AS contact_id, c.first_name || coalesce(' ' || c.last_name, '') AS contact_name, c.company,
            mt.name AS meeting_type, mt.color,
            u.name AS host_name
       FROM appointments ap
       LEFT JOIN contacts c ON c.id = ap.contact_id
       LEFT JOIN meeting_types mt ON mt.id = ap.meeting_type_id
       LEFT JOIN users u ON u.id = ap.host_id
      WHERE ap.organization_id = $1
        AND ap.status IN ('scheduled','confirmed')
        AND ap.ends_at >= now()
      ORDER BY ap.starts_at
      LIMIT $2`,
    [organizationId, limit],
  );
  return rows;
}

export async function getPendingTasks(organizationId, userId, limit = 6) {
  const { rows } = await query(
    `SELECT t.id, t.title, t.priority, t.status, t.due_at,
            c.first_name || coalesce(' ' || c.last_name, '') AS contact_name,
            u.name AS assignee_name
       FROM tasks t
       LEFT JOIN contacts c ON c.id = t.contact_id
       LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.organization_id = $1 AND t.status IN ('pending','in_progress')
      ORDER BY (t.assigned_to = $2) DESC, t.due_at NULLS LAST, t.priority DESC
      LIMIT $3`,
    [organizationId, userId, limit],
  );
  return rows;
}

export async function getPipelineOverview(organizationId) {
  const { rows } = await query(
    `SELECT s.id, s.name, s.color, s.position, s.is_won, s.is_lost,
            count(d.id)::int AS deals,
            coalesce(sum(d.value),0)::float AS value
       FROM pipelines p
       JOIN pipeline_stages s ON s.pipeline_id = p.id
       LEFT JOIN deals d ON d.stage_id = s.id AND d.status = 'open'
      WHERE p.organization_id = $1 AND p.is_default
      GROUP BY s.id ORDER BY s.position`,
    [organizationId],
  );
  return rows;
}

export async function getDashboard(organizationId, userId) {
  const [summary, revenue, activity, meetings, tasks, pipeline] = await Promise.all([
    getSummary(organizationId),
    getRevenueByMonth(organizationId, 6),
    getRecentActivity(organizationId, 12),
    getUpcomingMeetings(organizationId, 5),
    getPendingTasks(organizationId, userId, 6),
    getPipelineOverview(organizationId),
  ]);
  return { summary, revenue, activity, meetings, tasks, pipeline };
}
