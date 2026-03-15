-- =================================================================
-- PRODROP HQ — SEED DATA
-- Run in Supabase SQL Editor AFTER schema migrations
-- Creates: service areas, suppliers, parts, demo users, demo orders
-- =================================================================

-- ── SERVICE AREAS ────────────────────────────────────────────────
INSERT INTO public.service_areas (name, zip_codes, cities, is_active) VALUES
(
  'Westchester County',
  ARRAY['10701','10702','10703','10704','10705','10706','10707','10708','10709','10710',
        '10550','10551','10552','10553','10601','10602','10603','10604','10605','10606','10607',
        '10530','10580','10583','10591','10595','10598','10543','10562','10566','10570'],
  ARRAY['Yonkers','White Plains','Mount Vernon','New Rochelle','Scarsdale',
        'Tarrytown','Ossining','Pleasantville','Ardsley','Dobbs Ferry',
        'Hastings-on-Hudson','Bronxville','Larchmont','Mamaroneck','Port Chester','Rye'],
  true
),
(
  'The Bronx',
  ARRAY['10451','10452','10453','10454','10455','10456','10457','10458','10459','10460',
        '10461','10462','10463','10464','10465','10466','10467','10468','10469','10470',
        '10471','10472','10473','10474','10475'],
  ARRAY['Bronx'],
  true
);

-- ── PRICING RULES ────────────────────────────────────────────────
INSERT INTO public.pricing_rules (name, priority_type, base_price, mileage_rate, mileage_threshold_miles, after_hours_surcharge, is_active) VALUES
  ('Standard Delivery',  'standard',  35.00, 1.50, 5, 15.00, true),
  ('Rush Delivery',      'rush',      50.00, 2.00, 5, 20.00, true),
  ('Emergency Delivery', 'emergency', 75.00, 2.50, 3, 25.00, true);

