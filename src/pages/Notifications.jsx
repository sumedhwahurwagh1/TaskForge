import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle, FileText, Info } from 'lucide-react';
import { useApp, ACTIONS } from '../context/AppContext';
import EmptyState from '../components/common/EmptyState';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'assignment', label: 'Assignments' },
  { key: 'notice', label: 'Notices' },
];

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_ICONS = {
  deadline: AlertTriangle,
  assignment: FileText,
  completion: CheckCircle,
  notice: Info,
  system: Bell,
};

export default function Notifications() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const unreadCount = state.notifications.filter(n => !n.read).length;

  const filteredNotifications = useMemo(() => {
    let result = [...state.notifications];

    if (filter === 'unread') result = result.filter(n => !n.read);
    else if (filter !== 'all') result = result.filter(n => n.type === filter);

    result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return result;
  }, [state.notifications, filter]);

  const handleClick = (notification) => {
    if (!notification.read) {
      dispatch({ type: ACTIONS.MARK_NOTIFICATION_READ, payload: notification.id });
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    dispatch({ type: ACTIONS.MARK_ALL_READ });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredNotifications.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="notifications-list">
            {filteredNotifications.map(notification => {
              const IconComponent = TYPE_ICONS[notification.type] || Bell;
              return (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleClick(notification); }}
                >
                  <div className={`notification-icon ${notification.type}`}>
                    <IconComponent size={18} />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-desc">{notification.description}</div>
                    <div className="notification-time">{timeAgo(notification.timestamp)}</div>
                  </div>
                  {!notification.read && <div className="notification-dot" />}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="You're all caught up! 🎉"
          description={filter !== 'all' ? 'No notifications in this category.' : 'No notifications yet.'}
        />
      )}
    </>
  );
}
