import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Airframe Intelligence</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-blue-100">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          AI-powered aircraft research
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
          Research smarter.<br />
          <span className="text-blue-700">Buy with confidence.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste any aircraft listing URL and instantly get FAA registry data, NTSB accident history,
          flight records, and AI-powered red flag analysis — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup" className="btn-primary text-base py-3 px-8">
            Start your hangar — free
          </Link>
          <Link href="/auth/login" className="btn-secondary text-base py-3 px-8">
            Sign in
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">No credit card required. Up to 3 aircraft free.</p>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">How it works</h2>
          <p className="text-slate-500 text-center mb-14 max-w-xl mx-auto">
            From listing URL to full intelligence brief in under 3 minutes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "🔗",
                title: "Paste the listing",
                desc: "Drop in any URL from Trade-A-Plane, Barnstormers, Controller, or AeroTrader. Or enter an N-number directly.",
              },
              {
                step: "02",
                icon: "🔍",
                title: "We do the research",
                desc: "AI extracts listing data and queries FAA registry, NTSB accident history, ADS-B flight records, and more.",
              },
              {
                step: "03",
                icon: "✈️",
                title: "Make better decisions",
                desc: "Your hangar shows every aircraft side-by-side with red flags highlighted — so you know what to ask before the pre-buy.",
              },
            ].map((item) => (
              <div key={item.step} className="card p-6">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Step {item.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Everything you need before the pre-buy</h2>
        <p className="text-slate-500 text-center mb-14 max-w-xl mx-auto">
          We pull from the same government databases the pros use — automatically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "📋", title: "FAA Registry", desc: "Current registration status, ownership history, liens, and title analysis." },
            { icon: "🚨", title: "NTSB Accidents", desc: "Full accident and incident history for the specific N-number — not just the model." },
            { icon: "📡", title: "ADS-B Flight Data", desc: "12 months of flight history. See how hard the plane has been worked." },
            { icon: "🔧", title: "Form 337 Records", desc: "Major repairs and alterations. Know what's been done to the airframe." },
            { icon: "⚠️", title: "Airworthiness Directives", desc: "Applicable ADs for the specific make, model, and engine." },
            { icon: "📸", title: "Avionics ID", desc: "Upload a panel photo and AI identifies every piece of installed avionics." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-5 rounded-xl hover:bg-slate-50 transition-colors">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Simple, honest pricing</h2>
          <p className="text-slate-500 text-center mb-14">A rounding error compared to what you&apos;re about to spend on a pre-buy inspection.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                desc: "Get started, no card needed.",
                features: ["Up to 3 aircraft", "Listing data extraction", "Basic FAA registry", "Hangar dashboard"],
                cta: "Get started free",
                href: "/auth/signup",
                highlight: false,
              },
              {
                name: "Buyer",
                price: "$19",
                period: "/month",
                desc: "For the serious aircraft shopper.",
                features: ["Up to 10 aircraft", "Full FAA enrichment", "NTSB accident history", "ADS-B flight data", "Form 337 records", "Airworthiness Directives", "AI risk summary", "Logbook PDF upload", "Downloadable PDF reports"],
                cta: "Start free trial",
                href: "/auth/signup",
                highlight: true,
              },
              {
                name: "Pro",
                price: "$49",
                period: "/month",
                desc: "For power buyers and future brokers.",
                features: ["Unlimited aircraft", "Everything in Buyer", "Shareable report links", "Avionics panel photo ID", "Priority processing", "Market comparison"],
                cta: "Get Pro",
                href: "/auth/signup",
                highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name} className={`card p-6 flex flex-col ${plan.highlight ? "border-blue-500 border-2 relative" : ""}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full">Most popular</span>
                  </div>
                )}
                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{plan.desc}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={plan.highlight ? "btn-primary text-center text-sm py-2.5" : "btn-secondary text-center text-sm py-2.5"}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">Ready to buy smarter?</h2>
        <p className="text-slate-500 text-lg mb-8">Add your first aircraft in under 60 seconds.</p>
        <Link href="/auth/signup" className="btn-primary text-base py-3 px-10">
          Start for free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Airframe Intelligence</span>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Airframe Intelligence. For informational purposes only. Not a substitute for a pre-buy inspection.</p>
        </div>
      </footer>
    </div>
  );
}
