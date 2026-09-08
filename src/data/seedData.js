/**
 * Seed data for TaskForge hackathon demo.
 * Uses relative dates so the demo always looks fresh.
 * 
 * RBAC COMPLIANT:
 * - Shared assignments are owned by teachers (createdBy) and DO NOT have a shared 'status'.
 * - Student progress is decoupled into SEED_STUDENT_PROGRESS.
 */

function daysFromNow(days, hour = 23, minute = 59) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export const DEMO_USERS = {
  student: {
    id: 'usr-student-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@student.edu',
    role: 'STUDENT',
    avatar: 'A',
  },
  teacherChen: {
    id: 'usr-teacher-chen',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@university.edu',
    role: 'TEACHER',
    avatar: 'SC',
    department: 'Computer Science',
    authorizedSubjectIds: ['cs301', 'cs201'],
  },
  teacherVance: {
    id: 'usr-teacher-vance',
    name: 'Prof. Marcus Vance',
    email: 'marcus.vance@university.edu',
    role: 'TEACHER',
    avatar: 'MV',
    department: 'Economics & Mathematics',
    authorizedSubjectIds: ['econ201', 'math301'],
  },
};

export const SEED_ASSIGNMENTS = [
  {
    id: 'asg-1',
    title: 'Distributed Systems Lab 2',
    subject: 'cs301',
    createdBy: 'usr-teacher-chen',
    description: 'Implement a basic leader election algorithm using the Bully algorithm. Submit working code with test cases.',
    dueDate: daysFromNow(-1, 23, 59),
    priority: 'high',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: 'asg-2',
    title: 'Macroeconomics Problem Set 4',
    subject: 'econ201',
    createdBy: 'usr-teacher-vance',
    description: 'Solve problems on aggregate demand and supply curves. Show all working and graphs.',
    dueDate: daysFromNow(0, 23, 59),
    priority: 'high',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: 'asg-3',
    title: 'Calculus Vector Fields Homework',
    subject: 'math301',
    createdBy: 'usr-teacher-vance',
    description: 'Complete exercises 4.1 to 4.8 on vector fields, line integrals, and Green\'s theorem.',
    dueDate: daysFromNow(0, 23, 59),
    priority: 'medium',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: 'asg-4',
    title: 'Cognitive Psychology Literature Review',
    subject: 'psy101',
    createdBy: 'usr-teacher-other',
    description: 'Write a 1500-word literature review on working memory models. Minimum 8 academic sources.',
    dueDate: daysFromNow(1, 23, 59),
    priority: 'high',
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: 'asg-5',
    title: 'Bioenergetics Lab Worksheet',
    subject: 'bio201',
    createdBy: 'usr-teacher-other',
    description: 'Complete the lab worksheet on cellular respiration and ATP synthesis. Include data analysis.',
    dueDate: daysFromNow(2, 17, 0),
    priority: 'medium',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'asg-6',
    title: 'Organic Chemistry Molecular Models',
    subject: 'chem201',
    createdBy: 'usr-teacher-other',
    description: 'Build and photograph molecular models for alkenes and alkynes. Submit photos with structural analysis.',
    dueDate: daysFromNow(3, 23, 59),
    priority: 'low',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: 'asg-7',
    title: 'Algorithms Design Project Draft',
    subject: 'cs201',
    createdBy: 'usr-teacher-chen',
    description: 'Submit first draft of the dynamic programming project. Include pseudocode and complexity analysis.',
    dueDate: daysFromNow(5, 23, 59),
    priority: 'medium',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: 'asg-8',
    title: 'Distributed Systems Reading Summary',
    subject: 'cs301',
    createdBy: 'usr-teacher-chen',
    description: 'Summarize chapters 5-7 of the distributed systems textbook. Focus on consensus protocols.',
    dueDate: daysFromNow(6, 23, 59),
    priority: 'low',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 'asg-9',
    title: 'Macroeconomics Case Study',
    subject: 'econ201',
    createdBy: 'usr-teacher-vance',
    description: 'Analyze the 2008 financial crisis using IS-LM framework. 2000-word report with references.',
    dueDate: daysAgo(3),
    priority: 'medium',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
  {
    id: 'asg-10',
    title: 'Calculus Integration Quiz Prep',
    subject: 'math301',
    createdBy: 'usr-teacher-vance',
    description: 'Complete practice problems on double and triple integrals. Self-assessment included.',
    dueDate: daysAgo(5),
    priority: 'high',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

/**
 * Decoupled student progress:
 * Tracks status for student 'usr-student-alex' independently.
 */
export const SEED_STUDENT_PROGRESS = [
  { studentId: 'usr-student-alex', assignmentId: 'asg-1', status: 'pending', updatedAt: daysAgo(1) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-2', status: 'in-progress', updatedAt: daysAgo(1) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-3', status: 'pending', updatedAt: daysAgo(2) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-4', status: 'pending', updatedAt: daysAgo(3) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-5', status: 'pending', updatedAt: daysAgo(2) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-6', status: 'pending', updatedAt: daysAgo(1) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-7', status: 'in-progress', updatedAt: daysAgo(4) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-8', status: 'pending', updatedAt: daysAgo(2) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-9', status: 'completed', updatedAt: daysAgo(3) },
  { studentId: 'usr-student-alex', assignmentId: 'asg-10', status: 'completed', updatedAt: daysAgo(5) },
];

export const SEED_NOTICES = [
  {
    id: 'notice-1',
    title: 'Mid-Semester Exam Schedule Released',
    summary: 'The mid-semester examination schedule for all departments has been published. Check your department portal for specific dates and venue details.',
    category: 'exam',
    source: 'Examination Cell',
    publishedAt: daysAgo(1),
    importance: 'high',
    read: false,
  },
  {
    id: 'notice-2',
    title: 'Library Hours Extended During Exam Week',
    summary: 'The central library will remain open until 11:00 PM during the examination period (Sep 15-25). Study rooms can be reserved online.',
    category: 'academic',
    source: 'Central Library',
    publishedAt: daysAgo(2),
    importance: 'medium',
    read: false,
  },
  {
    id: 'notice-3',
    title: 'Guest Lecture: AI in Modern Education',
    summary: 'Dr. Sarah Chen from MIT will deliver a guest lecture on "The Role of AI in Transforming Higher Education" in Auditorium A on Sep 12.',
    category: 'event',
    source: 'CS Department',
    publishedAt: daysAgo(3),
    importance: 'medium',
    read: true,
  },
  {
    id: 'notice-4',
    title: 'Course Registration Deadline Reminder',
    summary: 'Last date to add/drop courses for the current semester is Sep 10. No extensions will be granted after the deadline.',
    category: 'important',
    source: 'Registrar Office',
    publishedAt: daysAgo(1),
    importance: 'high',
    read: false,
  },
  {
    id: 'notice-5',
    title: 'Lab Safety Training Mandatory',
    summary: 'All students enrolled in laboratory courses must complete the online safety training module by Sep 14.',
    category: 'academic',
    source: 'Science Department',
    publishedAt: daysAgo(4),
    importance: 'medium',
    read: true,
  },
  {
    id: 'notice-6',
    title: 'Hackathon Registration Open',
    summary: 'Annual inter-college hackathon registration is now open. Teams of 2-4 members. Prize pool: $5,000. Register by Sep 20.',
    category: 'event',
    source: 'Student Council',
    publishedAt: daysAgo(2),
    importance: 'low',
    read: false,
  },
];

export const SEED_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'deadline',
    title: 'Assignment Overdue',
    description: 'Distributed Systems Lab 2 was due yesterday.',
    timestamp: daysAgo(0),
    read: false,
    link: '/assignments',
  },
  {
    id: 'notif-2',
    type: 'deadline',
    title: 'Due Today',
    description: 'Macroeconomics Problem Set 4 is due today at 11:59 PM.',
    timestamp: daysAgo(0),
    read: false,
    link: '/assignments',
  },
  {
    id: 'notif-3',
    type: 'deadline',
    title: 'Due Today',
    description: 'Calculus Vector Fields Homework is due today at 11:59 PM.',
    timestamp: daysAgo(0),
    read: false,
    link: '/assignments',
  },
  {
    id: 'notif-4',
    type: 'notice',
    title: 'New Notice',
    description: 'Mid-Semester Exam Schedule has been released.',
    timestamp: daysAgo(1),
    read: false,
    link: '/notices',
  },
  {
    id: 'notif-5',
    type: 'completion',
    title: 'Assignment Completed',
    description: 'You completed Macroeconomics Case Study.',
    timestamp: daysAgo(3),
    read: true,
    link: '/assignments',
  },
  {
    id: 'notif-6',
    type: 'notice',
    title: 'Important Notice',
    description: 'Course Registration Deadline is approaching.',
    timestamp: daysAgo(1),
    read: false,
    link: '/notices',
  },
  {
    id: 'notif-7',
    type: 'system',
    title: 'Welcome to TaskForge!',
    description: 'Start by reviewing your dashboard and Focus Today section.',
    timestamp: daysAgo(7),
    read: true,
    link: '/dashboard',
  },
];
