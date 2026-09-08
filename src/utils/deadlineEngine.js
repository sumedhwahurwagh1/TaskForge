export const DEADLINE_STATE = {
  OVERDUE: 'OVERDUE',
  DUE_TODAY: 'DUE_TODAY',
  DUE_TOMORROW: 'DUE_TOMORROW',
  DUE_SOON: 'DUE_SOON',
  UPCOMING: 'UPCOMING',
};

/**
 * Get the start of a day (midnight) for consistent date comparison.
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate the difference in calendar days between two dates.
 */
function diffInDays(dateA, dateB) {
  const a = startOfDay(dateA);
  const b = startOfDay(dateB);
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * Determine the deadline state of an assignment based on its due date.
 */
export function getDeadlineState(dueDate) {
  if (!dueDate) return DEADLINE_STATE.UPCOMING;
  
  const now = new Date();
  const due = new Date(dueDate);
  const daysDiff = diffInDays(due, now);

  if (daysDiff < 0) return DEADLINE_STATE.OVERDUE;
  if (daysDiff === 0) return DEADLINE_STATE.DUE_TODAY;
  if (daysDiff === 1) return DEADLINE_STATE.DUE_TOMORROW;
  if (daysDiff <= 3) return DEADLINE_STATE.DUE_SOON;
  return DEADLINE_STATE.UPCOMING;
}

/**
 * Get a human-readable relative deadline label.
 */
export function getRelativeDeadline(dueDate) {
  if (!dueDate) return 'No deadline';

  const now = new Date();
  const due = new Date(dueDate);
  const daysDiff = diffInDays(due, now);

  if (daysDiff < -1) return `${Math.abs(daysDiff)} days overdue`;
  if (daysDiff === -1) return 'Yesterday';
  if (daysDiff === 0) return 'Due today';
  if (daysDiff === 1) return 'Due tomorrow';
  if (daysDiff <= 7) return `Due in ${daysDiff} days`;
  if (daysDiff <= 14) return `Due in ${Math.ceil(daysDiff / 7)} weeks`;
  return `Due in ${daysDiff} days`;
}

/**
 * Format a date for display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date with time.
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get deadline state config (color, label, etc.)
 */
export function getDeadlineConfig(state) {
  const configs = {
    [DEADLINE_STATE.OVERDUE]: { label: 'Overdue', color: 'var(--danger)', bgColor: 'var(--danger-light)', className: 'deadline-overdue' },
    [DEADLINE_STATE.DUE_TODAY]: { label: 'Due Today', color: 'var(--warning)', bgColor: 'var(--warning-light)', className: 'deadline-today' },
    [DEADLINE_STATE.DUE_TOMORROW]: { label: 'Due Tomorrow', color: 'var(--warning)', bgColor: 'var(--warning-light)', className: 'deadline-tomorrow' },
    [DEADLINE_STATE.DUE_SOON]: { label: 'Due Soon', color: 'var(--info)', bgColor: 'var(--info-light)', className: 'deadline-soon' },
    [DEADLINE_STATE.UPCOMING]: { label: 'Upcoming', color: 'var(--text-secondary)', bgColor: 'var(--bg-secondary)', className: 'deadline-upcoming' },
  };
  return configs[state] || configs[DEADLINE_STATE.UPCOMING];
}

/**
 * Calculate urgency score for an assignment.
 * Higher score = more urgent.
 */
export function getUrgencyScore(assignment) {
  if (assignment.status === 'completed') return -1000;

  let score = 0;
  const deadlineState = getDeadlineState(assignment.dueDate);

  // Deadline urgency
  switch (deadlineState) {
    case DEADLINE_STATE.OVERDUE: score += 100; break;
    case DEADLINE_STATE.DUE_TODAY: score += 80; break;
    case DEADLINE_STATE.DUE_TOMORROW: score += 60; break;
    case DEADLINE_STATE.DUE_SOON: score += 40; break;
    case DEADLINE_STATE.UPCOMING: score += 10; break;
  }

  // Priority bonus
  switch (assignment.priority) {
    case 'high': score += 30; break;
    case 'medium': score += 20; break;
    case 'low': score += 10; break;
  }

  // In-progress bonus (slightly higher than pending)
  if (assignment.status === 'in-progress') score += 10;

  return score;
}

/**
 * Get priority reasons for why an assignment is urgent.
 */
export function getPriorityReasons(assignment) {
  const reasons = [];
  const deadlineState = getDeadlineState(assignment.dueDate);

  if (deadlineState === DEADLINE_STATE.OVERDUE) reasons.push('Overdue');
  else if (deadlineState === DEADLINE_STATE.DUE_TODAY) reasons.push('Due today');
  else if (deadlineState === DEADLINE_STATE.DUE_TOMORROW) reasons.push('Due tomorrow');
  else if (deadlineState === DEADLINE_STATE.DUE_SOON) reasons.push('Due soon');

  if (assignment.priority === 'high') reasons.push('High priority');
  else if (assignment.priority === 'medium') reasons.push('Medium priority');

  if (assignment.status === 'pending') reasons.push('Not started');
  else if (assignment.status === 'in-progress') reasons.push('In progress');

  return reasons;
}

/**
 * Sort assignments by urgency (most urgent first).
 * This is the shared prioritization engine used by Dashboard and AI.
 */
export function prioritizeAssignments(assignments) {
  return [...assignments]
    .filter(a => a.status !== 'completed')
    .map(a => ({ ...a, urgencyScore: getUrgencyScore(a) }))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/**
 * Get dashboard statistics from assignments.
 */
export function getDashboardStats(assignments) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const active = assignments.filter(a => a.status !== 'completed');
  const completed = assignments.filter(a => a.status === 'completed');
  const completedThisWeek = completed.filter(a => new Date(a.createdAt) >= weekAgo);

  const pending = active.filter(a => a.status === 'pending' || a.status === 'in-progress');
  const dueToday = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.DUE_TODAY);
  const dueSoon = active.filter(a => {
    const state = getDeadlineState(a.dueDate);
    return state === DEADLINE_STATE.DUE_TOMORROW || state === DEADLINE_STATE.DUE_SOON;
  });
  const overdue = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.OVERDUE);
  const dueThisWeek = active.filter(a => {
    const due = new Date(a.dueDate);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    return due <= endOfWeek && due >= now;
  });

  return {
    pending: { count: pending.length, sub: `${dueThisWeek.length} due this week` },
    dueToday: { count: dueToday.length, sub: dueToday.length > 0 ? 'Needs attention' : 'All clear' },
    dueSoon: { count: dueSoon.length + overdue.length, sub: `${overdue.length} overdue` },
    completed: { count: completed.length, sub: `+${completedThisWeek.length} this week` },
  };
}
