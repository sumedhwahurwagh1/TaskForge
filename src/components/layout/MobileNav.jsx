import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Megaphone, Bell, Bot } from 'lucide-react';

const mobileItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/assignments', label: 'Tasks', icon: FileText },
  { to: '/notices', label: 'Notices', icon: Megaphone },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/ai', label: 'AI', icon: Bot },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <div className="mobile-nav-items">
        {mobileItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
