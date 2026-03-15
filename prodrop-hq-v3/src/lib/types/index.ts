export type UserRole = 'super_admin' | 'dispatcher' | 'contractor' | 'driver' | 'supplier_user'

export type OrderStatus =
  | 'new_request' | 'confirming_supplier' | 'supplier_confirmed'
  | 'driver_assigned' | 'picked_up' | 'en_route'
  | 'delivered' | 'issue' | 'cancelled'

export type OrderPriority = 'standard' | 'rush' | 'emergency'
export type DriverStatus = 'available' | 'assigned' | 'on_pickup' | 'delivering' | 'offline'
export type PaymentStatus = 'pending' | 'charged' | 'failed' | 'refunded'

export interface User {
  id: string
  email: string
  phone?: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Company {
  id: string
  name: string
  trade_type: string
  phone?: string
  email?: string
  city?: string
  state: string
  zip?: string
  stripe_customer_id?: string
  is_active: boolean
  total_orders: number
}

export interface Contractor {
  id: string
  user_id: string
  company_id: string
  title?: string
  phone_direct?: string
  is_primary_contact: boolean
  users?: User
  companies?: Company
}

export interface Driver {
  id: string
  user_id: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_year?: number
  vehicle_color?: string
  license_plate?: string
  driver_status: DriverStatus
  current_lat?: number
  current_lng?: number
  total_deliveries: number
  notes?: string
  users?: User
}

export interface Supplier {
  id: string
  name: string
  trade_type: string
  primary_contact?: string
  phone?: string
  email?: string
  is_active: boolean
}

export interface SupplierLocation {
  id: string
  supplier_id: string
  branch_name?: string
  address: string
  city?: string
  zip?: string
  lat?: number
  lng?: number
  hours_text?: string
  is_default: boolean
  suppliers?: Supplier
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  priority: OrderPriority
  company_id: string
  contractor_id: string
  supplier_id?: string
  supplier_location_id?: string
  driver_id?: string
  dispatcher_id?: string
  jobsite_address: string
  jobsite_lat?: number
  jobsite_lng?: number
  part_description: string
  equipment_brand?: string
  model_number?: string
  delivery_price?: number
  total_amount?: number
  distance_miles?: number
  is_after_hours: boolean
  eta_minutes?: number
  eta_timestamp?: string
  requested_at: string
  confirmed_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  cancelled_at?: string
  cancellation_reason?: string
  issue_description?: string
  payment_status: PaymentStatus
  notes?: string
  // joined
  companies?: Company
  contractors?: { users?: User }
  suppliers?: Supplier
  supplier_locations?: SupplierLocation
  drivers?: Driver & { users?: User }
}

export interface DeliveryEvent {
  id: string
  order_id: string
  event_type: string
  from_status?: OrderStatus
  to_status?: OrderStatus
  actor_id?: string
  actor_role?: string
  notes?: string
  created_at: string
}

export interface ProofOfDelivery {
  id: string
  order_id: string
  driver_id: string
  photo_url: string
  delivery_lat?: number
  delivery_lng?: number
  recipient_name?: string
  notes?: string
  submitted_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  order_id?: string
  channel: string
  type: string
  body: string
  status: string
  sent_at?: string
}

export interface DispatchMetrics {
  active_orders: number
  new_requests: number
  en_route_now: number
  delivered_today: number
  total_drivers: number
  available_drivers: number
  revenue_today: number
}

export interface ServiceArea {
  id: string
  name: string
  zip_codes: string[]
  cities: string[]
  is_active: boolean
}
