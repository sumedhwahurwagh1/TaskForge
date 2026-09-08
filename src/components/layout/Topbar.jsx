import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, Check, Shield } from 'lucide-react';
import { useApp, ACTIONS } from '../../context/AppContext';
import { DEMO_USERS } from '../../data/seedData';
import { ROLES } from '../../permissions/rbac';

export default function Topbar() {
  const navigate = useNavigate();
  const { state, dispatch, currentUser } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchUser = (userKey) => {
    dispatch({ type: ACTIONS.SWITCH_USER, payload: userKey });
    setDropdownOpen(false);
  };

  const isTeacher = currentUser.role === ROLES.TEACHER;

  return (
    <header className="topbar" role="banner">
      <div className="topbar-search">
        <Search size={18} />
        <input
          type="text"
          className="form-input"
          placeholder="Search assignments, subjects..."
          aria-label="Global search"
        />
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Demo Mode Role Switcher */}
        <div className="demo-role-switcher" ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="demo-switcher-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Switch demo role"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>🎭 Demo Mode:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isTeacher ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: isTeacher ? '#f59e0b' : '#6366f1',
                fontWeight: 600,
                fontSize: '0.78rem',
              }}
            >
              {isTeacher ? '👨‍🏫 Teacher' : '🎓 Student'}: {currentUser.name}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.7 }} />
          </button>

          {dropdownOpen && (
            <div
              className="demo-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                background: 'var(--card-bg, #1e293b)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 100,
                padding: '8px',
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  borderBottom: '1px solid var(--border-color, #334155)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shield size={13} />
                Switch Demo Persona (RBAC Simulation)
              </div>

              {Object.entries(DEMO_USERS).map(([key, u]) => {
                const active = state.currentUserKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSwitchUser(key)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      color: active ? 'var(--primary, #818cf8)' : 'var(--text-primary, #f8fafc)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      marginBottom: '2px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{u.role === ROLES.TEACHER ? '👨‍🏫' : '🎓'}</span>
                        <span>{u.name}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                        {u.role === ROLES.TEACHER ? `Teacher • ${u.department || 'Faculty'}` : 'Student • All Courses'}
                      </div>
                    </div>
                    {active && <Check size={16} color="#818cf8" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          className="notification-btn"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notification-count" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar with initial */}
        <div
          className="user-avatar"
          title={`${currentUser.name} (${currentUser.role})`}
          style={{
            background: isTeacher ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {currentUser.avatar || currentUser.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
