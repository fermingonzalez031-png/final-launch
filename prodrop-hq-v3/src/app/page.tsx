import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-brand-400">pro</span><span className="text-gray-900">drop</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/how-it-works" className="hover:text-gray-900">How it works</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/service-areas" className="hover:text-gray-900">Service areas</Link>
            <Link href="/track" className="hover:text-gray-900">Track order</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log in</Link>
            <Link href="/dashboard/orders/new" className="bg-brand-400 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Request Delivery
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gray-900 text-white pt-20 pb-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-brand-800 text-brand-100 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Now serving Westchester County &amp; the Bronx
          </span>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Parts Delivered<br />
            <span className="text-brand-400">Directly to Your Jobsite</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Search parts, request delivery, and get HVAC, plumbing, and electrical parts delivered in 1–2 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/orders/new" className="bg-brand-400 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors">
              Request Delivery
            </Link>
            <Link href="/track" className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              Track Delivery
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            Prefer to text?&nbsp;
            <a href="sms:+19145550100" className="text-brand-400 hover:text-brand-100">Text Prodrop: (914) 555-0100</a>
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How Prodrop works</h2>
          <p className="text-center text-gray-500 mb-14">Three steps. Parts on the way.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Search or submit a request', body: 'Enter the part you need, upload a nameplate photo, or describe the equipment. We handle the rest.' },
              { n: '2', title: 'We confirm availability', body: 'Our team contacts nearby suppliers, confirms stock, and sends you an ETA and price by text.' },
              { n: '3', title: 'Driver delivers to jobsite', body: 'A driver picks up the part and delivers directly to your address — no supply house run required.' },
            ].map(s => (
              <div key={s.n} className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-brand-400 text-white font-bold text-lg flex items-center justify-center mb-5">{s.n}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-brand-600 font-semibold mt-10">Most deliveries arrive within 30–90 minutes.</p>
        </div>
      </section>

      {/* COMMON PARTS */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Common delivery requests</h2>
          <p className="text-center text-gray-500 mb-12">Stay on the job while parts come to you.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['Capacitors & contactors', 'Furnace igniters', 'Boiler circulator pumps', 'Control boards', 'Thermostats', 'Motors & blowers'].map(p => (
              <div key={p} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                <p className="font-semibold text-gray-800 text-sm">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 mb-12">No subscription. Pay per delivery.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="font-bold text-gray-900 text-lg mb-2">Standard Delivery</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$35<span className="text-lg text-gray-400">+</span></div>
              <p className="text-gray-500 text-sm mb-4">Est. 60–90 minutes</p>
              <p className="text-gray-400 text-xs">Based on distance and supplier availability</p>
            </div>
            <div className="border-2 border-brand-400 rounded-2xl p-8 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-400 text-white text-xs font-bold px-3 py-1 rounded-full">Rush</span>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Rush Delivery</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$50<span className="text-lg text-gray-400">+</span></div>
              <p className="text-gray-500 text-sm mb-4">Est. 30–60 minutes</p>
              <p className="text-gray-400 text-xs">Priority dispatch when parts needed urgently</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-brand-400">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Stop driving to supply houses</h2>
          <p className="text-brand-100 mb-10">Get parts delivered fast so you can stay focused on the job.</p>
          <Link href="/dashboard/orders/new" className="bg-white text-brand-800 font-bold px-10 py-4 rounded-xl text-lg hover:bg-brand-50 transition-colors inline-block">
            Request Delivery Now
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-500 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="text-lg font-bold mb-2">
              <span className="text-brand-400">pro</span><span className="text-white">drop</span>
            </div>
            <p className="text-sm">Westchester County &amp; the Bronx</p>
            <p className="text-sm mt-1"><a href="tel:+19145550100" className="hover:text-white">(914) 555-0100</a></p>
            <p className="text-sm"><a href="mailto:support@prodrophq.net" className="hover:text-white">support@prodrophq.net</a></p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-semibold text-gray-300 mb-3">Contractors</p>
              <div className="space-y-2">
                <Link href="/dashboard/orders/new" className="block hover:text-white">Request Delivery</Link>
                <Link href="/track" className="block hover:text-white">Track Delivery</Link>
                <Link href="/how-it-works" className="block hover:text-white">How It Works</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-3">Company</p>
              <div className="space-y-2">
                <Link href="/service-areas" className="block hover:text-white">Service Areas</Link>
                <Link href="/pricing" className="block hover:text-white">Pricing</Link>
                <Link href="/login" className="block hover:text-white">Log In</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 text-xs text-center">
          © {new Date().getFullYear()} Prodrop HQ. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
