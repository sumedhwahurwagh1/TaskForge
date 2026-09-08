import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Download, FileUp, Loader2, Users, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { can, ACTIONS as RBAC_ACTIONS } from '../../permissions/rbac';
import {
  submitAssignmentFile,
  getMyAssignmentSubmissions,
  getTeacherSubmissionSummary,
  downloadSubmission,
} from '../../services/submissions';

function formatSubmittedAt(value) {
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

const panelStyle = {
  marginTop: '8px',
  paddingTop: '18px',
  borderTop: '1px solid var(--border-color)',
};

export default function SubmissionPanel({ assignment }) {
  const { currentUser, isStudent, isTeacher, dispatch } = useApp();
  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const canManage = can(currentUser, RBAC_ACTIONS.ASSIGNMENT_UPDATE, { assignment });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (isStudent) {
          const rows = await getMyAssignmentSubmissions(assignment.id, currentUser.id);
          if (!cancelled) setSubmissions(rows || []);
        } else if (isTeacher && canManage) {
          const data = await getTeacherSubmissionSummary(assignment.id, assignment);
          if (!cancelled) setSummary(data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load submission data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [assignment.id, assignment.title, isStudent, isTeacher, canManage]);

  async function refreshStudent() {
    const rows = await getMyAssignmentSubmissions(assignment.id);
    setSubmissions(rows || []);
  }

  async function handleSubmit() {
    if (!file || uploading) return;
    setUploading(true);
    setError('');

    try {
      await submitAssignmentFile({
        assignmentId: assignment.id,
        studentId: currentUser.id,
        assignment,
        file,
      });

      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await refreshStudent();

      dispatch({
        type: 'SET_TOAST',
        payload: {
          message: 'Assignment submitted successfully.',
          type: 'success',
        },
      });
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(submission) {
    try {
      await downloadSubmission(submission);
    } catch (err) {
      setError(err.message || 'Download failed.');
    }
  }

  if (isTeacher && !canManage) {
    return null;
  }

  return (
    <section style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {isStudent ? 'Your Submission' : 'Submission Tracking'}
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            {isStudent
              ? 'Upload PDF, DOCX, PPTX, ZIP, images, or another file type.'
              : 'See who has submitted and who is still pending.'}
          </p>
        </div>
        {isTeacher && summary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <Users size={14} />
            {summary.submitted}/{summary.totalStudents} submitted
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px 12px',
          marginBottom: '12px',
          borderRadius: '10px',
          background: 'var(--danger-light)',
          color: 'var(--danger)',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={18} className="spin" />
        </div>
      ) : isStudent ? (
        <StudentSubmissionView
          assignment={assignment}
          submissions={submissions}
          file={file}
          setFile={setFile}
          inputRef={inputRef}
          uploading={uploading}
          onSubmit={handleSubmit}
          onDownload={handleDownload}
        />
      ) : (
        <TeacherSubmissionView
          summary={summary}
          onDownload={handleDownload}
        />
      )}
    </section>
  );
}

function StudentSubmissionView({
  assignment,
  submissions,
  file,
  setFile,
  inputRef,
  uploading,
  onSubmit,
  onDownload,
}) {
  const latest = submissions[0];
  const statusLabel = latest?.status === 'LATE' ? 'Submitted late' : latest ? 'Submitted' : 'Not submitted';

  return (
    <div>
      {latest ? (
        <div style={{
          padding: '14px',
          borderRadius: '14px',
          background: latest.status === 'LATE' ? 'var(--warning-light)' : 'var(--success-light)',
          border: '1px solid var(--border-color)',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {latest.status === 'LATE' ? (
              <AlertTriangle size={18} color="var(--warning)" />
            ) : (
              <CheckCircle2 size={18} color="var(--success)" />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{statusLabel}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                {latest.fileName} · v{latest.version} · {formatBytes(latest.fileSize)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Submitted {formatSubmittedAt(latest.submittedAt || latest.submitted_at)}
              </div>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => onDownload(latest)}>
              <Download size={15} />
              Download
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '16px',
          borderRadius: '14px',
          border: '1px dashed var(--border-color)',
          background: 'var(--bg-secondary)',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileUp size={18} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>No submission yet</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Due {new Date(assignment.dueDate).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <input
          ref={inputRef}
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          style={{ maxWidth: '100%' }}
        />
        <button
          className="btn btn-primary"
          type="button"
          onClick={onSubmit}
          disabled={!file || uploading}
        >
          {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
          {latest ? 'Submit New Version' : 'Submit Assignment'}
        </button>
      </div>

      <div style={{ marginTop: '12px' }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}>
          Submission History
        </div>

        {submissions.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Your past submissions will appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {submissions.map((submission) => (
              <div key={submission.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
              }}>
                <Clock3 size={14} color="var(--text-secondary)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                    v{submission.version} · {submission.fileName || submission.file_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {formatSubmittedAt(submission.submittedAt || submission.submitted_at)}
                  </div>
                </div>
                <button className="btn-icon" type="button" onClick={() => onDownload(submission)} title="Download submission">
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherSubmissionView({ summary, onDownload }) {
  if (!summary) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>No submission data available.</div>;
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <Metric label="Submitted" value={summary.submitted} color="var(--success)" />
        <Metric label="Not Submitted" value={summary.notSubmitted} color="var(--danger)" />
        <Metric label="Late" value={summary.late} color="var(--warning)" />
      </div>

      <div style={{
        height: '8px',
        borderRadius: '999px',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        marginBottom: '14px',
      }}>
        <div style={{
          width: `${summary.submissionRate}%`,
          height: '100%',
          borderRadius: '999px',
          background: 'var(--primary)',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {summary.students.map((student) => (
          <div key={student.studentId} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light, #ede9fe)', display: 'grid', placeItems: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
              {student.studentName?.split(' ').map(part => part[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 650 }}>{student.studentName}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{student.studentEmail}</div>
            </div>
            {student.status === 'NOT_SUBMITTED' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)' }}>
                <AlertTriangle size={13} />
                Not Submitted
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: student.status === 'LATE' ? 'var(--warning)' : 'var(--success)',
                }}>
                  {student.status === 'LATE' ? 'Late' : 'Submitted'}
                </span>
                <button
                  className="btn-icon"
                  type="button"
                  onClick={() => onDownload(student.latestSubmission)}
                  title="Download latest submission"
                >
                  <Download size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
      <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
