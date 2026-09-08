import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, Megaphone, Bell, Bot, Settings, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const { currentUser, isTeacher } = useApp();

  const navItems = [
    { to: '/dashboard', label: isTeacher ? 'Teacher Overview' : 'Dashboard', icon: LayoutDashboard },
    { to: '/assignments', label: isTeacher ? 'Manage Assignments' : 'Assignments', icon: FileText },
    { to: '/subjects', label: isTeacher ? 'My Subjects' : 'Subjects', icon: BookOpen },
    { to: '/notices', label: 'Notice Board', icon: Megaphone },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    // AI Copilot is available to students
    ...(!isTeacher ? [{ to: '/ai', label: 'AI Assistant', icon: Bot }] : []),
  ];

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#6366f1" />
          <path d="M9 16.5L14 21.5L23 11.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        TaskForge
      </div>

      <div style={{ padding: '0 16px 12px 16px' }}>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: isTeacher ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
            border: `1px solid ${isTeacher ? 'rgba(245, 158, 11, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={16} color={isTeacher ? '#f59e0b' : '#818cf8'} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isTeacher ? '#f59e0b' : '#818cf8', textTransform: 'uppercase' }}>
              {isTeacher ? 'Faculty Portal' : 'Student Space'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {currentUser.name}
            </div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Workspace</span>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
