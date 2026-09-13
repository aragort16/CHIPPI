/**
 * Datos de demostración para ver el CRM con contenido real.
 * Usuario: admin@chippi.app / Chippi2024!
 */
import { pool, withTransaction } from '../config/db.js';
import { register, hashPassword } from '../services/auth.service.js';
import { logActivity } from '../services/activity.service.js';

const DEMO_EMAIL = 'admin@chippi.app';
const DEMO_PASSWORD = 'Chippi2024!';

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const daysFromNow = (n, hour = 10) => daysAgo(-n, hour);

const CONTACTS = [
  ['Martín', 'Gómez', 'martin@tallergomez.com', '+54 11 4567-8901', 'Taller Gómez', 'Dueño', 'google', 'lead'],
  ['Lucía', 'Fernández', 'lucia@autosdelsur.com', '+54 11 5555-1234', 'Autos del Sur', 'Gerente de Ventas', 'referido', 'customer'],
  ['Carlos', 'Pereyra', 'carlos@pereyramotors.com', '+54 351 456-7890', 'Pereyra Motors', 'Director', 'facebook', 'lead'],
  ['Ana', 'Rodríguez', 'ana@servicioexpress.com', '+54 11 6666-4321', 'Servicio Express', 'Encargada', 'web', 'lead'],
  ['Diego', 'Suárez', 'diego@concesionariasuarez.com', '+54 261 333-2211', 'Concesionaria Suárez', 'Propietario', 'formulario', 'customer'],
  ['Valentina', 'López', 'vale@lopezautomotores.com', '+54 11 7777-9988', 'López Automotores', 'Jefa de Posventa', 'google', 'lead'],
  ['Federico', 'Molina', 'fede@tallermolina.com', '+54 341 222-1100', 'Taller Molina', 'Dueño', 'referido', 'lead'],
  ['Camila', 'Torres', 'camila@torresmotors.com', '+54 11 8888-7766', 'Torres Motors', 'Gerente General', 'instagram', 'customer'],
  ['Javier', 'Ramírez', 'javier@rapidocar.com', '+54 11 9999-5544', 'RápidoCar Service', 'Socio', 'web', 'lead'],
  ['Sofía', 'Castro', 'sofia@castroautos.com', '+54 221 444-3322', 'Castro Autos', 'Directora Comercial', 'google', 'lead'],
  ['Nicolás', 'Vega', 'nico@vegaservicio.com', '+54 11 1111-2233', 'Vega Servicio Oficial', 'Dueño', 'facebook', 'lead'],
  ['Florencia', 'Díaz', 'flor@diazconcesionaria.com', '+54 11 2222-3344', 'Díaz Concesionaria', 'Gerente de Marketing', 'referido', 'customer'],
];

