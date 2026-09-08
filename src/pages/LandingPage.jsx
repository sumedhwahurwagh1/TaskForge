import { Link } from 'react-router-dom';
import { BookOpen, FileText, Megaphone, Bot, ArrowRight, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1" />
            <path d="M9 16.5L14 21.5L23 11.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          TaskForge
        </div>
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/dashboard" className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/dashboard" className="btn btn-primary btn-sm">Get Started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1>
          Your academic life, <span>organized.</span>
        </h1>
        <p>
          Track assignments, deadlines, notices and academic activity from one place. TaskForge helps you understand what needs attention first.
        </p>
        <div className="hero-ctas">
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Get Started
            <ArrowRight size={20} />
          </Link>
          <a href="#how-it-works" className="btn btn-secondary btn-lg">
            See How It Works
          </a>
        </div>
      </section>

      {/* Dashboard Preview */}
      <div className="hero-preview">
        <div className="hero-preview-placeholder">
          <div style={{ textAlign: 'center' }}>
            <Zap size={48} style={{ marginBottom: '12px', opacity: 0.6 }} />
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>TaskForge Dashboard</div>
            <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.7, marginTop: '4px' }}>Focus Today • Smart Priorities • Real-time Updates</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="landing-features" id="features">
        <h2>Everything you need to stay on track</h2>
        <p>Powerful features designed for student productivity.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <BookOpen size={24} />
            </div>
            <h3>Subjects</h3>
            <p>Organize your academic workload by subject. Track progress and identify urgent assignments at a glance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <FileText size={24} />
            </div>
            <h3>Assignments</h3>
            <p>Add, track, and complete assignments with smart deadline detection. Never miss a due date again.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
              <Megaphone size={24} />
            </div>
            <h3>Notice Board</h3>
            <p>Stay updated with academic notices, exam schedules, and important announcements in one place.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <Bot size={24} />
            </div>
            <h3>AI Assistant</h3>
            <p>Get contextual recommendations on what to work on next, powered by your actual assignment data.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-how" id="how-it-works">
        <div className="landing-how-inner">
          <h2>How It Works</h2>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-step-number">01</div>
              <h3>Organize</h3>
              <p>Add your assignments, deadlines, and subjects. TaskForge centralizes everything in one place.</p>
            </div>
            <div className="how-step">
              <div className="how-step-number">02</div>
              <h3>Prioritize</h3>
              <p>Focus Today automatically surfaces your most urgent work based on deadlines and priority.</p>
            </div>
            <div className="how-step">
              <div className="how-step-number">03</div>
              <h3>Complete</h3>
              <p>Work through your priorities, mark assignments done, and track your academic progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <h2>Take control of your academic workload</h2>
        <p>Join students who use TaskForge to turn deadlines into done.</p>
        <Link to="/dashboard" className="btn btn-primary btn-lg">
          Get Started — It's Free
          <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 TaskForge. Built for students, by students.</p>
      </footer>
    </div>
  );
}
