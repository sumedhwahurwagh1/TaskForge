/**
 * TaskForge Role-Based Access Control (RBAC) System
 * 
 * CORE PRINCIPLE:
 * - Students consume and track assignments, and update ONLY their own progress.
 * - Teachers create and manage assignments, BUT ONLY for authorized subjects.
 * - Assignment definitions and student progress are strictly separated.
 */

export const ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
};

export const ACTIONS = {
  ASSIGNMENT_VIEW: 'assignment:view',
  ASSIGNMENT_CREATE: 'assignment:create',
  ASSIGNMENT_UPDATE: 'assignment:update',
  ASSIGNMENT_DELETE: 'assignment:delete',
  PROGRESS_UPDATE_SELF: 'progress:update:self',
  SUBJECTS_VIEW: 'subjects:view',
  SUBJECTS_MANAGE: 'subjects:manage',
  AI_ACCESS: 'ai:access',
};

export const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    ACTIONS.ASSIGNMENT_VIEW,
    ACTIONS.PROGRESS_UPDATE_SELF,
    ACTIONS.SUBJECTS_VIEW,
    ACTIONS.AI_ACCESS,
  ],
  [ROLES.TEACHER]: [
    ACTIONS.ASSIGNMENT_VIEW,
    ACTIONS.ASSIGNMENT_CREATE,
    ACTIONS.ASSIGNMENT_UPDATE,
    ACTIONS.ASSIGNMENT_DELETE,
    ACTIONS.SUBJECTS_VIEW,
    ACTIONS.SUBJECTS_MANAGE,
  ],
};

/**
 * Centralized authorization check function.
 * 
 * @param {Object} user - The current authenticated user { id, role, authorizedSubjectIds }
 * @param {string} action - The action identifier from ACTIONS
 * @param {Object} [context] - Contextual data (e.g. { subjectId, studentId, assignment })
 * @returns {boolean} Whether the user is authorized to perform the action
 */
export function can(user, action, context = {}) {
  if (!user || !user.role) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions || !rolePermissions.includes(action)) {
    return false;
  }

  // Teacher-specific subject authorization for assignment mutations
  if ([ACTIONS.ASSIGNMENT_CREATE, ACTIONS.ASSIGNMENT_UPDATE, ACTIONS.ASSIGNMENT_DELETE].includes(action)) {
    if (user.role !== ROLES.TEACHER) {
      return false;
    }
    
    // Determine subject ID from context
    const subjectId = context.subjectId || context.assignment?.subject || context.assignment?.subjectId;
    if (subjectId && Array.isArray(user.authorizedSubjectIds)) {
      return user.authorizedSubjectIds.includes(subjectId);
    }
    // If creating without a specified subject, allowed to open create form (will validate chosen subject)
    if (action === ACTIONS.ASSIGNMENT_CREATE && !subjectId) {
      return true;
    }
    return false;
  }

  // Student-specific ownership check for progress updates
  if (action === ACTIONS.PROGRESS_UPDATE_SELF) {
    if (user.role !== ROLES.STUDENT) {
      return false;
    }
    if (context.studentId && context.studentId !== user.id) {
      return false; // Student cannot update another student's progress
    }
    return true;
  }

  return true;
}

/**
 * Check if a teacher is authorized to manage a specific subject.
 */
export function isTeacherAuthorizedForSubject(user, subjectId) {
  if (!user || user.role !== ROLES.TEACHER) return false;
  if (!subjectId) return false;
  return Array.isArray(user.authorizedSubjectIds) && user.authorizedSubjectIds.includes(subjectId);
}
