-- =============================================================
-- PRODROP HQ — ROW-LEVEL SECURITY POLICIES
-- Migration 02: RLS policies for all tables
-- Run AFTER 01_schema.sql
-- =============================================================

-- ─────────────────────────────────────────────
-- HELPER: role-check functions (avoids subquery repetition)
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_dispatcher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('dispatcher', 'super_admin')
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_driver()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'driver'
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.contractors
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_driver_id()
RETURNS UUID AS $$
  SELECT id FROM public.drivers
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_contractor_id()
RETURNS UUID AS $$
  SELECT id FROM public.contractors
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- ENABLE RLS ON ALL TABLES
-- ─────────────────────────────────────────────
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_models     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_parts_mapping  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_delivery    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs        ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- users
-- =========================================================

-- Users can read their own profile
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = auth.uid());

-- Dispatchers and admins can read all users
CREATE POLICY users_select_dispatcher ON public.users
  FOR SELECT USING (is_dispatcher());

-- Users can update their own non-role fields
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.users WHERE id = auth.uid()) -- cannot self-escalate role
  );

-- Only super_admin can update any user (including role changes)
CREATE POLICY users_admin_all ON public.users
  FOR ALL USING (is_super_admin());

-- =========================================================
-- service_areas
-- =========================================================

-- Anyone authenticated can read service areas (needed for ZIP validation on order form)
CREATE POLICY service_areas_select_all ON public.service_areas
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only super_admin can modify
CREATE POLICY service_areas_admin ON public.service_areas
  FOR ALL USING (is_super_admin());

-- =========================================================
-- suppliers
-- =========================================================

-- Dispatchers can read all suppliers
CREATE POLICY suppliers_select_dispatcher ON public.suppliers
  FOR SELECT USING (is_dispatcher());

-- Supplier users can read their own record
CREATE POLICY suppliers_select_own ON public.suppliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'supplier_user'
    )
    -- Note: add supplier_users table linking user_id to supplier_id when needed
  );

-- Only dispatcher+ can write
CREATE POLICY suppliers_write_dispatcher ON public.suppliers
  FOR INSERT WITH CHECK (is_dispatcher());

CREATE POLICY suppliers_update_dispatcher ON public.suppliers
  FOR UPDATE USING (is_dispatcher());

-- =========================================================
-- supplier_locations
-- =========================================================

CREATE POLICY sup_locations_select_dispatcher ON public.supplier_locations
  FOR SELECT USING (is_dispatcher());

-- Contractors can read locations (needed for ETA display)
CREATE POLICY sup_locations_select_contractor ON public.supplier_locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('contractor', 'driver'))
  );

CREATE POLICY sup_locations_write_dispatcher ON public.supplier_locations
  FOR ALL USING (is_dispatcher());

-- =========================================================
-- companies
-- =========================================================

-- Dispatchers see all
CREATE POLICY companies_select_dispatcher ON public.companies
  FOR SELECT USING (is_dispatcher());

-- Contractors see only their own company
CREATE POLICY companies_select_own ON public.companies
  FOR SELECT USING (id = get_my_company_id());

-- Contractors can update limited fields on their own company (not billing_type, stripe_customer_id)
CREATE POLICY companies_update_own ON public.companies
  FOR UPDATE USING (id = get_my_company_id())
  WITH CHECK (
    id = get_my_company_id()
    -- Business logic: contractors cannot change billing_type or stripe_customer_id
    -- Enforce in API layer for finer control
  );

-- Only super_admin can insert/delete companies or change billing fields
CREATE POLICY companies_admin ON public.companies
  FOR ALL USING (is_super_admin());

-- =========================================================
-- dispatchers
-- =========================================================

-- Dispatchers can see each other
CREATE POLICY dispatchers_select_dispatcher ON public.dispatchers
  FOR SELECT USING (is_dispatcher());

-- Dispatchers can update their own on_duty status
CREATE POLICY dispatchers_update_own ON public.dispatchers
  FOR UPDATE USING (user_id = auth.uid());

