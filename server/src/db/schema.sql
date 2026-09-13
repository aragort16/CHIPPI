-- =====================================================================
--  CHIPPI CRM — Esquema de base de datos (PostgreSQL 14+)
--  Multi-tenant: casi todas las tablas cuelgan de organizations.id
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Tipos ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'sales_manager', 'sales_rep', 'support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_run_status AS ENUM ('running', 'waiting', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Función para updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
--  1. ORGANIZACIÓN Y USUARIOS (módulo 12: equipo)
-- =====================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3b82f6',
  timezone      TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  currency      TEXT NOT NULL DEFAULT 'USD',
  settings      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'sales_rep',
  avatar_url      TEXT,
  phone           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

CREATE TABLE IF NOT EXISTS user_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'sales_rep',
  token           TEXT NOT NULL UNIQUE,
  invited_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de actividad (dashboard: "quién hizo qué" + timeline de contacto + log por usuario)
CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  contact_id      UUID,          -- FK agregada después de crear contacts
  deal_id         UUID,          -- FK agregada después de crear deals
  entity_type     TEXT NOT NULL, -- contact | deal | task | appointment | invoice | campaign | workflow | user | ...
  entity_id       UUID,
  action          TEXT NOT NULL, -- created | updated | deleted | stage_changed | note_added | email_sent | ...
  description     TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_org_created ON activities(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at DESC);

-- =====================================================================
--  2. CONTACTOS
-- =====================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  job_title       TEXT,
  address_line    TEXT,
  city            TEXT,
  state           TEXT,
  postal_code     TEXT,
  country         TEXT,
  lead_source     TEXT,        -- web, referido, facebook, google, formulario, importación...
  status          TEXT NOT NULL DEFAULT 'lead', -- lead | customer | churned
  custom_fields   JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_opt_in    BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_email ON contacts(organization_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts
  USING gin (to_tsvector('spanish', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(company,'') || ' ' || coalesce(email,'')));

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  label           TEXT NOT NULL,
  field_type      TEXT NOT NULL DEFAULT 'text', -- text | number | date | select | checkbox
  options         JSONB NOT NULL DEFAULT '[]'::jsonb,
  position        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

CREATE TABLE IF NOT EXISTS tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#3b82f6',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id         UUID,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  pinned          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id, created_at DESC);

-- Listas / segmentos (usadas por email marketing)
CREATE TABLE IF NOT EXISTS contact_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_dynamic      BOOLEAN NOT NULL DEFAULT false,
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb, -- segmento dinámico: reglas
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_list_members (
  list_id    UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, contact_id)
);

-- =====================================================================
--  3. PIPELINE DE VENTAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  probability INT NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  is_won      BOOLEAN NOT NULL DEFAULT false,
  is_lost     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON pipeline_stages(pipeline_id, position);

CREATE TABLE IF NOT EXISTS deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id        UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  value           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          deal_status NOT NULL DEFAULT 'open',
  position        INT NOT NULL DEFAULT 0,      -- orden dentro de la columna del kanban
  expected_close_date DATE,
  closed_at       TIMESTAMPTZ,
  lost_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_org_status ON deals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id, position);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_closed ON deals(organization_id, closed_at);

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_contact_fk;
ALTER TABLE activities ADD CONSTRAINT activities_contact_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_deal_fk;
ALTER TABLE activities ADD CONSTRAINT activities_deal_fk FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_deal_fk;
ALTER TABLE notes ADD CONSTRAINT notes_deal_fk FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;

-- =====================================================================
--  TAREAS (dashboard + automatizaciones)
-- =====================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          task_status NOT NULL DEFAULT 'pending',
  priority        task_priority NOT NULL DEFAULT 'medium',
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);

-- =====================================================================
--  4. CALENDARIO Y RESERVAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS meeting_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL, -- anfitrión por defecto
  name             TEXT NOT NULL,                                 -- Discovery Call, Demo, Follow-up
  slug             TEXT NOT NULL,                                 -- para el link público /book/:orgSlug/:slug
  description      TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes   INT NOT NULL DEFAULT 0,
  color            TEXT NOT NULL DEFAULT '#3b82f6',
  location         TEXT,                                          -- Google Meet, Zoom, presencial...
  is_active        BOOLEAN NOT NULL DEFAULT true,
  reminder_hours   INT[] NOT NULL DEFAULT '{24,1}',               -- recordatorios por email
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- Disponibilidad semanal (0=domingo ... 6=sábado)
CREATE TABLE IF NOT EXISTS availability_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_availability_user ON availability_rules(user_id, day_of_week);

CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  host_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          appointment_status NOT NULL DEFAULT 'scheduled',
  location        TEXT,
  notes           TEXT,
  booked_publicly BOOLEAN NOT NULL DEFAULT false,
  reminders_sent  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_appointments_org_start ON appointments(organization_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_host ON appointments(host_id, starts_at);

-- =====================================================================
--  5. EMAIL MARKETING
-- =====================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  subject         TEXT,
  blocks          JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{type:'text'|'image'|'button'|'divider', ...}]
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  from_name       TEXT,
  from_email      TEXT,
  blocks          JSONB NOT NULL DEFAULT '[]'::jsonb,
  list_id         UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  segment_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  stats           JSONB NOT NULL DEFAULT '{"sent":0,"delivered":0,"opened":0,"clicked":0,"bounced":0}'::jsonb,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON email_campaigns(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  tracking_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  bounced_at    TIMESTAMPTZ,
  open_count    INT NOT NULL DEFAULT 0,
  click_count   INT NOT NULL DEFAULT 0,
  UNIQUE (campaign_id, contact_id)
);

CREATE TABLE IF NOT EXISTS email_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL, -- open | click | bounce
  url          TEXT,
  user_agent   TEXT,
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
--  6. AUTOMATIZACIONES (WORKFLOWS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_type    TEXT NOT NULL, -- new_lead | stage_changed | form_submitted | tag_added | appointment_date
  trigger_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  nodes           JSONB NOT NULL DEFAULT '[]'::jsonb, -- builder visual: nodos
  edges           JSONB NOT NULL DEFAULT '[]'::jsonb, -- conexiones entre nodos
  is_active       BOOLEAN NOT NULL DEFAULT false,
  run_count       INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflows_org_active ON workflows(organization_id, is_active, trigger_type);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,
  status          workflow_run_status NOT NULL DEFAULT 'running',
  current_node_id TEXT,
  resume_at       TIMESTAMPTZ,     -- para la acción "esperar X tiempo"
  context         JSONB NOT NULL DEFAULT '{}'::jsonb,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_resume ON workflow_runs(status, resume_at);

CREATE TABLE IF NOT EXISTS workflow_run_steps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id    TEXT NOT NULL,
  node_type  TEXT NOT NULL,
  result     JSONB NOT NULL DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificaciones internas (acción de workflow + avisos del sistema)
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- =====================================================================
--  7. FORMULARIOS Y ENCUESTAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  fields          JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{id,type,label,required,options,mapTo}]
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb, -- mensaje de éxito, redirect, estilos
  is_active       BOOLEAN NOT NULL DEFAULT true,
  view_count      INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip          TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id, created_at DESC);

-- =====================================================================
--  8. FUNNELS / LANDING PAGES
-- =====================================================================
CREATE TABLE IF NOT EXISTS pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,           -- URL pública: /p/:orgSlug/:slug
  title           TEXT,
  meta_description TEXT,
  sections        JSONB NOT NULL DEFAULT '[]'::jsonb, -- hero, text, image, form, button, video, testimonials, pricing, faq, footer
  theme           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  view_count      INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- =====================================================================
--  9. FACTURACIÓN
-- =====================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  number          TEXT NOT NULL,          -- ej: F-2025-0001
  status          invoice_status NOT NULL DEFAULT 'draft',
  currency        TEXT NOT NULL DEFAULT 'USD',
  -- snapshot de datos del cliente al momento de emitir
  customer_name   TEXT,
  customer_email  TEXT,
  customer_company TEXT,
  customer_address TEXT,
  customer_tax_id TEXT,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status, due_date);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  position    INT NOT NULL DEFAULT 0
);

-- =====================================================================
--  10. REPUTACIÓN / RESEÑAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS review_platforms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,   -- google | facebook | trustpilot | otro
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  platform_id     UUID REFERENCES review_platforms(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL DEFAULT 'email', -- email | sms
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | sent | opened | reviewed
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  platform_id     UUID REFERENCES review_platforms(id) ON DELETE SET NULL,
  request_id      UUID REFERENCES review_requests(id) ON DELETE SET NULL,
  author_name     TEXT,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_org ON reviews(organization_id, reviewed_at DESC);

-- =====================================================================
--  Triggers updated_at
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','users','contacts','notes','contact_lists','pipelines','deals','tasks',
    'meeting_types','appointments','email_templates','email_campaigns','workflows','forms',
    'pages','invoices'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
