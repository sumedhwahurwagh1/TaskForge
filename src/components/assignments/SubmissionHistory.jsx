import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Download, FileText, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMySubmissions, downloadSubmission } from '../../services/submissions';
import { getSubjectById } from '../../data/subjects';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SubmissionHistory() {
  const { currentUser, isStudent } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getMySubmissions(currentUser.id);
        if (!cancelled) setRows(data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load your submission history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser.id, isStudent]);

  if (!isStudent) return null;

  return (
    <section style={{ marginTop: '28px' }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">My Submission History</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Review files you have submitted and download previous versions.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={18} className="spin" />
        </div>
      ) : error ? (
        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.8rem' }}>
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '22px', borderRadius: '14px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <FileText size={18} />
          <span>No submissions yet. Submit an assignment to start your history.</span>
        </div>
      ) : (
        <div className="assignments-list">
          {rows.map((row) => {
            const subject = getSubjectById(row.subjectId || row.subject_id);
            const status = row.status;
            return (
              <div key={row.id} className="assignment-row">
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: status === 'LATE' ? 'var(--warning-light)' : 'var(--success-light)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                  {status === 'LATE' ? (
                    <AlertTriangle size={16} color="var(--warning)" />
                  ) : (
                    <CheckCircle2 size={16} color="var(--success)" />
                  )}
                </div>
                <div className="assignment-info">
                  <div className="assignment-title">{row.assignmentTitle || row.assignment_title}</div>
                  <div className="assignment-subject">
                    {subject ? `${subject.code} — ${subject.name}` : 'Academic Assignment'}
                  </div>
                </div>
                <div className="assignment-badges">
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: status === 'LATE' ? 'var(--warning)' : 'var(--success)' }}>
                    {status === 'LATE' ? 'Late' : 'Submitted'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                  <Clock3 size={14} color="var(--text-secondary)" />
                  <div>
                    <div style={{ fontSize: '0.75rem' }}>{formatDate(row.submittedAt || row.submitted_at)}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      v{row.version} · {row.fileName || row.file_name} · {formatBytes(row.fileSize || row.file_size)}
                    </div>
                  </div>
                </div>
                <button className="btn-icon" type="button" title="Download submission" onClick={async () => {
                  try {
                    await downloadSubmission(row);
                  } catch (err) {
                    setError(err.message || 'Download failed.');
                  }
                }}>
                  <Download size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