-- super_admin full access
CREATE POLICY dispatchers_admin ON public.dispatchers
  FOR ALL USING (is_super_admin());

-- =========================================================
-- contractors
-- =========================================================

-- Dispatchers see all
CREATE POLICY contractors_select_dispatcher ON public.contractors
  FOR SELECT USING (is_dispatcher());

-- Contractors see only their own row
CREATE POLICY contractors_select_own ON public.contractors
  FOR SELECT USING (user_id = auth.uid());

-- Contractors can update their own profile
CREATE POLICY contractors_update_own ON public.contractors
  FOR UPDATE USING (user_id = auth.uid());

-- Only dispatcher+ can insert contractor records (after company setup)
CREATE POLICY contractors_insert_dispatcher ON public.contractors
  FOR INSERT WITH CHECK (is_dispatcher());

-- =========================================================
-- drivers
-- =========================================================

-- Dispatchers see all drivers
CREATE POLICY drivers_select_dispatcher ON public.drivers
  FOR SELECT USING (is_dispatcher());

-- Drivers see their own record
CREATE POLICY drivers_select_own ON public.drivers
  FOR SELECT USING (user_id = auth.uid());

-- Drivers can update their own status and location fields
CREATE POLICY drivers_update_own ON public.drivers
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- API layer enforces: drivers can only set status to available/offline (not assigned/delivering)
  );

-- Dispatchers can update any driver
CREATE POLICY drivers_update_dispatcher ON public.drivers
  FOR UPDATE USING (is_dispatcher());

-- Only super_admin can insert/delete drivers
CREATE POLICY drivers_admin ON public.drivers
  FOR ALL USING (is_super_admin());

-- =========================================================
-- parts
-- =========================================================

-- All authenticated users can read parts (needed for search, lookup)
CREATE POLICY parts_select_all ON public.parts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only dispatchers can write
CREATE POLICY parts_write_dispatcher ON public.parts
  FOR INSERT WITH CHECK (is_dispatcher());

CREATE POLICY parts_update_dispatcher ON public.parts
  FOR UPDATE USING (is_dispatcher());

-- =========================================================
-- equipment_models
-- =========================================================

-- All authenticated users can read (model lookup is public-ish)
CREATE POLICY equip_models_select_all ON public.equipment_models
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY equip_models_write_dispatcher ON public.equipment_models
  FOR ALL USING (is_dispatcher());

-- =========================================================
-- model_parts_mapping
-- =========================================================

CREATE POLICY model_parts_select_all ON public.model_parts_mapping
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY model_parts_write_dispatcher ON public.model_parts_mapping
  FOR ALL USING (is_dispatcher());

-- =========================================================
-- pricing_rules
-- =========================================================

-- Dispatchers can read pricing rules
CREATE POLICY pricing_select_dispatcher ON public.pricing_rules
  FOR SELECT USING (is_dispatcher());

-- Contractors can read active pricing rules (for estimate display)
CREATE POLICY pricing_select_contractor ON public.pricing_rules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'contractor')
    AND is_active = true
  );

-- Only super_admin can modify pricing
CREATE POLICY pricing_write_admin ON public.pricing_rules
  FOR ALL USING (is_super_admin());

-- =========================================================
-- orders  [MOST CRITICAL TABLE]
-- =========================================================

-- Dispatchers can do everything
CREATE POLICY orders_all_dispatcher ON public.orders
  FOR ALL USING (is_dispatcher());

-- Contractors can SELECT their own company's orders
CREATE POLICY orders_select_contractor ON public.orders
  FOR SELECT USING (company_id = get_my_company_id());

-- Contractors can INSERT new orders
CREATE POLICY orders_insert_contractor ON public.orders
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND contractor_id = get_my_contractor_id()
    AND status = 'new_request'  -- cannot insert into a non-initial status
  );

