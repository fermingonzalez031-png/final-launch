-- =============================================================
-- PRODROP HQ — SUPABASE SQL SCHEMA
-- Migration 01: Full MVP schema
-- Run in Supabase SQL Editor or via supabase db push
-- =============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy model number search

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'dispatcher',
  'contractor',
  'driver',
  'supplier_user'
);

CREATE TYPE order_status AS ENUM (
  'new_request',
  'confirming_supplier',
  'supplier_confirmed',
  'driver_assigned',
  'picked_up',
  'en_route',
  'delivered',
  'issue',
  'cancelled'
);

CREATE TYPE order_priority AS ENUM (
  'standard',
  'rush',
  'emergency'
);

CREATE TYPE driver_status AS ENUM (
  'available',
  'assigned',
  'on_pickup',
  'delivering',
  'offline'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'charged',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'push');

CREATE TYPE notification_type AS ENUM (
  'order_received',
  'confirming_supplier',
  'supplier_confirmed',
  'driver_assigned',
  'picked_up',
  'eta_update',
  'delivered',
  'issue',
  'cancelled'
);

CREATE TYPE file_type AS ENUM (
  'equipment_photo',
  'nameplate_photo',
  'part_photo',
  'proof_of_delivery'
);

CREATE TYPE part_category AS ENUM (
  'capacitor',
  'contactor',
  'igniter',
  'flame_sensor',
  'pump',
  'control_board',
  'motor',
  'thermostat',
  'refrigerant',
  'valve',
  'other'
);

CREATE TYPE trade_type AS ENUM ('hvac', 'plumbing', 'electrical', 'general', 'mixed');

CREATE TYPE billing_type AS ENUM ('credit_card', 'net_30', 'prepay');

CREATE TYPE match_type AS ENUM ('exact_oem', 'compatible', 'common_replacement');

CREATE TYPE event_type AS ENUM (
  'status_change',
  'note_added',
  'driver_assigned',
  'driver_reassigned',
  'issue_flagged',
  'cancelled'
);

CREATE TYPE delivery_event_status AS ENUM (
  'new_request',
  'confirming_supplier',
  'supplier_confirmed',
  'driver_assigned',
  'picked_up',
  'en_route',
  'delivered',
  'issue',
  'cancelled'
);

