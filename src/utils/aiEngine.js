import { prioritizeAssignments, getDeadlineState, getRelativeDeadline, getPriorityReasons, DEADLINE_STATE } from './deadlineEngine';
import { getSubjectById } from '../data/subjects';

/**
 * TaskForge AI Engine — Deterministic, context-aware academic copilot.
 * Uses the same prioritization engine as Focus Today for consistency.
 * No external API required.
 */

function getSubjectName(subjectId) {
  const subject = getSubjectById(subjectId);
  return subject ? subject.name : subjectId;
}

function formatAssignmentRef(a) {
  return `**${a.title}** (${getSubjectName(a.subject)})`;
}

/**
 * Generate a response for "What should I work on first?"
 */
function handleWorkOnFirst(assignments) {
  const prioritized = prioritizeAssignments(assignments);
  if (prioritized.length === 0) {
    return "🎉 You're all caught up! You have no pending assignments right now. Great job staying on top of your work!";
  }

  const top = prioritized[0];
  const reasons = getPriorityReasons(top);
  const relative = getRelativeDeadline(top.dueDate);

  let response = `Based on your current deadlines and priorities, you should start with ${formatAssignmentRef(top)}.\n\n`;
  response += `**Why this is your top priority:**\n`;
  reasons.forEach(r => { response += `• ${r}\n`; });
  response += `• ${relative}\n\n`;

  if (prioritized.length > 1) {
    response += `**After that, tackle:**\n`;
    prioritized.slice(1, 4).forEach((a, i) => {
      response += `${i + 1}. ${formatAssignmentRef(a)} — ${getRelativeDeadline(a.dueDate)}\n`;
    });
  }

  return response;
}

/**
 * Generate a response for "Plan my week"
 */
function handlePlanWeek(assignments) {
  const active = assignments.filter(a => a.status !== 'completed');
  if (active.length === 0) {
    return "📅 You have no pending assignments this week! Consider reviewing past material or getting ahead on upcoming topics.";
  }


  const overdue = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.OVERDUE);
  const dueToday = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.DUE_TODAY);
  const dueTomorrow = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.DUE_TOMORROW);
  const dueSoon = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.DUE_SOON);
  const upcoming = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.UPCOMING);

  let response = `📅 **Your Week Plan**\n\n`;

  if (overdue.length > 0) {
    response += `🔴 **Immediate — Clear Overdue Work:**\n`;
    overdue.forEach(a => { response += `• ${formatAssignmentRef(a)} — ${getRelativeDeadline(a.dueDate)}\n`; });
    response += `\n`;
  }

  if (dueToday.length > 0) {
    response += `🟠 **Today — Must Complete:**\n`;
    dueToday.forEach(a => { response += `• ${formatAssignmentRef(a)}\n`; });
    response += `\n`;
  }

  if (dueTomorrow.length > 0) {
    response += `🟡 **Tomorrow:**\n`;
    dueTomorrow.forEach(a => { response += `• ${formatAssignmentRef(a)}\n`; });
    response += `\n`;
  }

  if (dueSoon.length > 0) {
    response += `🔵 **This Week:**\n`;
    dueSoon.forEach(a => { response += `• ${formatAssignmentRef(a)} — ${getRelativeDeadline(a.dueDate)}\n`; });
    response += `\n`;
  }

  if (upcoming.length > 0) {
    response += `⚪ **Later — Start Preparing:**\n`;
    upcoming.forEach(a => { response += `• ${formatAssignmentRef(a)} — ${getRelativeDeadline(a.dueDate)}\n`; });
    response += `\n`;
  }

  response += `💡 **Tip:** Focus on overdue and today's deadlines first, then plan blocks for upcoming work.`;

  return response;
}

/**
 * Generate a response for "What am I behind on?"
 */
function handleBehindOn(assignments) {
  const active = assignments.filter(a => a.status !== 'completed');
  const overdue = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.OVERDUE);
  const dueToday = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.DUE_TODAY);

  if (overdue.length === 0 && dueToday.length === 0) {
    return "✅ You're not behind on anything! All your assignments are on track. Keep up the great work!";
  }

  let response = '';

  if (overdue.length > 0) {
    response += `🔴 **Overdue Assignments (${overdue.length}):**\n\n`;
    overdue.forEach(a => {
      response += `• ${formatAssignmentRef(a)}\n  → ${getRelativeDeadline(a.dueDate)} | ${a.priority} priority | ${a.status}\n\n`;
    });
  }

  if (dueToday.length > 0) {
    response += `🟠 **Due Today (${dueToday.length}):**\n\n`;
    dueToday.forEach(a => {
      response += `• ${formatAssignmentRef(a)}\n  → ${a.priority} priority | ${a.status}\n\n`;
    });
  }

  response += `💡 **Recommendation:** Focus on overdue items first, especially those with high priority.`;

  return response;
}

/**
 * Generate a response for "Summarize my notices"
 */
