import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECTS } from '../data/subjects';
import { getDeadlineState, DEADLINE_STATE } from '../utils/deadlineEngine';
import { DeadlineBadge, StatusBadge } from '../components/common/Badge';

function SubjectCard({ subject, assignments, onClick }) {
  const total = assignments.length;
  const completed = assignments.filter(a => a.status === 'completed').length;
  const active = total - completed;
  const urgent = assignments.filter(a => {
    if (a.status === 'completed') return false;
    const state = getDeadlineState(a.dueDate);
    return state === DEADLINE_STATE.OVERDUE || state === DEADLINE_STATE.DUE_TODAY;
  }).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="subject-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}>
      <div className="subject-card-accent" style={{ background: subject.color }} />
      <div className="subject-code">{subject.code}</div>
      <div className="subject-name">{subject.name}</div>
      <div className="subject-stats">
        <span className="subject-stat">{active} active</span>
        {urgent > 0 && <span className="subject-stat" style={{ color: 'var(--danger)' }}>{urgent} urgent</span>}
      </div>
      <div className="subject-progress">
        <div
          className="subject-progress-fill"
          style={{ width: `${progress}%`, background: subject.color }}
        />
      </div>
      <div className="subject-progress-label">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

function SubjectDetail({ subject, assignments, onClose }) {
  return (
    <div className="subject-detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="subject-detail">
        <div className="subject-detail-header">
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{subject.code}</div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{subject.name}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="subject-detail-body">
          <div className="subject-detail-section">
            <h3>Assignments ({assignments.length})</h3>
            {assignments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {assignments.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: '2px' }}>{a.title}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{a.description?.substring(0, 60)}{a.description?.length > 60 ? '...' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <StatusBadge status={a.status} />
                      <DeadlineBadge dueDate={a.dueDate} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>No assignments for this subject.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Subjects() {
  const { state } = useApp();
  const [selectedSubject, setSelectedSubject] = useState(null);

  const subjectsWithAssignments = useMemo(() => {
    return SUBJECTS.map(subject => ({
      subject,
      assignments: state.assignments.filter(a => a.subject === subject.id),
    })).filter(s => s.assignments.length > 0);
  }, [state.assignments]);

  // Also show subjects with no assignments
  const allSubjects = useMemo(() => {
    const withAssignments = new Set(subjectsWithAssignments.map(s => s.subject.id));
    const empty = SUBJECTS.filter(s => !withAssignments.has(s.id)).map(s => ({
      subject: s,
      assignments: [],
    }));
    return [...subjectsWithAssignments, ...empty];
  }, [subjectsWithAssignments]);

  const selectedData = selectedSubject
    ? allSubjects.find(s => s.subject.id === selectedSubject)
    : null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Subjects</h1>
        <p className="page-subtitle">Your academic workload by subject</p>
      </div>

      <div className="subjects-grid">
        {allSubjects.map(({ subject, assignments }) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            assignments={assignments}
            onClick={() => setSelectedSubject(subject.id)}
          />
        ))}
      </div>

      {selectedData && (
        <SubjectDetail
          subject={selectedData.subject}
          assignments={selectedData.assignments}
          onClose={() => setSelectedSubject(null)}
        />
      )}
    </>
  );
}
