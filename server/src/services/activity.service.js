import { query } from '../config/db.js';

/**
 * Registra una actividad en el log (feed del dashboard, timeline de contacto, log por usuario).
 * Acepta un cliente de transacción opcional.
 */
export async function logActivity(
  { organizationId, userId = null, contactId = null, dealId = null, entityType, entityId = null, action, description, metadata = {} },
  client = { query },
) {
  const { rows } = await client.query(
    `INSERT INTO activities (organization_id, user_id, contact_id, deal_id, entity_type, entity_id, action, description, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [organizationId, userId, contactId, dealId, entityType, entityId, action, description, JSON.stringify(metadata)],
  );
  return rows[0];
}
