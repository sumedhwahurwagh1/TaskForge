import { Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useApp, ACTIONS } from '../../context/AppContext';
import { getSubjectById, getSubjectColor } from '../../data/subjects';
import { getDeadlineState, getRelativeDeadline, getPriorityReasons, getDeadlineConfig } from '../../utils/deadlineEngine';
import { DeadlineBadge, PriorityBadge } from '../common/Badge';

export default function AssignmentCard({ assignment, onView }) {
  const { dispatch, isStudent } = useApp();
  const subject = getSubjectById(assignment.subject);
  const deadlineState = getDeadlineState(assignment.dueDate);
  const deadlineConfig = getDeadlineConfig(deadlineState);
  const relative = getRelativeDeadline(assignment.dueDate);
  const reasons = getPriorityReasons(assignment);
  const subjectColor = getSubjectColor(assignment.subject);
  const isCompleted = assignment.status === 'completed';

  const handleToggleComplete = () => {
    dispatch({
      type: ACTIONS.UPDATE_STUDENT_PROGRESS,
      payload: {
        assignmentId: assignment.id,
        status: isCompleted ? 'pending' : 'completed',
      },
    });
  };

  return (
    <div className="focus-card">
      <div className="focus-card-accent" style={{ background: deadlineConfig.color }} />

      <div className="focus-card-top">
        <div>
          <span className="focus-card-subject" style={{ backgroundColor: subjectColor }}>
            {subject ? subject.code : assignment.subject}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <DeadlineBadge dueDate={assignment.dueDate} />
          <PriorityBadge priority={assignment.priority} />
        </div>
      </div>

      <div className="focus-card-title">{assignment.title}</div>

      {assignment.description && (
        <div className="focus-card-desc">{assignment.description}</div>
      )}

      <div className="focus-card-meta">
        <div className="focus-card-deadline">
          <Clock size={14} />
          <span>{relative}</span>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="focus-card-reasons">
          <strong>Why this is priority:</strong>
          {reasons.map((r, i) => (
            <span key={i}>• {r}</span>
          ))}
        </div>
      )}

      <div className="focus-card-actions">
        {isStudent && (
          <button
            className={`btn ${isCompleted ? 'btn-secondary' : 'btn-success'} btn-sm`}
            onClick={handleToggleComplete}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={14} />
            {isCompleted ? 'Completed' : 'Mark Complete'}
          </button>
        )}
        {onView && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onView(assignment)}
            title="View assignment details"
          >
            <Eye size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
