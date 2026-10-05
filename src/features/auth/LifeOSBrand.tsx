/** Left-panel LifeOS brand showcase with choreographed entrance. */
export default function LifeOSBrand() {
  return (
    <div className="ax-brand">
      <div className="ax-logo ax-enter ax-enter-rise" style={{ animationDelay: '200ms' }}>
        <svg viewBox="0 0 40 40" className="ax-logo-mark" aria-hidden="true">
          <defs>
            <linearGradient id="ax-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d3ee6" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill="url(#ax-grad)" />
          <circle cx="20" cy="20" r="7" fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.95" />
          <circle cx="20" cy="20" r="2.5" fill="#fff" fillOpacity="0.95" />
        </svg>
        <span className="ax-logo-text">LifeOS</span>
      </div>

      <div className="ax-tagline">
        <h2 className="ax-headline ax-enter ax-enter-rise" style={{ animationDelay: '450ms' }}>Don't manage your life.</h2>
        <h2 className="ax-headline ax-headline-2 ax-enter ax-enter-rise" style={{ animationDelay: '650ms' }}>Understand it.</h2>
      </div>

      <p className="ax-support ax-enter ax-enter-rise" style={{ animationDelay: '900ms' }}>
        Your personal operating system — capture, plan, act, measure, reflect and learn across every domain of life, powered by the LifeOS Agent.
      </p>

      <div className="ax-features">
        {[
          { d: '1050ms', t: 'Goals, projects & milestones with real measurement' },
          { d: '1150ms', t: 'Calendar, capacity & deadline intelligence' },
          { d: '1250ms', t: 'LifeOS Agent — your AI life operator with real tools' },
        ].map((f) => (
          <div key={f.t} className="ax-feature ax-enter ax-enter-rise" style={{ animationDelay: f.d }}>
            <span className="ax-feature-dot" />
            <span>{f.t}</span>
          </div>
        ))}
      </div>

      <div className="ax-brand-footer ax-enter ax-enter-fade" style={{ animationDelay: '1400ms' }}>Encrypted · Private · Yours</div>
    </div>
  );
}
