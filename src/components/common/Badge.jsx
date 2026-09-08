import { getDeadlineState, getDeadlineConfig, DEADLINE_STATE } from '../../utils/deadlineEngine';

export function DeadlineBadge({ dueDate }) {
  const state = getDeadlineState(dueDate);
  const config = getDeadlineConfig(state);

  const classMap = {
    [DEADLINE_STATE.OVERDUE]: 'badge-overdue',
    [DEADLINE_STATE.DUE_TODAY]: 'badge-due-today',
    [DEADLINE_STATE.DUE_TOMORROW]: 'badge-due-tomorrow',
    [DEADLINE_STATE.DUE_SOON]: 'badge-due-soon',
    [DEADLINE_STATE.UPCOMING]: 'badge-upcoming',
  };

  return <span className={`badge ${classMap[state] || 'badge-upcoming'}`}>{config.label}</span>;
}

export function PriorityBadge({ priority }) {
  const classMap = {
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };

  const labels = { high: 'High', medium: 'Medium', low: 'Low' };

  return <span className={`badge ${classMap[priority] || 'badge-low'}`}>{labels[priority] || priority}</span>;
}

export function StatusBadge({ status }) {
  const classMap = {
    'pending': 'badge-pending',
    'in-progress': 'badge-in-progress',
    'completed': 'badge-completed',
  };

  const labels = {
    'pending': 'Pending',
    'in-progress': 'In Progress',
    'completed': 'Completed',
  };

  return <span className={`badge ${classMap[status] || 'badge-pending'}`}>{labels[status] || status}</span>;
}