-- Contractors can UPDATE only notes and cancel before driver_assigned
-- (fine-grained cancellation logic enforced in API layer)
CREATE POLICY orders_update_contractor_cancel ON public.orders
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND status IN ('new_request', 'confirming_supplier')  -- can only cancel/edit before confirmed
  )
  WITH CHECK (
    company_id = get_my_company_id()
    AND status IN ('new_request', 'confirming_supplier', 'cancelled')
  );

-- Drivers can SELECT their assigned orders only
CREATE POLICY orders_select_driver ON public.orders
  FOR SELECT USING (driver_id = get_my_driver_id());

-- Drivers can UPDATE status for their assigned orders (picked_up, en_route, delivered, issue)
CREATE POLICY orders_update_driver ON public.orders
  FOR UPDATE USING (driver_id = get_my_driver_id())
  WITH CHECK (
    driver_id = get_my_driver_id()
    AND status IN ('picked_up', 'en_route', 'delivered', 'issue')
    AND (SELECT status FROM public.orders WHERE id = NEW.id)
        IN ('driver_assigned', 'picked_up', 'en_route')
  );

-- =========================================================
-- order_items
-- =========================================================

-- Order items follow the same access as orders
CREATE POLICY order_items_select_dispatcher ON public.order_items
  FOR SELECT USING (
    is_dispatcher()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (
        o.company_id = get_my_company_id()
        OR o.driver_id = get_my_driver_id()
      )
    )
  );

CREATE POLICY order_items_insert_contractor ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.company_id = get_my_company_id()
    )
  );

CREATE POLICY order_items_admin ON public.order_items
  FOR ALL USING (is_dispatcher());

-- =========================================================
-- delivery_events
-- =========================================================

-- Dispatchers see all events
CREATE POLICY delivery_events_select_dispatcher ON public.delivery_events
  FOR SELECT USING (is_dispatcher());

-- Contractors see events for their orders
CREATE POLICY delivery_events_select_contractor ON public.delivery_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.company_id = get_my_company_id()
    )
  );

-- Drivers see events for assigned orders
CREATE POLICY delivery_events_select_driver ON public.delivery_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.driver_id = get_my_driver_id()
    )
  );

-- Only system/service_role can INSERT (via triggers and SECURITY DEFINER functions)
-- Application code uses service_role key for event inserts through API routes
CREATE POLICY delivery_events_insert_system ON public.delivery_events
  FOR INSERT WITH CHECK (is_dispatcher());

-- =========================================================
-- driver_assignments
-- =========================================================

CREATE POLICY driver_asgn_select_dispatcher ON public.driver_assignments
  FOR SELECT USING (is_dispatcher());

CREATE POLICY driver_asgn_select_driver ON public.driver_assignments
  FOR SELECT USING (driver_id = get_my_driver_id());

CREATE POLICY driver_asgn_write_dispatcher ON public.driver_assignments
  FOR ALL USING (is_dispatcher());

-- =========================================================
-- uploaded_files
-- =========================================================

-- Dispatchers see all files
CREATE POLICY files_select_dispatcher ON public.uploaded_files
  FOR SELECT USING (is_dispatcher());

-- Users can see their own uploads
CREATE POLICY files_select_own ON public.uploaded_files
  FOR SELECT USING (uploader_id = auth.uid());

-- Contractors can see files for their orders
CREATE POLICY files_select_contractor ON public.uploaded_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.company_id = get_my_company_id()
    )
  );

-- Drivers can see files for their assigned orders
CREATE POLICY files_select_driver ON public.uploaded_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.driver_id = get_my_driver_id()
    )
  );

-- Contractors can upload for their own orders
CREATE POLICY files_insert_contractor ON public.uploaded_files
  FOR INSERT WITH CHECK (
    uploader_id = auth.uid()
    AND (
      order_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.company_id = get_my_company_id()
      )
    )
  );