-- ─────────────────────────────────────────────
-- SEQUENCES
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ─────────────────────────────────────────────
-- SHARED TRIGGER FUNCTION: updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- TABLE 1: users
-- Managed by Supabase Auth — we mirror the auth.users row
-- ─────────────────────────────────────────────
CREATE TABLE public.users (
  id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT         NOT NULL UNIQUE,
  phone           TEXT         UNIQUE,
  full_name       TEXT         NOT NULL,
  role            user_role    NOT NULL DEFAULT 'contractor',
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  avatar_url      TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role      ON public.users(role);
CREATE INDEX idx_users_phone     ON public.users(phone);
CREATE INDEX idx_users_is_active ON public.users(is_active);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 2: service_areas
-- ─────────────────────────────────────────────
CREATE TABLE public.service_areas (
  id          UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT       NOT NULL,
  zip_codes   TEXT[]     NOT NULL DEFAULT '{}',
  cities      TEXT[]     NOT NULL DEFAULT '{}',
  is_active   BOOLEAN    NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_areas_zip ON public.service_areas USING GIN(zip_codes);

CREATE TRIGGER trg_service_areas_updated_at
  BEFORE UPDATE ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 3: suppliers
-- ─────────────────────────────────────────────
CREATE TABLE public.suppliers (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT        NOT NULL,
  trade_type           trade_type  NOT NULL DEFAULT 'hvac',
  primary_contact      TEXT,
  phone                TEXT,
  email                TEXT,
  account_number       TEXT,
  avg_response_mins    INT,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 4: supplier_locations
-- ─────────────────────────────────────────────
CREATE TABLE public.supplier_locations (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id  UUID              NOT NULL REFERENCES public.suppliers(id),
  branch_name  TEXT,
  address      TEXT              NOT NULL,
  city         TEXT,
  zip          TEXT,
  lat          NUMERIC(10, 7),
  lng          NUMERIC(10, 7),
  phone        TEXT,
  hours_text   TEXT,
  is_default   BOOLEAN           NOT NULL DEFAULT false,
  is_active    BOOLEAN           NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_sup_locations_supplier ON public.supplier_locations(supplier_id);

CREATE TRIGGER trg_supplier_locations_updated_at
  BEFORE UPDATE ON public.supplier_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 5: companies
-- ─────────────────────────────────────────────
CREATE TABLE public.companies (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT          NOT NULL,
  trade_type            trade_type    NOT NULL DEFAULT 'hvac',
  phone                 TEXT,
  email                 TEXT,
  billing_address       TEXT,
  city                  TEXT,
  state                 TEXT          NOT NULL DEFAULT 'NY',
  zip                   TEXT,
  tax_exempt            BOOLEAN       NOT NULL DEFAULT false,
  stripe_customer_id    TEXT,
  billing_type          billing_type  NOT NULL DEFAULT 'credit_card',
  preferred_supplier_id UUID          REFERENCES public.suppliers(id),
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  total_orders          INT           NOT NULL DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_is_active ON public.companies(is_active);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 6: dispatchers
-- ─────────────────────────────────────────────
CREATE TYPE dispatcher_shift AS ENUM ('morning', 'afternoon', 'evening', 'on_call');

CREATE TABLE public.dispatchers (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  shift       dispatcher_shift,
  is_on_duty  BOOLEAN           NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dispatchers_updated_at
  BEFORE UPDATE ON public.dispatchers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 7: contractors
-- ─────────────────────────────────────────────
CREATE TABLE public.contractors (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  company_id          UUID        NOT NULL REFERENCES public.companies(id),
  title               TEXT,
  phone_direct        TEXT,
  is_primary_contact  BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contractors_company ON public.contractors(company_id);

CREATE TRIGGER trg_contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 8: drivers
-- ─────────────────────────────────────────────
CREATE TYPE bg_check_status AS ENUM ('pending', 'cleared', 'failed');

CREATE TABLE public.drivers (
  id                       UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID            NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_make             TEXT,
  vehicle_model            TEXT,
  vehicle_year             INT,
  vehicle_color            TEXT,
  license_plate            TEXT,
  driver_status            driver_status   NOT NULL DEFAULT 'offline',
  service_area_id          UUID            REFERENCES public.service_areas(id),
  current_lat              NUMERIC(10, 7),
  current_lng              NUMERIC(10, 7),
  location_updated_at      TIMESTAMPTZ,
  background_check_status  bg_check_status NOT NULL DEFAULT 'pending',
  insurance_verified       BOOLEAN         NOT NULL DEFAULT false,
  total_deliveries         INT             NOT NULL DEFAULT 0,
  avg_rating               NUMERIC(3, 2),
  notes                    TEXT,
  created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_status    ON public.drivers(driver_status);
CREATE INDEX idx_drivers_user      ON public.drivers(user_id);

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 9: parts
-- ─────────────────────────────────────────────
CREATE TABLE public.parts (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT          NOT NULL,
  brand                     TEXT,
  category                  part_category NOT NULL DEFAULT 'other',
  manufacturer_part_number  TEXT,
  voltage                   TEXT,
  mfd_rating                TEXT,
  compatible_brands         TEXT[]        DEFAULT '{}',
  search_keywords           TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Full-text search index on name + keywords
CREATE INDEX idx_parts_name_fts      ON public.parts USING GIN(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(search_keywords,'')));
CREATE INDEX idx_parts_category      ON public.parts(category);

CREATE TRIGGER trg_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 10: equipment_models
-- ─────────────────────────────────────────────
CREATE TYPE system_type AS ENUM (
  'furnace', 'central_ac', 'boiler', 'mini_split',
  'heat_pump', 'water_heater', 'other'
);

CREATE TYPE fuel_type AS ENUM ('gas', 'electric', 'oil', 'propane', 'none');

CREATE TABLE public.equipment_models (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand         TEXT        NOT NULL,
  model_number  TEXT        NOT NULL,
  model_series  TEXT,  -- stripped suffix, e.g. GSXC18 from GSXC18-036
  system_type   system_type,
  fuel_type     fuel_type,
  btu_range     TEXT,
  refrigerant   TEXT,
  tonnage       NUMERIC(4, 2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(brand, model_number)
);

CREATE INDEX idx_equip_model_number  ON public.equipment_models(model_number);
CREATE INDEX idx_equip_model_series  ON public.equipment_models(model_series);
CREATE INDEX idx_equip_brand         ON public.equipment_models(brand);
-- Trigram index for fuzzy model search
CREATE INDEX idx_equip_model_trgm    ON public.equipment_models USING GIN(model_number gin_trgm_ops);

CREATE TRIGGER trg_equipment_models_updated_at
  BEFORE UPDATE ON public.equipment_models
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 11: model_parts_mapping
-- ─────────────────────────────────────────────
CREATE TABLE public.model_parts_mapping (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_model_id   UUID        NOT NULL REFERENCES public.equipment_models(id) ON DELETE CASCADE,
  part_id              UUID        NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  match_type           match_type  NOT NULL DEFAULT 'compatible',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(equipment_model_id, part_id)
);

CREATE INDEX idx_model_parts_model ON public.model_parts_mapping(equipment_model_id);
CREATE INDEX idx_model_parts_part  ON public.model_parts_mapping(part_id);

-- ─────────────────────────────────────────────
-- TABLE 12: pricing_rules
-- ─────────────────────────────────────────────
CREATE TABLE public.pricing_rules (
  id                       UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     TEXT          NOT NULL,
  priority_type            order_priority NOT NULL,
  service_area_id          UUID          REFERENCES public.service_areas(id),
  base_price               NUMERIC(10,2) NOT NULL DEFAULT 35.00,
  mileage_rate             NUMERIC(6,4)  NOT NULL DEFAULT 1.50,
  mileage_threshold_miles  INT           NOT NULL DEFAULT 5,
  after_hours_surcharge    NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  heavy_item_surcharge     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active                BOOLEAN       NOT NULL DEFAULT true,
  effective_from           DATE          NOT NULL DEFAULT CURRENT_DATE,
  effective_to             DATE,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_priority ON public.pricing_rules(priority_type, is_active);

CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 13: orders  [CORE TABLE]
-- ─────────────────────────────────────────────
CREATE TABLE public.orders (
  id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          TEXT           NOT NULL UNIQUE DEFAULT (
    'PD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::TEXT, 4, '0')
  ),
  status                order_status   NOT NULL DEFAULT 'new_request',
  priority              order_priority NOT NULL DEFAULT 'standard',

  -- Relationships
  company_id            UUID           NOT NULL REFERENCES public.companies(id),
  contractor_id         UUID           NOT NULL REFERENCES public.contractors(id),
  supplier_id           UUID           REFERENCES public.suppliers(id),
  supplier_location_id  UUID           REFERENCES public.supplier_locations(id),
  driver_id             UUID           REFERENCES public.drivers(id),
  dispatcher_id         UUID           REFERENCES public.dispatchers(id),
  matched_part_id       UUID           REFERENCES public.parts(id),
  payment_record_id     UUID, -- FK added after payment_records table created

  -- Jobsite
  jobsite_address       TEXT           NOT NULL,
  jobsite_lat           NUMERIC(10,7),
  jobsite_lng           NUMERIC(10,7),

  -- Part info
  part_description      TEXT           NOT NULL,
  equipment_brand       TEXT,
  model_number          TEXT,

  -- Pricing
  delivery_price        NUMERIC(10,2),
  parts_cost            NUMERIC(10,2)  DEFAULT 0,
  total_amount          NUMERIC(10,2),
  distance_miles        NUMERIC(6,2),
  is_after_hours        BOOLEAN        NOT NULL DEFAULT false,

  -- ETA
  eta_minutes           INT,
  eta_timestamp         TIMESTAMPTZ,

  -- Lifecycle timestamps
  requested_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  confirmed_at          TIMESTAMPTZ,
  assigned_at           TIMESTAMPTZ,
  picked_up_at          TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  issue_description     TEXT,

  -- Payment
  payment_status        payment_status NOT NULL DEFAULT 'pending',

  -- Misc
  notes                 TEXT,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Critical indexes for dispatch board performance
CREATE INDEX idx_orders_status          ON public.orders(status);
CREATE INDEX idx_orders_priority        ON public.orders(priority);
CREATE INDEX idx_orders_company         ON public.orders(company_id);
CREATE INDEX idx_orders_driver          ON public.orders(driver_id);
CREATE INDEX idx_orders_supplier        ON public.orders(supplier_id);
CREATE INDEX idx_orders_requested_at    ON public.orders(requested_at DESC);
CREATE INDEX idx_orders_dispatch_board  ON public.orders(status, priority, requested_at DESC)
  WHERE status NOT IN ('delivered', 'cancelled');

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- TABLE 14: order_items
-- ─────────────────────────────────────────────
CREATE TABLE public.order_items (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  part_id          UUID        REFERENCES public.parts(id),
  part_description TEXT,
  quantity         INT         NOT NULL DEFAULT 1,
  unit_price       NUMERIC(10,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- ─────────────────────────────────────────────
-- TABLE 15: delivery_events  [IMMUTABLE]
-- ─────────────────────────────────────────────
CREATE TABLE public.delivery_events (
  id           UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID                   NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type   event_type             NOT NULL DEFAULT 'status_change',
  from_status  delivery_event_status,
  to_status    delivery_event_status,
  actor_id     UUID                   REFERENCES public.users(id),
  actor_role   TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ            NOT NULL DEFAULT now()
  -- NO updated_at — this table is append-only
);

CREATE INDEX idx_delivery_events_order      ON public.delivery_events(order_id);
CREATE INDEX idx_delivery_events_created_at ON public.delivery_events(created_at DESC);

-- Prevent UPDATEs and DELETEs on delivery_events
CREATE OR REPLACE FUNCTION prevent_delivery_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'delivery_events is append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delivery_events_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_events
  FOR EACH ROW EXECUTE FUNCTION prevent_delivery_event_mutation();

-- ─────────────────────────────────────────────
-- TABLE 16: driver_assignments
-- ─────────────────────────────────────────────
CREATE TYPE unassign_reason AS ENUM (
  'driver_unavailable',
  'driver_request',
  'dispatcher_override',
  'driver_offline',
  'reassignment'
);

CREATE TABLE public.driver_assignments (
  id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID            NOT NULL REFERENCES public.orders(id),
  driver_id        UUID            NOT NULL REFERENCES public.drivers(id),
  assigned_by      UUID            REFERENCES public.dispatchers(id),
  assigned_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  unassigned_at    TIMESTAMPTZ,
  unassign_reason  unassign_reason
);

CREATE INDEX idx_driver_asgn_order  ON public.driver_assignments(order_id);
CREATE INDEX idx_driver_asgn_driver ON public.driver_assignments(driver_id);
CREATE INDEX idx_driver_asgn_active ON public.driver_assignments(order_id)
  WHERE unassigned_at IS NULL; -- fast lookup of active assignment

-- ─────────────────────────────────────────────
-- TABLE 17: uploaded_files
-- ─────────────────────────────────────────────
CREATE TABLE public.uploaded_files (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID        REFERENCES public.orders(id),
  uploader_id     UUID        NOT NULL REFERENCES public.users(id),
  file_type       file_type   NOT NULL,
  storage_path    TEXT        NOT NULL,
  public_url      TEXT,
  file_size_bytes INT,
  mime_type       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_uploaded_files_order ON public.uploaded_files(order_id);

-- ─────────────────────────────────────────────
-- TABLE 18: notifications
-- ─────────────────────────────────────────────
CREATE TYPE notif_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE public.notifications (
  id            UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID              NOT NULL REFERENCES public.users(id),
  order_id      UUID              REFERENCES public.orders(id),
  channel       notification_channel NOT NULL DEFAULT 'sms',
  type          notification_type NOT NULL,
  body          TEXT              NOT NULL,
  status        notif_status      NOT NULL DEFAULT 'pending',
  sent_at       TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_order     ON public.notifications(order_id);
CREATE INDEX idx_notifications_status    ON public.notifications(status)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────
-- TABLE 19: payment_records
-- ─────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM ('card', 'invoice', 'prepay');

CREATE TABLE public.payment_records (
  id                        UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                  UUID           NOT NULL UNIQUE REFERENCES public.orders(id),
  company_id                UUID           NOT NULL REFERENCES public.companies(id),
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  amount                    NUMERIC(10,2)  NOT NULL,
  currency                  TEXT           NOT NULL DEFAULT 'usd',
  status                    payment_status NOT NULL DEFAULT 'pending',
  payment_method            payment_method NOT NULL DEFAULT 'card',
  receipt_url               TEXT,
  charged_at                TIMESTAMPTZ,
  refunded_amount           NUMERIC(10,2)  DEFAULT 0,
  refunded_at               TIMESTAMPTZ,
  notes                     TEXT,
  created_at                TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_company ON public.payment_records(company_id);
CREATE INDEX idx_payment_status  ON public.payment_records(status);

CREATE TRIGGER trg_payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add deferred FK from orders to payment_records
ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_payment
  FOREIGN KEY (payment_record_id)
  REFERENCES public.payment_records(id);

-- ─────────────────────────────────────────────
-- TABLE 20: proof_of_delivery
-- ─────────────────────────────────────────────
CREATE TABLE public.proof_of_delivery (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID        NOT NULL UNIQUE REFERENCES public.orders(id),
  driver_id       UUID        NOT NULL REFERENCES public.drivers(id),
  photo_file_id   UUID        NOT NULL REFERENCES public.uploaded_files(id),
  delivery_lat    NUMERIC(10,7),
  delivery_lng    NUMERIC(10,7),
  recipient_name  TEXT,
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pod_order  ON public.proof_of_delivery(order_id);
CREATE INDEX idx_pod_driver ON public.proof_of_delivery(driver_id);

-- ─────────────────────────────────────────────
-- TABLE 21: activity_logs  [APPEND-ONLY AUDIT]
-- ─────────────────────────────────────────────
CREATE TABLE public.activity_logs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID        REFERENCES public.users(id),
  actor_role   TEXT,
  action       TEXT        NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_actor      ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_logs_entity     ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- =========================================================
-- BUSINESS LOGIC FUNCTIONS
-- =========================================================

-- ─────────────────────────────────────────────
-- FN: Auto-insert first delivery_event on order create
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.delivery_events (order_id, event_type, to_status, actor_role)
  VALUES (NEW.id, 'status_change', 'new_request', 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION on_order_created();

-- ─────────────────────────────────────────────
-- FN: Validate status transitions (prevents invalid jumps)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed JSONB := '{
    "new_request":          ["confirming_supplier", "issue", "cancelled"],
    "confirming_supplier":  ["supplier_confirmed", "issue", "cancelled"],
    "supplier_confirmed":   ["driver_assigned", "issue", "cancelled"],
    "driver_assigned":      ["picked_up", "issue", "cancelled"],
    "picked_up":            ["en_route", "issue"],
    "en_route":             ["delivered", "issue"],
    "issue":                ["confirming_supplier", "supplier_confirmed", "driver_assigned", "cancelled"],
    "delivered":            [],
    "cancelled":            []
  }';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (allowed -> OLD.status::TEXT) @> to_jsonb(NEW.status::TEXT) THEN
      RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_status_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION validate_status_transition();

-- ─────────────────────────────────────────────
-- FN: Auto-insert delivery_event on status change
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_order_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.delivery_events (
      order_id, event_type, from_status, to_status, actor_role
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status::delivery_event_status,
      NEW.status::delivery_event_status,
      'system'
    );

    -- Auto-set lifecycle timestamps
    CASE NEW.status
      WHEN 'supplier_confirmed' THEN
        NEW.confirmed_at  = coalesce(NEW.confirmed_at, now());
      WHEN 'driver_assigned'    THEN
        NEW.assigned_at   = coalesce(NEW.assigned_at, now());
      WHEN 'picked_up'          THEN
        NEW.picked_up_at  = coalesce(NEW.picked_up_at, now());
      WHEN 'delivered'          THEN
        NEW.delivered_at  = coalesce(NEW.delivered_at, now());
      WHEN 'cancelled'          THEN
        NEW.cancelled_at  = coalesce(NEW.cancelled_at, now());
      ELSE NULL;
    END CASE;

    -- Update driver status when order changes
    IF NEW.status = 'driver_assigned' AND NEW.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET driver_status = 'assigned'
      WHERE id = NEW.driver_id;
    END IF;

    IF NEW.status = 'picked_up' AND NEW.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET driver_status = 'on_pickup'
      WHERE id = NEW.driver_id;
    END IF;

    IF NEW.status = 'en_route' AND NEW.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET driver_status = 'delivering'
      WHERE id = NEW.driver_id;
    END IF;

    IF NEW.status IN ('delivered', 'cancelled') AND NEW.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET driver_status = 'available'
      WHERE id = NEW.driver_id;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_status_changed
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION on_order_status_changed();

-- ─────────────────────────────────────────────
-- FN: Validate delivered requires proof_of_delivery
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_delivery_requires_pod()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.proof_of_delivery WHERE order_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot mark order as delivered: proof_of_delivery record required'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_require_pod_for_delivered
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION validate_delivery_requires_pod();

-- ─────────────────────────────────────────────
-- FN: Increment company.total_orders on new order
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_company_orders()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.companies
  SET total_orders = total_orders + 1
  WHERE id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_company_order_count
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION increment_company_orders();

-- ─────────────────────────────────────────────
-- FN: Increment driver.total_deliveries on delivered
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_driver_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET total_deliveries = total_deliveries + 1
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_driver_delivery_count
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION increment_driver_deliveries();

-- ─────────────────────────────────────────────
-- FN: Pricing calculation
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_order_price(
  p_priority       order_priority,
  p_distance_miles NUMERIC,
  p_is_after_hours BOOLEAN,
  p_has_heavy      BOOLEAN DEFAULT false,
  p_service_area_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  rule  public.pricing_rules%ROWTYPE;
  price NUMERIC;
BEGIN
  SELECT * INTO rule
  FROM public.pricing_rules
  WHERE priority_type = p_priority
    AND is_active = true
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    AND (service_area_id IS NULL OR service_area_id = p_service_area_id)
  ORDER BY service_area_id NULLS LAST  -- prefer area-specific rule
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active pricing rule found for priority: %', p_priority;
  END IF;

  price := rule.base_price
    + GREATEST(0, (p_distance_miles - rule.mileage_threshold_miles)) * rule.mileage_rate
    + CASE WHEN p_is_after_hours THEN rule.after_hours_surcharge ELSE 0 END
    + CASE WHEN p_has_heavy      THEN rule.heavy_item_surcharge  ELSE 0 END;

  RETURN ROUND(price, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────
-- FN: Model number lookup (3-stage cascade)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lookup_parts_for_model(
  p_model_number TEXT,
  p_brand        TEXT DEFAULT NULL
)
RETURNS TABLE (
  part_id       UUID,
  part_name     TEXT,
  brand         TEXT,
  category      part_category,
  match_type    match_type,
  mfr_part_num  TEXT,
  match_stage   INT  -- 1=exact, 2=series, 3=brand
) AS $$
DECLARE
  model_series_stripped TEXT;
BEGIN
  -- Stage 1: Exact model number match
  RETURN QUERY
  SELECT p.id, p.name, p.brand, p.category, mpm.match_type,
         p.manufacturer_part_number, 1
  FROM public.model_parts_mapping mpm
  JOIN public.parts p ON p.id = mpm.part_id
  JOIN public.equipment_models em ON em.id = mpm.equipment_model_id
  WHERE em.model_number ILIKE p_model_number
    AND (p_brand IS NULL OR em.brand ILIKE p_brand);

  IF FOUND THEN RETURN; END IF;

  -- Stage 2: Model series fuzzy match (strip trailing -XXX suffix)
  model_series_stripped := regexp_replace(p_model_number, '-[A-Z0-9]+$', '', 'i');

  RETURN QUERY
  SELECT p.id, p.name, p.brand, p.category, mpm.match_type,
         p.manufacturer_part_number, 2
  FROM public.model_parts_mapping mpm
  JOIN public.parts p ON p.id = mpm.part_id
  JOIN public.equipment_models em ON em.id = mpm.equipment_model_id
  WHERE em.model_series ILIKE model_series_stripped
    AND (p_brand IS NULL OR em.brand ILIKE p_brand);

  IF FOUND THEN RETURN; END IF;

  -- Stage 3: Brand + compatible_brands fallback
  IF p_brand IS NOT NULL THEN
    RETURN QUERY
    SELECT p.id, p.name, p.brand, p.category,
           'compatible'::match_type, p.manufacturer_part_number, 3
    FROM public.parts p
    WHERE p.compatible_brands @> ARRAY[p_brand]
    LIMIT 10;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────
-- FN: Check if ZIP is in a service area
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_service_area_for_zip(p_zip TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.service_areas
  WHERE zip_codes @> ARRAY[p_zip]
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────
-- FN: Mirror auth.users -> public.users on signup
-- (Supabase Edge Function hook — also add as DB trigger as fallback)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'contractor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- =========================================================
-- SEED DATA: Pricing Rules
-- =========================================================
INSERT INTO public.pricing_rules (name, priority_type, base_price, mileage_rate, mileage_threshold_miles, after_hours_surcharge) VALUES
  ('Standard Delivery',   'standard',  35.00, 1.50, 5, 15.00),
  ('Rush Delivery',       'rush',      50.00, 2.00, 5, 20.00),
  ('Emergency Delivery',  'emergency', 75.00, 2.50, 3, 25.00);

-- =========================================================
-- SEED DATA: Service Areas
-- =========================================================
INSERT INTO public.service_areas (name, zip_codes, cities) VALUES
  ('Westchester County', ARRAY[
    '10501','10502','10503','10504','10505','10506','10507','10509',
    '10510','10511','10512','10514','10516','10517','10518','10519',
    '10520','10521','10522','10523','10524','10526','10527','10528',
    '10530','10532','10533','10535','10536','10537','10538','10540',
    '10541','10542','10543','10545','10546','10547','10548','10549',
    '10550','10551','10552','10553','10560','10562','10566','10567',
    '10570','10573','10576','10577','10578','10579','10580','10583',
    '10587','10588','10589','10590','10591','10594','10595','10596',
    '10597','10598','10601','10602','10603','10604','10605','10606',
    '10607','10701','10702','10703','10704','10705','10706','10707',
    '10708','10709','10710'
  ], ARRAY[
    'Yonkers','White Plains','Mount Vernon','New Rochelle','Scarsdale',
    'Ossining','Tarrytown','Pleasantville','Ardsley','Dobbs Ferry',
    'Hastings-on-Hudson','Bronxville','Tuckahoe','Eastchester','Larchmont',
    'Mamaroneck','Port Chester','Rye','Harrison','Pelham'
  ]),
  ('The Bronx', ARRAY[
    '10451','10452','10453','10454','10455','10456','10457','10458',
    '10459','10460','10461','10462','10463','10464','10465','10466',
    '10467','10468','10469','10470','10471','10472','10473','10474',
    '10475'
  ], ARRAY['Bronx']);

COMMENT ON TABLE public.orders IS 'Core order lifecycle table. Every delivery request creates one row.';
COMMENT ON TABLE public.delivery_events IS 'Immutable audit log. Append-only — no updates or deletes permitted.';
COMMENT ON TABLE public.activity_logs IS 'Full audit trail for compliance. Append-only.';
COMMENT ON COLUMN public.orders.order_number IS 'Human-readable ID: PD-2024-0001';
