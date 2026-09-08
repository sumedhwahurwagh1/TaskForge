import { useState, useMemo } from 'react';
import { useApp, ACTIONS } from '../../context/AppContext';
import { SUBJECTS, getSubjectById } from '../../data/subjects';
import Modal from '../common/Modal';
import { DeadlineBadge, PriorityBadge } from '../common/Badge';
import { formatDateTime, getRelativeDeadline } from '../../utils/deadlineEngine';
import { can, ACTIONS as RBAC_ACTIONS } from '../../permissions/rbac';
import { CheckCircle2, Clock, CircleDot, ShieldAlert, BookOpen, Calendar, User } from 'lucide-react';
import SubmissionPanel from './SubmissionPanel';

const EMPTY_FORM = {
  title: '',
  subject: '',
  description: '',
  dueDate: '',
  priority: 'medium',
};

export default function AssignmentModal({ isOpen, mode = 'create', onClose, assignment }) {
  const { dispatch, currentUser, isStudent, isTeacher } = useApp();

  // Filter subjects for teacher create/edit: only authorized subjects
  const availableSubjects = useMemo(() => {
    if (isTeacher && Array.isArray(currentUser.authorizedSubjectIds)) {
      return SUBJECTS.filter(s => currentUser.authorizedSubjectIds.includes(s.id));
    }
    return SUBJECTS;
  }, [isTeacher, currentUser]);

  const initialForm = useMemo(() => {
    if (assignment && (mode === 'edit' || mode === 'view')) {
      return {
        id: assignment.id,
        title: assignment.title || '',
        subject: assignment.subject || '',
        description: assignment.description || '',
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
        priority: assignment.priority || 'medium',
      };
    }
    // For create mode, pre-select first authorized subject and default due date (7 days from now)
    const defaultSubject = availableSubjects[0]?.id || '';
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    defaultDate.setHours(23, 59, 0, 0);
    return {
      ...EMPTY_FORM,
      subject: defaultSubject,
      dueDate: defaultDate.toISOString().slice(0, 16),
    };
  }, [assignment, mode, availableSubjects]);

  if (!isOpen) return null;

  return (
    <AssignmentModalContent
      key={`${mode}-${assignment?.id || 'new'}`}
      mode={mode}
      initialForm={initialForm}
      assignment={assignment}
      availableSubjects={availableSubjects}
      onClose={onClose}
      dispatch={dispatch}
      currentUser={currentUser}
      isStudent={isStudent}
      isTeacher={isTeacher}
    />
  );
}

function AssignmentModalContent({
  mode,
  initialForm,
  assignment,
  availableSubjects,
  onClose,
  dispatch,
  currentUser,
  isStudent,
  isTeacher,
}) {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState('');

  const subject = getSubjectById(assignment?.subject || form.subject);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleStudentStatusChange = (status) => {
    if (!assignment) return;
    dispatch({
      type: ACTIONS.UPDATE_STUDENT_PROGRESS,
      payload: { assignmentId: assignment.id, status },
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.title.trim()) {
      setErrorMessage('Assignment title is required.');
      return;
    }
    if (!form.subject) {
      setErrorMessage('Please select an authorized subject.');
      return;
    }
    if (!form.dueDate) {
      setErrorMessage('Due date is required.');
      return;
    }

    // Verify teacher subject authorization
    if (isTeacher && !can(currentUser, RBAC_ACTIONS.ASSIGNMENT_CREATE, { subjectId: form.subject })) {
      setErrorMessage('Forbidden: You are not authorized to manage assignments for this subject.');
      return;
    }

    const assignmentData = {
      title: form.title.trim(),
      subject: form.subject,
      description: form.description.trim(),
      dueDate: new Date(form.dueDate).toISOString(),
      priority: form.priority,
    };

    if (mode === 'edit') {
      dispatch({
        type: ACTIONS.UPDATE_ASSIGNMENT,
        payload: { ...assignmentData, id: assignment.id },
      });
    } else {
      dispatch({
        type: ACTIONS.ADD_ASSIGNMENT,
        payload: assignmentData,
      });
    }

    onClose();
  };

  // View Mode UI
  if (mode === 'view') {
    const isCompleted = assignment?.status === 'completed';
    const isInProgress = assignment?.status === 'in-progress';

    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Assignment Details"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {isStudent ? 'Decoupled personal tracking' : 'Course definition'}
            </span>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        }
      >
        <div className="assignment-details-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <DeadlineBadge dueDate={assignment.dueDate} />
              <PriorityBadge priority={assignment.priority} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
              {assignment.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 600 }}>
              <BookOpen size={15} />
              {subject ? `${subject.code} — ${subject.name}` : assignment.subject}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Calendar size={15} color="var(--text-secondary)" />
              <span style={{ color: 'var(--text-secondary)' }}>Due Date:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(assignment.dueDate)}</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>({getRelativeDeadline(assignment.dueDate)})</span>
            </div>
            {assignment.createdBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <User size={15} color="var(--text-secondary)" />
                <span style={{ color: 'var(--text-secondary)' }}>Created by Faculty:</span>
                <span style={{ color: 'var(--text-primary)' }}>{assignment.createdBy}</span>
              </div>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Description & Requirements
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {assignment.description || 'No detailed instructions provided.'}
            </p>
          </div>

          {/* Student-only Personal Progress Controls */}
          {isStudent && (
            <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Your Personal Progress Status
              </h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleStudentStatusChange('pending')}
                  className={`btn ${!isCompleted && !isInProgress ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CircleDot size={14} />
                  Not Started
                </button>
                <button
                  type="button"
                  onClick={() => handleStudentStatusChange('in-progress')}
                  className={`btn ${isInProgress ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Clock size={14} />
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleStudentStatusChange('completed')}
                  className={`btn ${isCompleted ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: isCompleted ? 'var(--success)' : '' }}
                >
                  <CheckCircle2 size={14} />
                  Completed
                </button>
              </div>
            </div>
          )}

          {/* Student submission upload/history and teacher submission tracking */}
          <SubmissionPanel assignment={assignment} />
        </div>
      </Modal>
    );
  }

  // Teacher Create / Edit Mode
  const footer = (
    <>
      <button className="btn btn-secondary" type="button" onClick={onClose}>
        Cancel
      </button>
      <button
        className="btn btn-primary"
        type="submit"
        onClick={handleSubmit}
      >
        {mode === 'edit' ? 'Save Changes' : 'Publish Assignment'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Assignment' : 'Create Course Assignment'}
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        {errorMessage && (
          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="title">
            Assignment Title *
          </label>
          <input
            id="title"
            type="text"
            className="form-input"
            placeholder="e.g., Distributed Systems Lab 3: Raft Consensus"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="subject">
            Authorized Subject *
          </label>
          <select
            id="subject"
            className="form-select"
            value={form.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            required
          >
            <option value="">Select subject</option>
            {availableSubjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
          {availableSubjects.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
              You do not have teaching authorization for any subjects.
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Instructions & Rubric
          </label>
          <textarea
            id="description"
            className="form-textarea"
            placeholder="Provide submission guidelines, deliverables, and grading criteria..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="dueDate">
              Due Date & Time *
            </label>
            <input
              id="dueDate"
              type="datetime-local"
              className="form-input"
              value={form.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="priority">
              Priority Weight
            </label>
            <select
              id="priority"
              className="form-select"
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
