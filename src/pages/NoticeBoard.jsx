import { useState, useMemo } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useApp, ACTIONS } from '../context/AppContext';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';

const CATEGORIES = ['all', 'academic', 'exam', 'event', 'important'];

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

function NoticeDetail({ notice, onClose }) {
  return (
    <div className="notice-detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="notice-detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span className={`notice-category ${notice.category}`}>{notice.category}</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '12px' }}>{notice.title}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>{notice.summary}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
          <span>{notice.source}</span>
          <span>{timeAgo(notice.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function NoticeBoard() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedNotice, setSelectedNotice] = useState(null);

  const filteredNotices = useMemo(() => {
    let result = [...state.notices];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.source.toLowerCase().includes(q)
      );
    }

    if (category !== 'all') {
      result = result.filter(n => n.category === category);
    }

    // Sort by importance then recency
    result.sort((a, b) => {
      if (a.importance === 'high' && b.importance !== 'high') return -1;
      if (a.importance !== 'high' && b.importance === 'high') return 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    return result;
  }, [state.notices, search, category]);

  const handleNoticeClick = (notice) => {
    if (!notice.read) {
      dispatch({ type: ACTIONS.UPDATE_NOTICE, payload: { id: notice.id, read: true } });
    }
    setSelectedNotice(notice);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Notice Board</h1>
        <p className="page-subtitle">Stay updated with academic announcements</p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search notices..." />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`btn ${category === cat ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {filteredNotices.length > 0 ? (
        <div className="notices-list">
          {filteredNotices.map(notice => (
            <div
              key={notice.id}
              className={`notice-card ${!notice.read ? 'unread' : ''} ${notice.importance === 'high' ? 'high-importance' : ''}`}
              onClick={() => handleNoticeClick(notice)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNoticeClick(notice); }}
            >
              <div className="notice-header">
                <span className={`notice-category ${notice.category}`}>{notice.category}</span>
                {!notice.read && <span className="badge badge-in-progress" style={{ fontSize: '10px' }}>New</span>}
              </div>
              <div className="notice-title">{notice.title}</div>
              <div className="notice-summary">{notice.summary}</div>
              <div className="notice-footer">
                <span>{notice.source}</span>
                <span>{timeAgo(notice.publishedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="No notices found"
          description={search || category !== 'all' ? 'Try adjusting your search or filter.' : 'No new notices at the moment.'}
        />
      )}

      {selectedNotice && (
        <NoticeDetail notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
      )}
    </>
  );
}