function handleSummarizeNotices(notices) {
  if (!notices || notices.length === 0) {
    return "📋 You have no notices at the moment. Check back later for academic updates!";
  }

  const unread = notices.filter(n => !n.read);

  let response = `📋 **Notice Summary**\n\n`;
  response += `You have **${notices.length}** notices (${unread.length} unread).\n\n`;

  const important = notices.filter(n => n.importance === 'high');
  if (important.length > 0) {
    response += `🔴 **Important:**\n`;
    important.forEach(n => { response += `• **${n.title}** — ${n.summary.substring(0, 80)}...\n`; });
    response += `\n`;
  }

  const other = notices.filter(n => n.importance !== 'high').slice(0, 4);
  if (other.length > 0) {
    response += `📌 **Other Notices:**\n`;
    other.forEach(n => { response += `• **${n.title}** — ${n.summary.substring(0, 80)}...\n`; });
  }

  return response;
}

/**
 * Generate a response for "Help me prioritize"
 */
function handlePrioritize(assignments) {
  const prioritized = prioritizeAssignments(assignments);

  if (prioritized.length === 0) {
    return "🎉 Nothing to prioritize — you've completed all your assignments!";
  }

  let response = `🎯 **Your Prioritized Assignment List:**\n\n`;
  response += `Here are your assignments ranked by urgency (deadline + priority + status):\n\n`;

  prioritized.slice(0, 6).forEach((a, i) => {
    const reasons = getPriorityReasons(a);
    const relative = getRelativeDeadline(a.dueDate);
    response += `**${i + 1}. ${a.title}** (${getSubjectName(a.subject)})\n`;
    response += `   ${relative} | ${a.priority} priority\n`;
    response += `   Reasons: ${reasons.join(', ')}\n\n`;
  });

  response += `💡 **Strategy:** Work through this list top-to-bottom. Complete overdue items first, then tackle today's deadlines.`;

  return response;
}

/**
 * Match user input to an intent and generate a contextual response.
 */
export function generateAIResponse(userMessage, assignments, notices) {
  const msg = userMessage.toLowerCase().trim();

  // Intent matching
  if (msg.includes('work on first') || msg.includes('start with') || msg.includes('most important') || msg.includes('what first')) {
    return { text: handleWorkOnFirst(assignments), type: 'recommendation' };
  }

  if (msg.includes('plan my week') || msg.includes('weekly plan') || msg.includes('week plan') || msg.includes('this week')) {
    return { text: handlePlanWeek(assignments), type: 'plan' };
  }

  if (msg.includes('behind') || msg.includes('overdue') || msg.includes('late') || msg.includes('missed')) {
    return { text: handleBehindOn(assignments), type: 'alert' };
  }

  if (msg.includes('notice') || msg.includes('announcement') || msg.includes('bulletin')) {
    return { text: handleSummarizeNotices(notices), type: 'summary' };
  }

  if (msg.includes('prioritize') || msg.includes('priority') || msg.includes('rank') || msg.includes('order') || msg.includes('urgent')) {
    return { text: handlePrioritize(assignments), type: 'recommendation' };
  }

  if (msg.includes('complete') || msg.includes('done') || msg.includes('finished') || msg.includes('progress')) {
    const completed = assignments.filter(a => a.status === 'completed');
    const total = assignments.length;
    const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    return {
      text: `📊 **Your Progress:**\n\nYou've completed **${completed.length}** out of **${total}** assignments (**${pct}%**).\n\n${completed.length > 0 ? `Recently completed:\n${completed.slice(0, 3).map(a => `• ${formatAssignmentRef(a)}`).join('\n')}` : 'Start completing assignments to track your progress!'}\n\n💡 Keep going — every completed assignment is progress!`,
      type: 'summary',
    };
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    const active = assignments.filter(a => a.status !== 'completed');
    const overdue = active.filter(a => getDeadlineState(a.dueDate) === DEADLINE_STATE.OVERDUE);
    return {
      text: `👋 Hey there! I'm your TaskForge AI copilot.\n\nQuick overview: You have **${active.length}** active assignments${overdue.length > 0 ? ` and **${overdue.length}** are overdue` : ''}.\n\nHow can I help? Try asking me:\n• "What should I work on first?"\n• "Plan my week"\n• "What am I behind on?"`,
      type: 'greeting',
    };
  }

  // Fallback — still contextual
  const active = assignments.filter(a => a.status !== 'completed');
  return {
    text: `I can help you manage your academic workload! You currently have **${active.length}** active assignments.\n\nTry asking me:\n• "What should I work on first?"\n• "Plan my week"\n• "What am I behind on?"\n• "Summarize my notices"\n• "Help me prioritize"`,
    type: 'help',
  };
}

export const QUICK_PROMPTS = [
  { label: 'What should I work on first?', icon: '🎯' },
  { label: 'Plan my week', icon: '📅' },
  { label: 'What am I behind on?', icon: '⚠️' },
  { label: 'Summarize my notices', icon: '📋' },
  { label: 'Help me prioritize', icon: '📊' },
];
