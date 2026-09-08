import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, BookOpen, Brain, Database, Code2, Layers3, Network } from 'lucide-react';

const books = [
  { title: 'ALGORITHMS', color: '#c7a4d8', left: '5%', top: '17%', rotate: '-12deg', scale: 0.88 },
  { title: 'PYTHON', color: '#9dbfd6', left: '15%', top: '57%', rotate: '8deg', scale: 1 },
  { title: 'DATABASE', color: '#e6a1b8', left: '27%', top: '12%', rotate: '-5deg', scale: 0.92 },
  { title: 'SYSTEMS', color: '#d9c3e6', left: '36%', top: '59%', rotate: '6deg', scale: 0.78 },
  { title: 'NETWORKS', color: '#a8cadb', left: '55%', top: '10%', rotate: '10deg', scale: 0.83 },
  { title: 'AI', color: '#ebc0ad', left: '66%', top: '57%', rotate: '-7deg', scale: 1.04 },
  { title: 'WEB', color: '#c8d5db', left: '78%', top: '17%', rotate: '5deg', scale: 0.86 },
  { title: 'SOFTWARE', color: '#d8b4c4', left: '88%', top: '62%', rotate: '-10deg', scale: 0.78 },
];

const features = [
  { icon: BookOpen, title: 'Assignments', text: 'Keep every task, deadline and submission in one clear workspace.' },
  { icon: Brain, title: 'Focus Today', text: 'See what deserves attention first instead of scanning a giant task list.' },
  { icon: Database, title: 'Submission History', text: 'Submit files, keep versions and revisit your academic work anytime.' },
  { icon: Network, title: 'Teacher Tracking', text: 'Give faculty a clear view of submitted, late and missing work.' },
];

export default function LandingPage() {
  return (
    <main className="landing-ref">
      <div className="landing-ref-grain" aria-hidden="true" />

      <header className="landing-ref-nav">
        <Link to="/" className="landing-ref-brand" aria-label="TaskForge home">
          <span className="landing-ref-logo-mark">TF</span>
          <span>TaskForge</span>
        </Link>

        <nav className="landing-ref-links" aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#ai">AI</a>
          <a href="#about">About</a>
        </nav>

        <div className="landing-ref-actions">
          <Link to="/dashboard" className="landing-ref-login">Sign in</Link>
          <Link to="/dashboard" className="landing-ref-cta">
            Get Started <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="landing-ref-hero" id="about">
        <div className="landing-ref-copy">
          <p className="landing-ref-eyebrow">STUDENT ACADEMIC COMMAND CENTER</p>
          <h1>
            Take control
            <br />
            <span>of deadlines.</span>
          </h1>
          <p className="landing-ref-description">
            Turn scattered assignments, submissions and academic updates into one calm, prioritized workflow.
          </p>

          <div className="landing-ref-hero-actions">
            <Link to="/dashboard" className="landing-ref-primary">
              Start with TaskForge <ArrowRight size={17} />
            </Link>
            <a href="#how-it-works" className="landing-ref-secondary">
              See how it works
            </a>
          </div>
        </div>

        <div className="landing-ref-note">
          <p>Built around one simple question:</p>
          <strong>what should I work on next?</strong>
        </div>

        <div className="landing-ref-scene" aria-hidden="true">
          <div className="landing-ref-glow landing-ref-glow-a" />
          <div className="landing-ref-glow landing-ref-glow-b" />

          <div className="landing-ref-books">
            {books.map((book, index) => (
              <div
                key={book.title}
                className="landing-ref-book"
                style={{
                  '--book-left': book.left,
                  '--book-top': book.top,
                  '--book-rotate': book.rotate,
                  '--book-scale': book.scale,
                  '--book-color': book.color,
                  '--book-delay': `${index * 0.55}s`,
                }}
              >
                <div className="landing-ref-book-spine" />
                <div className="landing-ref-book-pages" />
                <div className="landing-ref-book-cover">
                  <span>{book.title}</span>
                  <small>ACADEMIC SERIES</small>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-ref-grid-lines" />
        </div>

        <a className="landing-ref-scroll" href="#features">
          Explore TaskForge
          <ArrowDown size={14} />
        </a>
      </section>

      <section className="landing-ref-section" id="features">
        <div className="landing-ref-section-head">
          <div>
            <p className="landing-ref-eyebrow">ONE WORKSPACE</p>
            <h2>Everything academic, <em>in focus.</em></h2>
          </div>
          <p>Designed to reduce the mental load of keeping up with assignments, deadlines and submissions.</p>
        </div>

        <div className="landing-ref-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="landing-ref-feature" key={title}>
              <div className="landing-ref-feature-icon"><Icon size={18} /></div>
              <span className="landing-ref-number">{String(features.findIndex(item => item.title === title) + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-ref-section landing-ref-how" id="how-it-works">
        <div className="landing-ref-section-head">
          <div>
            <p className="landing-ref-eyebrow">THE WORKFLOW</p>
            <h2>From scattered work to <em>done.</em></h2>
          </div>
        </div>

        <div className="landing-ref-steps">
          {[
            ['01', 'Collect', 'Bring assignments, deadlines and academic updates into a single place.'],
            ['02', 'Prioritize', 'Focus Today ranks active work using urgency, priority and progress.'],
            ['03', 'Submit', 'Upload your work, keep a version history and stay accountable.'],
          ].map(([number, title, text]) => (
            <div className="landing-ref-step" key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-ref-final" id="ai">
        <p className="landing-ref-eyebrow">TASKFORGE AI</p>
        <h2>Your academic workload,<br /><em>made clearer.</em></h2>
        <p>Ask what to work on first, find what you are behind on, or plan your week using the context already inside TaskForge.</p>
        <Link to="/ai" className="landing-ref-primary">
          Meet TaskForge AI <ArrowRight size={17} />
        </Link>
      </section>

      <footer className="landing-ref-footer">
        <span>© 2026 TaskForge</span>
        <span>Turn deadlines into done.</span>
      </footer>
    </main>
  );
}
