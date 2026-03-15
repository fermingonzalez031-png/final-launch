# Prodrop HQ — MVP

On-demand parts delivery for HVAC, plumbing, and electrical contractors.  
Serving Westchester County and the Bronx.

---

## Quick deploy (30 minutes)

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) → New project → `prodrop-hq`
2. SQL Editor → paste and run `supabase/migrations/01_schema.sql`
3. SQL Editor → paste and run `supabase/migrations/02_rls_policies.sql`
4. SQL Editor → paste and run `supabase/migrations/seed.sql`
5. Storage → Create three private buckets: `order-photos`, `proof-of-delivery`, `avatars`
6. Authentication → Settings → Enable Email provider
7. Dashboard → Settings → API → copy Project URL and anon key

### Step 2 — Create demo users

In Supabase Dashboard → Authentication → Users → Add user:

| Email | Password | Then update role |
|---|---|---|
| `dispatcher@prodrophq.net` | `demo123` | `UPDATE users SET role='dispatcher' WHERE email='dispatcher@prodrophq.net';` |
| `contractor@prodrophq.net` | `demo123` | Leave as `contractor` (default) |
| `driver@prodrophq.net` | `demo123` | `UPDATE users SET role='driver' WHERE email='driver@prodrophq.net';` |

After creating the contractor user, link them to a company:
```sql
INSERT INTO public.contractors (user_id, company_id, phone_direct, is_primary_contact)
SELECT u.id, '22222222-0000-0000-0000-000000000001', '9145550198', true
FROM public.users u WHERE u.email = 'contractor@prodrophq.net';
```

After creating the driver user, create their driver record:
```sql
INSERT INTO public.drivers (user_id, vehicle_make, vehicle_model, vehicle_year, vehicle_color, driver_status)
SELECT id, 'Toyota', 'Camry', 2021, 'Silver', 'available'
FROM public.users WHERE email = 'driver@prodrophq.net';
```

### Step 3 — Deploy to Vercel

```bash
# Clone or push to GitHub first, then:
vercel --prod
```

Or import from Vercel dashboard → Add New Project → Import your GitHub repo.

Add these environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Optional (for SMS notifications):
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+19145550100
DISPATCH_ALERT_PHONE=+19145550199
```

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  ← Public homepage
│   ├── login/page.tsx            ← Login
│   ├── register/page.tsx         ← Contractor registration
│   ├── track/page.tsx            ← Public order tracking
│   ├── dashboard/                ← Contractor portal
│   │   ├── page.tsx
│   │   └── orders/
│   │       ├── new/page.tsx      ← New order form
│   │       └── [id]/page.tsx     ← Order detail
│   ├── dispatch/                 ← Dispatcher portal
│   │   ├── page.tsx              ← Kanban board (main dispatch view)
│   │   ├── drivers/page.tsx      ← Driver management
│   │   └── analytics/page.tsx    ← Metrics
│   ├── driver/                   ← Driver portal
│   │   ├── page.tsx              ← Active deliveries
│   │   ├── deliveries/[id]/page.tsx ← Delivery detail + POD
│   │   └── history/page.tsx
│   └── api/
│       ├── auth/register/        ← Create user + company
│       ├── orders/               ← CRUD + status updates
│       ├── dispatch/board/       ← Kanban data
│       ├── dispatch/metrics/     ← Dashboard stats
│       ├── drivers/              ← Driver management
│       ├── uploads/proof-of-delivery/
│       └── service-areas/        ← ZIP validation
├── components/
│   ├── ui/index.tsx              ← Badge, Button, Card, Input, Select, StatusBadge, PriorityBadge
│   └── layout/AppShell.tsx       ← Sidebar + mobile nav
├── lib/
│   ├── supabase/                 ← client.ts, server.ts, admin.ts
│   ├── types/index.ts            ← All TypeScript types
│   └── utils/
│       ├── index.ts              ← Constants, formatters, helpers
│       └── sms.ts                ← Twilio SMS helper
└── middleware.ts                 ← Auth + role-based redirects
```

---

## User roles

| Role | Access |
|---|---|
| `contractor` | `/dashboard` — submit orders, track deliveries, view history |
| `dispatcher` | `/dispatch` — Kanban board, assign suppliers/drivers, manage operations |
| `driver` | `/driver` — view assignments, mark pickup/delivery, upload POD |
| `super_admin` | Full access to all portals |

---

## Order lifecycle

```
new_request → confirming_supplier → supplier_confirmed → driver_assigned → picked_up → en_route → delivered
                                         ↓
                                      issue / cancelled
```

Every status transition:
- Updates `orders.status`
- Inserts a row in `delivery_events`
- Syncs `drivers.driver_status`
- Sends Twilio SMS to contractor (if configured)

---

## SMS notifications (optional)

Without Twilio credentials the app works fully — SMS calls are silently skipped.  
To enable: add Twilio env vars to Vercel. The `DISPATCH_ALERT_PHONE` receives alerts for every new order.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase credentials
npm run dev
```

Visit `http://localhost:3000`