async function seed() {
  const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [DEMO_EMAIL]);
  if (exists.rowCount) {
    console.log(`ℹ️  El usuario demo ${DEMO_EMAIL} ya existe. Ejecutá "npm run db:reset" para regenerar todo.`);
    return;
  }

  const { user: admin } = await register({
    organizationName: 'Chippi',
    name: 'Sebastián Aragort',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  const orgId = admin.organization_id;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE organizations SET primary_color = '#3b82f6', logo_url = '/logo.svg', currency = 'USD',
              settings = '{"industry":"Automatización con agentes de IA","target":"Talleres de servicio y concesionarios"}'
        WHERE id = $1`,
      [orgId],
    );

    // Equipo
    const hash = await hashPassword(DEMO_PASSWORD);
    const team = [];
    for (const [name, email, role] of [
      ['Laura Méndez', 'laura@chippi.app', 'sales_manager'],
      ['Tomás Ruiz', 'tomas@chippi.app', 'sales_rep'],
      ['Paula Ibáñez', 'paula@chippi.app', 'support'],
    ]) {
      const { rows } = await client.query(
        `INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name`,
        [orgId, name, email, hash, role],
      );
      team.push(rows[0]);
    }
    const owners = [admin, ...team.slice(0, 2)];

    const { rows: tags } = await client.query('SELECT id, name FROM tags WHERE organization_id = $1', [orgId]);
    const { rows: stages } = await client.query(
      `SELECT s.* FROM pipeline_stages s JOIN pipelines p ON p.id = s.pipeline_id WHERE p.organization_id = $1 ORDER BY s.position`,
      [orgId],
    );
    const pipelineId = stages[0].pipeline_id;
    const openStages = stages.filter((s) => !s.is_won && !s.is_lost);
    const wonStage = stages.find((s) => s.is_won);
    const lostStage = stages.find((s) => s.is_lost);
    const { rows: meetingTypes } = await client.query('SELECT id, name, duration_minutes FROM meeting_types WHERE organization_id = $1', [orgId]);

    // Contactos
    const contacts = [];
    for (const [i, c] of CONTACTS.entries()) {
      const owner = owners[i % owners.length];
      const { rows } = await client.query(
        `INSERT INTO contacts (organization_id, owner_id, first_name, last_name, email, phone, company, job_title, lead_source, status, city, country, created_at, last_activity_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Buenos Aires','Argentina',$11,$11) RETURNING *`,
        [orgId, owner.id, ...c, daysAgo(60 - i * 4)],
      );
      contacts.push(rows[0]);
      const tag = rand(tags);
      await client.query('INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rows[0].id, tag.id]);
      await logActivity(
        { organizationId: orgId, userId: owner.id, contactId: rows[0].id, entityType: 'contact', entityId: rows[0].id, action: 'created',
          description: `${owner.name} creó el contacto ${c[0]} ${c[1]} (${c[4]})` },
        client,
      );
    }

    // Deals: abiertos + ganados en los últimos 6 meses + perdidos
    const dealTitles = ['Agente IA de atención WhatsApp', 'Automatización de turnos', 'CRM + agente de ventas', 'Bot de seguimiento posventa', 'Integración completa Chippi'];
    let pos = 0;
    for (const [i, c] of contacts.entries()) {
      const stage = openStages[i % openStages.length];
      const owner = owners[i % owners.length];
      const value = 800 + (i % 5) * 450;
      const { rows } = await client.query(
        `INSERT INTO deals (organization_id, pipeline_id, stage_id, contact_id, owner_id, title, value, status, position, expected_close_date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9,$10) RETURNING *`,
        [orgId, pipelineId, stage.id, c.id, owner.id, `${dealTitles[i % dealTitles.length]} — ${c.company}`, value, pos++, daysFromNow(10 + i * 3), daysAgo(30 - i * 2)],
      );
      await logActivity(
        { organizationId: orgId, userId: owner.id, contactId: c.id, dealId: rows[0].id, entityType: 'deal', entityId: rows[0].id, action: 'created',
          description: `${owner.name} creó la oportunidad "${rows[0].title}" por USD ${value}` },
        client,
      );
    }
    // Ganados: distribuidos en 6 meses
    const wonPlan = [[5, 2], [4, 3], [3, 2], [2, 4], [1, 3], [0, 3]]; // [meses atrás, cantidad]
    for (const [monthsAgo, count] of wonPlan) {
      for (let k = 0; k < count; k++) {
        const c = rand(contacts);
        const owner = owners[k % owners.length];
        const value = 1200 + Math.floor(Math.random() * 6) * 500;
        const closed = new Date();
        closed.setMonth(closed.getMonth() - monthsAgo);
        closed.setDate(Math.min(closed.getDate(), 3 + k * 7));
        if (monthsAgo === 0 && closed > new Date()) closed.setDate(1);
        const { rows } = await client.query(
          `INSERT INTO deals (organization_id, pipeline_id, stage_id, contact_id, owner_id, title, value, status, closed_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'won',$8,$9) RETURNING *`,
          [orgId, pipelineId, wonStage.id, c.id, owner.id, `${rand(dealTitles)} — ${c.company}`, value, closed, new Date(closed.getTime() - 20 * 864e5)],
        );
        await client.query(
          `INSERT INTO activities (organization_id, user_id, contact_id, deal_id, entity_type, entity_id, action, description, created_at)
           VALUES ($1,$2,$3,$4,'deal',$4,'won',$5,$6)`,
          [orgId, owner.id, c.id, rows[0].id, `${owner.name} cerró como ganada "${rows[0].title}" por USD ${value}`, closed],
        );
      }
    }
    for (let k = 0; k < 3; k++) {
      const c = rand(contacts);
      await client.query(
        `INSERT INTO deals (organization_id, pipeline_id, stage_id, contact_id, owner_id, title, value, status, closed_at, lost_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'lost',$8,'Eligió otra solución')`,
        [orgId, pipelineId, lostStage.id, c.id, admin.id, `${rand(dealTitles)} — ${c.company}`, 900, daysAgo(15 + k * 9)],
      );
    }

    // Reuniones: hoy y próximos días
    const meetingsPlan = [
      [0, 10, 0], [0, 15, 1], [0, 17, 2], [1, 11, 0], [2, 9, 1], [3, 16, 0], [5, 14, 2],
    ];
    for (const [i, [day, hour, typeIdx]] of meetingsPlan.entries()) {
      const c = contacts[(i * 3) % contacts.length];
      const mt = meetingTypes[typeIdx % meetingTypes.length];
      const owner = owners[i % owners.length];
      const start = daysFromNow(day, hour);
      const end = new Date(start.getTime() + mt.duration_minutes * 60000);
      const { rows } = await client.query(
        `INSERT INTO appointments (organization_id, meeting_type_id, contact_id, host_id, title, starts_at, ends_at, status, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Google Meet') RETURNING id, title`,
        [orgId, mt.id, c.id, owner.id, `${mt.name} con ${c.first_name} ${c.last_name}`, start, end, i % 2 ? 'confirmed' : 'scheduled'],
      );
      await logActivity(
        { organizationId: orgId, userId: owner.id, contactId: c.id, entityType: 'appointment', entityId: rows[0].id, action: 'created',
          description: `${owner.name} agendó "${rows[0].title}"` },
        client,
      );
    }

    // Tareas
    const tasksPlan = [
      ['Enviar propuesta a Taller Gómez', 'high', -1, 0],
      ['Llamar a Carlos Pereyra para seguimiento', 'urgent', 0, 2],
      ['Preparar demo para Concesionaria Suárez', 'high', 1, 4],
      ['Configurar agente IA de prueba para Servicio Express', 'medium', 2, 3],
      ['Enviar contrato a Torres Motors', 'medium', 3, 7],
      ['Revisar onboarding de Autos del Sur', 'low', 5, 1],
      ['Pedir reseña a Díaz Concesionaria', 'low', 6, 11],
    ];
    for (const [i, [title, priority, dueDays, contactIdx]] of tasksPlan.entries()) {
      const assignee = owners[i % owners.length];
      const { rows } = await client.query(
        `INSERT INTO tasks (organization_id, contact_id, assigned_to, created_by, title, priority, status, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING id`,
        [orgId, contacts[contactIdx].id, assignee.id, admin.id, title, priority, daysFromNow(dueDays, 12)],
      );
      await logActivity(
        { organizationId: orgId, userId: admin.id, contactId: contacts[contactIdx].id, entityType: 'task', entityId: rows[0].id, action: 'created',
          description: `${admin.name} asignó la tarea "${title}" a ${assignee.name}` },
        client,
      );
    }

    // Notas
    await client.query(
      `INSERT INTO notes (organization_id, contact_id, user_id, body) VALUES
       ($1,$2,$3,'Tiene 2 sucursales, quiere automatizar los turnos por WhatsApp. Presupuesto aprox USD 1.500/mes.'),
       ($1,$4,$3,'Ya usa un CRM viejo, le interesa la migración. Decisión en 2 semanas.')`,
      [orgId, contacts[0].id, admin.id, contacts[2].id],
    );
  });

  console.log('✅ Datos de demostración cargados.');
  console.log(`   Usuario: ${DEMO_EMAIL}`);
  console.log(`   Contraseña: ${DEMO_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('❌ Error en el seed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