-- ── SUPPLIERS ────────────────────────────────────────────────────
INSERT INTO public.suppliers (id, name, trade_type, primary_contact, phone, email, account_number, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Johnstone Supply', 'hvac',     'Dave K.',   '9145551001', 'dave@johnstonesupply.com', 'PROD-001', true),
  ('11111111-0000-0000-0000-000000000002', 'Ferguson HVAC',    'hvac',     'Lisa M.',   '9145551002', 'lisa@ferguson.com',        'PROD-002', true),
  ('11111111-0000-0000-0000-000000000003', 'ABCO HVACR',       'mixed',    'Ray P.',    '7185551003', 'ray@abcohvacr.com',        'PROD-003', true),
  ('11111111-0000-0000-0000-000000000004', 'Westchester Plumbing Supply', 'plumbing', 'Tom B.', '9145551004', 'tom@wcplumbing.com', 'PROD-004', true);

INSERT INTO public.supplier_locations (supplier_id, branch_name, address, city, zip, lat, lng, hours_text, is_default, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Yonkers Branch',     '123 Central Ave',    'Yonkers',      '10701', 40.9312, -73.8988, 'Mon-Fri 7AM-5PM, Sat 8AM-2PM', true,  true),
  ('11111111-0000-0000-0000-000000000001', 'White Plains Branch','456 Mamaroneck Ave', 'White Plains', '10601', 41.0340, -73.7629, 'Mon-Fri 7AM-5PM',              false, true),
  ('11111111-0000-0000-0000-000000000002', 'Mount Vernon',       '200 S Columbus Ave', 'Mount Vernon', '10550', 40.9126, -73.8330, 'Mon-Fri 7AM-5PM',              true,  true),
  ('11111111-0000-0000-0000-000000000003', 'Bronx Location',     '888 Morris Ave',     'Bronx',        '10451', 40.8448, -73.9076, 'Mon-Fri 7:30AM-4:30PM',        true,  true),
  ('11111111-0000-0000-0000-000000000004', 'Yonkers Plumbing',   '55 Warburton Ave',   'Yonkers',      '10701', 40.9280, -73.8950, 'Mon-Fri 7AM-5PM',              true,  true);

-- ── PARTS CATALOG ────────────────────────────────────────────────
INSERT INTO public.parts (name, brand, category, manufacturer_part_number, voltage, mfd_rating, compatible_brands, search_keywords) VALUES
  ('40/5 MFD 370/440V Dual Run Capacitor', 'Genteq',       'capacitor',     '97F9895',    '370/440V', '40/5 MFD', ARRAY['Goodman','Amana','Daikin'],   'capacitor dual run 40 5 mfd hvac ac'),
  ('35/5 MFD 440V Dual Run Capacitor',     'Mars',         'capacitor',     'MRC-35-5',   '440V',     '35/5 MFD', ARRAY['Carrier','Bryant'],            'capacitor dual run 35 5 mfd'),
  ('45/5 MFD 440V Round Capacitor',        'Titan',        'capacitor',     'TT-CRC-45',  '440V',     '45/5 MFD', ARRAY['Trane','American Standard'],   'capacitor round 45 5'),
  ('40A 24V Single Pole Contactor',        'Honeywell',    'contactor',     'R8242A1032', '24V',      NULL,       ARRAY['Goodman','Carrier','Lennox'],  'contactor 40 amp 24 volt'),
  ('Navien NCB-240 Igniter',               'Navien',       'igniter',       '30010464A',  '120V',     NULL,       ARRAY['Navien'],                     'igniter navien ncb 240 boiler'),
  ('Universal HSI Furnace Igniter',        'White-Rodgers','igniter',       '21D64-2',    '120V',     NULL,       ARRAY['Carrier','Bryant','Payne'],    'igniter hot surface furnace 120v'),
  ('Universal Flame Sensor Rod',           'White-Rodgers','flame_sensor',  '768A-844',   NULL,       NULL,       ARRAY['Carrier','Lennox','Trane'],    'flame sensor rod furnace'),
  ('Taco 007-F5 Bronze Circulator Pump',   'Taco',         'pump',          '007-F5',     '115V',     NULL,       ARRAY['Taco'],                       'circulator pump boiler taco 007 hydronic'),
  ('Grundfos UP15-18SU Circulator Pump',   'Grundfos',     'pump',          'UP15-18SU',  '115V',     NULL,       ARRAY['Grundfos'],                   'grundfos pump circulator hydronic boiler'),
  ('Honeywell T6 Pro Thermostat',          'Honeywell',    'thermostat',    'TH6320U2008','24V',      NULL,       ARRAY['Honeywell','All'],             'thermostat honeywell programmable t6 pro'),
  ('Ecobee SmartThermostat Premium',       'Ecobee',       'thermostat',    'EB-STATE6-01','24V',     NULL,       ARRAY['All'],                        'ecobee smart thermostat wifi'),
  ('3/4 HP ECM Blower Motor 5-Speed',      'Genteq',       'motor',         '5SME39HL0252','120/240V',NULL,       ARRAY['Carrier','Bryant','Payne'],    'blower motor ecm 3/4 hp 5 speed'),
  ('Goodman GSXC18 Control Board',         'Goodman',      'control_board', 'PCBDM133S',  NULL,       NULL,       ARRAY['Goodman','Amana'],             'control board goodman gsxc18'),
  ('R-410A Refrigerant 25 lb Cylinder',    'Chemours',     'refrigerant',   'R410A-25',   NULL,       NULL,       ARRAY['All'],                        'r410a refrigerant 25 pound freon');

-- ── EQUIPMENT MODELS ─────────────────────────────────────────────
INSERT INTO public.equipment_models (brand, model_number, model_series, system_type, fuel_type, btu_range, refrigerant, tonnage) VALUES
  ('Goodman',     'GSXC18-036',   'GSXC18',  'central_ac',   'electric', '36000',  'R-410A', 3.0),
  ('Goodman',     'GSXC18-048',   'GSXC18',  'central_ac',   'electric', '48000',  'R-410A', 4.0),
  ('Navien',      'NCB-240',      'NCB',     'water_heater',  'gas',      '199000', NULL,     NULL),
  ('Navien',      'NCB-180',      'NCB',     'water_heater',  'gas',      '150000', NULL,     NULL),
  ('Carrier',     '58STA090',     '58STA',   'furnace',       'gas',      '90000',  NULL,     NULL),
  ('Carrier',     '58STA070',     '58STA',   'furnace',       'gas',      '70000',  NULL,     NULL),
  ('Mitsubishi',  'MSZ-FH12NA',   'MSZ-FH',  'mini_split',    'electric', '12000',  'R-410A', 1.0),
  ('Trane',       'XR80-090',     'XR80',    'furnace',       'gas',      '90000',  NULL,     NULL),
  ('Lennox',      'SL280UHV070',  'SL280',   'furnace',       'gas',      '70000',  NULL,     NULL);

-- Map parts to equipment models
INSERT INTO public.model_parts_mapping (equipment_model_id, part_id, match_type)
SELECT em.id, p.id, 'exact_oem'
FROM public.equipment_models em, public.parts p
WHERE em.model_series = 'GSXC18' AND p.manufacturer_part_number = '97F9895';

INSERT INTO public.model_parts_mapping (equipment_model_id, part_id, match_type)
SELECT em.id, p.id, 'exact_oem'
FROM public.equipment_models em, public.parts p
WHERE em.model_number = 'NCB-240' AND p.manufacturer_part_number = '30010464A';

INSERT INTO public.model_parts_mapping (equipment_model_id, part_id, match_type)
SELECT em.id, p.id, 'exact_oem'
FROM public.equipment_models em, public.parts p
WHERE em.model_series = '58STA' AND p.manufacturer_part_number = '21D64-2';

INSERT INTO public.model_parts_mapping (equipment_model_id, part_id, match_type)
SELECT em.id, p.id, 'compatible'
FROM public.equipment_models em, public.parts p
WHERE em.model_series = '58STA' AND p.manufacturer_part_number = '768A-844';

-- ── DEMO USERS ───────────────────────────────────────────────────
-- NOTE: Create these users through Supabase Auth dashboard or use the
-- register endpoint. Then run the UPDATE below to set roles.
-- Demo email/password pairs to create:
--   dispatcher@prodrophq.net  / demo123  → role: dispatcher
--   contractor@prodrophq.net  / demo123  → role: contractor
--   driver@prodrophq.net      / demo123  → role: driver
--
-- After creating via Supabase Auth, update roles:

-- UPDATE public.users SET role = 'dispatcher' WHERE email = 'dispatcher@prodrophq.net';
-- UPDATE public.users SET role = 'driver'     WHERE email = 'driver@prodrophq.net';

-- ── DEMO COMPANY (for contractor demo account) ────────────────────
INSERT INTO public.companies (id, name, trade_type, phone, city, state, zip, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Rivera HVAC Services', 'hvac', '9145550198', 'Yonkers', 'NY', '10701', true),
  ('22222222-0000-0000-0000-000000000002', 'Bronx Best HVAC',      'hvac', '7185550311', 'Bronx',   'NY', '10451', true),
  ('22222222-0000-0000-0000-000000000003', 'Yonkers Plumbing Co.', 'plumbing', '9145550477', 'Yonkers', 'NY', '10703', true);

-- ── DEMO ORDERS ──────────────────────────────────────────────────
-- These will show on the dispatch board immediately
-- Contractor/driver IDs must be replaced with real UUIDs after user creation
-- For now insert with placeholder company IDs (will show in board without contractor link)

DO $$
DECLARE
  comp1 UUID := '22222222-0000-0000-0000-000000000001';
  comp2 UUID := '22222222-0000-0000-0000-000000000002';
  comp3 UUID := '22222222-0000-0000-0000-000000000003';
  sup1  UUID := '11111111-0000-0000-0000-000000000001';
  sup2  UUID := '11111111-0000-0000-0000-000000000002';
  sup3  UUID := '11111111-0000-0000-0000-000000000003';
  o1    UUID; o2 UUID; o3 UUID; o4 UUID; o5 UUID;
BEGIN
  -- New request (waiting for dispatch)
  INSERT INTO public.orders (company_id, status, priority, jobsite_address, part_description, equipment_brand, model_number, delivery_price, total_amount, is_after_hours, notes)
  VALUES (comp2, 'new_request', 'rush', '1240 Grand Concourse, Bronx NY 10456', 'ECM Blower Motor 3/4 HP 5-speed', 'Carrier', '58STA090', 50.00, 50.00, false, 'Tenant has no AC — urgent')
  RETURNING id INTO o1;

  -- Confirming supplier
  INSERT INTO public.orders (company_id, status, priority, jobsite_address, part_description, equipment_brand, delivery_price, total_amount, is_after_hours)
  VALUES (comp3, 'confirming_supplier', 'standard', '312 Central Park Ave, Scarsdale NY 10583', 'Honeywell 40A Contactor 24V single pole', 'Honeywell', 35.00, 35.00, false)
  RETURNING id INTO o2;

  -- Supplier confirmed, ready for driver
  INSERT INTO public.orders (company_id, supplier_id, status, priority, jobsite_address, part_description, equipment_brand, model_number, delivery_price, total_amount, eta_minutes, is_after_hours)
  VALUES (comp1, sup1, 'supplier_confirmed', 'standard', '88 Warburton Ave, Yonkers NY 10701', 'Taco 007-F5 Bronze Circulator Pump', 'Taco', '007-F5', 35.00, 35.00, 60, false)
  RETURNING id INTO o3;

  -- Delivered (today)
  INSERT INTO public.orders (company_id, supplier_id, status, priority, jobsite_address, part_description, equipment_brand, model_number, delivery_price, total_amount, is_after_hours, picked_up_at, delivered_at)
  VALUES (comp1, sup2, 'delivered', 'rush', '500 Mamaroneck Ave, White Plains NY 10605', 'Navien NCB-240 Igniter', 'Navien', 'NCB-240', 50.00, 50.00, false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour')
  RETURNING id INTO o4;

  -- Another new request (emergency)
  INSERT INTO public.orders (company_id, status, priority, jobsite_address, part_description, equipment_brand, delivery_price, total_amount, is_after_hours, notes)
  VALUES (comp2, 'new_request', 'emergency', '15 N 4th Ave, Mount Vernon NY 10550', 'Control Board — Goodman GSXC18', 'Goodman', 75.00, 75.00, false, 'System completely down — elderly patient in building')
  RETURNING id INTO o5;

  -- Delivery events for demo orders
  INSERT INTO public.delivery_events (order_id, event_type, to_status, actor_role) VALUES
    (o1, 'status_change', 'new_request',         'system'),
    (o2, 'status_change', 'new_request',         'system'),
    (o2, 'status_change', 'confirming_supplier', 'dispatcher'),
    (o3, 'status_change', 'new_request',         'system'),
    (o3, 'status_change', 'confirming_supplier', 'dispatcher'),
    (o3, 'status_change', 'supplier_confirmed',  'dispatcher'),
    (o4, 'status_change', 'new_request',         'system'),
    (o4, 'status_change', 'confirming_supplier', 'dispatcher'),
    (o4, 'status_change', 'supplier_confirmed',  'dispatcher'),
    (o4, 'status_change', 'driver_assigned',     'dispatcher'),
    (o4, 'status_change', 'picked_up',           'driver'),
    (o4, 'status_change', 'en_route',            'driver'),
    (o4, 'status_change', 'delivered',           'driver'),
    (o5, 'status_change', 'new_request',         'system');
END $$;