-- Drivers can upload POD photos for their assigned orders
CREATE POLICY files_insert_driver ON public.uploaded_files
  FOR INSERT WITH CHECK (
    uploader_id = auth.uid()
    AND is_driver()
    AND (
      file_type = 'proof_of_delivery'
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.driver_id = get_my_driver_id()
      )
    )
  );

-- =========================================================
-- notifications
-- =========================================================

-- Users see their own notifications
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Dispatchers see all notifications
CREATE POLICY notifications_select_dispatcher ON public.notifications
  FOR SELECT USING (is_dispatcher());

-- Only system/service_role can insert notifications (via API routes)
CREATE POLICY notifications_insert_dispatcher ON public.notifications
  FOR INSERT WITH CHECK (is_dispatcher());

-- =========================================================
-- payment_records
-- =========================================================

-- Dispatchers see all payment records
CREATE POLICY payments_select_dispatcher ON public.payment_records
  FOR SELECT USING (is_dispatcher());

-- Contractors see their company's payment records
CREATE POLICY payments_select_contractor ON public.payment_records
  FOR SELECT USING (company_id = get_my_company_id());

-- Only super_admin and dispatcher can insert/update payment records
-- (Stripe webhooks use service_role key)
CREATE POLICY payments_write_dispatcher ON public.payment_records
  FOR ALL USING (is_dispatcher());

-- =========================================================
-- proof_of_delivery
-- =========================================================

-- Dispatchers see all PODs
CREATE POLICY pod_select_dispatcher ON public.proof_of_delivery
  FOR SELECT USING (is_dispatcher());

-- Contractors see PODs for their orders
CREATE POLICY pod_select_contractor ON public.proof_of_delivery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.company_id = get_my_company_id()
    )
  );

-- Drivers can see and insert PODs for their assigned orders
CREATE POLICY pod_select_driver ON public.proof_of_delivery
  FOR SELECT USING (driver_id = get_my_driver_id());

CREATE POLICY pod_insert_driver ON public.proof_of_delivery
  FOR INSERT WITH CHECK (
    driver_id = get_my_driver_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.driver_id = get_my_driver_id()
        AND o.status = 'en_route'  -- can only submit POD when en_route
    )
  );

-- =========================================================
-- activity_logs
-- =========================================================

-- Only super_admin can read activity logs
CREATE POLICY activity_logs_admin ON public.activity_logs
  FOR SELECT USING (is_super_admin());

-- Insert via service_role in API routes (no user-facing insert policy)
-- activity_logs has no user INSERT policy — only service_role writes here

-- =========================================================
-- STORAGE BUCKET POLICIES
-- (Run in Supabase Storage settings or SQL Editor)
-- =========================================================

-- Create buckets (run once)
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('order-photos', 'order-photos', false),
--   ('proof-of-delivery', 'proof-of-delivery', false),
--   ('avatars', 'avatars', true);

-- order-photos: contractors upload, dispatchers read all, contractors read own orders
CREATE POLICY "order_photos_insert_contractor" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'order-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('contractor', 'dispatcher', 'super_admin'))
  );

CREATE POLICY "order_photos_select_dispatcher" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'order-photos'
    AND (
      is_dispatcher()
      OR (
        -- Contractors can read files in their order's folder
        -- Storage path convention: order-photos/{order_id}/filename
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id::TEXT = (string_to_array(name, '/'))[1]
            AND o.company_id = get_my_company_id()
        )
      )
    )
  );

-- proof-of-delivery: drivers upload, dispatchers + order's contractor can read
CREATE POLICY "pod_insert_driver" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'proof-of-delivery'
    AND auth.role() = 'authenticated'
    AND is_driver()
  );

CREATE POLICY "pod_select_authorized" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'proof-of-delivery'
    AND (
      is_dispatcher()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::TEXT = (string_to_array(name, '/'))[1]
          AND (
            o.company_id = get_my_company_id()
            OR o.driver_id = get_my_driver_id()
          )
      )
    )
  );

-- avatars: public read, owner write
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
