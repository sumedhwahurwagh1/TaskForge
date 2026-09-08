import { Check, Edit2, Trash2, Eye, Lock, Clock } from 'lucide-react';
import { useApp, ACTIONS } from '../../context/AppContext';
import { getSubjectById } from '../../data/subjects';
import { getRelativeDeadline } from '../../utils/deadlineEngine';
import { DeadlineBadge, PriorityBadge } from '../common/Badge';
import { can, ACTIONS as RBAC_ACTIONS } from '../../permissions/rbac';

export default function AssignmentRow({ assignment, onEdit, onView }) {
  const { dispatch, currentUser, isStudent, isTeacher } = useApp();
  const subject = getSubjectById(assignment.subject);
  const isCompleted = assignment.status === 'completed';
  const isInProgress = assignment.status === 'in-progress';

  // Permission checks
  const canUpdateProgress = can(currentUser, RBAC_ACTIONS.PROGRESS_UPDATE_SELF, { studentId: currentUser.id });
  const canEdit = can(currentUser, RBAC_ACTIONS.ASSIGNMENT_UPDATE, { assignment });
  const canDelete = can(currentUser, RBAC_ACTIONS.ASSIGNMENT_DELETE, { assignment });

  const handleToggleComplete = () => {
    if (!canUpdateProgress) return;
    const nextStatus = isCompleted ? 'pending' : 'completed';
    dispatch({
      type: ACTIONS.UPDATE_STUDENT_PROGRESS,
      payload: { assignmentId: assignment.id, status: nextStatus },
    });
  };

  const handleSetInProgress = () => {
    if (!canUpdateProgress) return;
    dispatch({
      type: ACTIONS.UPDATE_STUDENT_PROGRESS,
      payload: { assignmentId: assignment.id, status: 'in-progress' },
    });
  };

  const handleDelete = () => {
    if (!canDelete) return;
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      dispatch({ type: ACTIONS.DELETE_ASSIGNMENT, payload: assignment.id });
    }
  };

  return (
    <div className={`assignment-row ${isCompleted ? 'completed' : ''}`}>
      {/* Student Progress Toggle */}
      {isStudent && (
        <button
          className={`assignment-check ${isCompleted ? 'checked' : ''} ${isInProgress ? 'in-progress' : ''}`}
          onClick={handleToggleComplete}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          title={isCompleted ? 'Completed (click to reopen)' : 'Mark as completed'}
          style={
            isInProgress
              ? { borderColor: 'var(--info)', color: 'var(--info)' }
              : {}
          }
        >
          {isCompleted && <Check size={14} />}
          {isInProgress && <Clock size={12} />}
        </button>
      )}

      {/* Teacher indicator */}
      {isTeacher && (
        <div style={{ marginRight: '4px', display: 'flex', alignItems: 'center' }}>
          {canEdit ? (
            <span
              title="Authorized Subject — Managed by you"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'inline-block',
              }}
            />
          ) : (
            <Lock size={14} color="var(--text-secondary)" title="Unauthorized Subject — Read Only" />
          )}
        </div>
      )}

      <div className="assignment-info" onClick={() => onView(assignment)} style={{ cursor: 'pointer' }}>
        <div className="assignment-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{assignment.title}</span>
          {isStudent && isInProgress && (
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(14, 165, 233, 0.15)',
                color: '#0ea5e9',
                fontWeight: 600,
              }}
            >
              In Progress
            </span>
          )}
        </div>
        <div className="assignment-subject">
          {subject ? `${subject.code} — ${subject.name}` : assignment.subject}
        </div>
      </div>

      <div className="assignment-badges">
        <DeadlineBadge dueDate={assignment.dueDate} />
        <PriorityBadge priority={assignment.priority} />
      </div>

      <span className="assignment-deadline-text">
        {getRelativeDeadline(assignment.dueDate)}
      </span>

      <div className="assignment-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* View Details Button (Available to both) */}
        <button
          className="btn-icon"
          onClick={() => onView(assignment)}
          aria-label="View assignment details"
          title="View details"
        >
          <Eye size={16} />
        </button>

        {/* Student Quick Status Action (Mark In Progress if pending) */}
        {isStudent && !isCompleted && !isInProgress && (
          <button
            className="btn btn-secondary"
            onClick={handleSetInProgress}
            style={{ fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
            title="Mark In Progress"
          >
            Start
          </button>
        )}

        {/* Teacher Edit & Delete (Authorized Subjects ONLY) */}
        {isTeacher && canEdit && (
          <button
            className="btn-icon"
            onClick={() => onEdit(assignment)}
            aria-label="Edit assignment"
            title="Edit assignment"
          >
            <Edit2 size={16} />
          </button>
        )}

        {isTeacher && canDelete && (
          <button
            className="btn-icon"
            onClick={handleDelete}
            aria-label="Delete assignment"
            title="Delete assignment"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={16} />
          </button>
        )}

        {/* Teacher Unauthorized Subject Disabled Icon */}
        {isTeacher && !canEdit && (
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              padding: '4px 6px',
              fontStyle: 'italic',
            }}
            title="Subject managed by another department faculty"
          >
            Read only
          </span>
        )}
      </div>
    </div>
  );
}
