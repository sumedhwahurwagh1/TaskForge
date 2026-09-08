/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { loadState, saveState } from '../utils/storage';
import { DEMO_USERS, SEED_ASSIGNMENTS, SEED_STUDENT_PROGRESS, SEED_NOTICES, SEED_NOTIFICATIONS } from '../data/seedData';
import { can, ACTIONS as RBAC_ACTIONS, ROLES } from '../permissions/rbac';
import { setAuthToken } from '../services/api';

const AppContext = createContext(null);

const ACTIONS = {
  SWITCH_USER: 'SWITCH_USER',
  ADD_ASSIGNMENT: 'ADD_ASSIGNMENT',
  UPDATE_ASSIGNMENT: 'UPDATE_ASSIGNMENT',
  DELETE_ASSIGNMENT: 'DELETE_ASSIGNMENT',
  UPDATE_STUDENT_PROGRESS: 'UPDATE_STUDENT_PROGRESS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  MARK_ALL_READ: 'MARK_ALL_READ',
  UPDATE_NOTICE: 'UPDATE_NOTICE',
  SET_TOAST: 'SET_TOAST',
  CLEAR_TOAST: 'CLEAR_TOAST',
};

function generateId(prefix = 'tf') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function getInitialState() {
  const savedUserKey = loadState('currentUserKey');
  const initialUserKey = savedUserKey && DEMO_USERS[savedUserKey] ? savedUserKey : 'student';
  const currentUser = DEMO_USERS[initialUserKey];

  // Set initial token for API requests
  setAuthToken(`demo-token-${currentUser.role.toLowerCase()}-${currentUser.id}`);

  const savedAssignments = loadState('assignments_v2');
  const savedProgress = loadState('student_progress_v2');
  const savedNotifications = loadState('notifications_v2');
  const savedNotices = loadState('notices_v2');

  return {
    isDemoMode: true,
    currentUserKey: initialUserKey,
    currentUser,
    assignments: savedAssignments || SEED_ASSIGNMENTS,
    studentProgress: savedProgress || SEED_STUDENT_PROGRESS,
    notifications: savedNotifications || SEED_NOTIFICATIONS,
    notices: savedNotices || SEED_NOTICES,
    toast: null,
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SWITCH_USER: {
      const userKey = action.payload;
      const targetUser = DEMO_USERS[userKey];
      if (!targetUser) return state;

      // Update API token
      setAuthToken(`demo-token-${targetUser.role.toLowerCase()}-${targetUser.id}`);

      return {
        ...state,
        currentUserKey: userKey,
        currentUser: targetUser,
        toast: {
          message: `Switched to ${targetUser.name} (${targetUser.role === ROLES.TEACHER ? '👨‍🏫 Teacher' : '🎓 Student'})`,
          type: 'info',
        },
      };
    }

    case ACTIONS.ADD_ASSIGNMENT: {
      // Enforce RBAC
      if (!can(state.currentUser, RBAC_ACTIONS.ASSIGNMENT_CREATE, { subjectId: action.payload.subject })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: You do not have permission to create assignments for this subject.',
            type: 'error',
          },
        };
      }

      const newAssignment = {
        ...action.payload,
        id: generateId('asg'),
        createdBy: state.currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Ensure status is NOT stored on the shared assignment record
      delete newAssignment.status;

      const newNotification = {
        id: generateId('notif'),
        type: 'assignment',
        title: 'New Assignment Published',
        description: `"${newAssignment.title}" was added by ${state.currentUser.name}.`,
        timestamp: new Date().toISOString(),
        read: false,
        link: '/assignments',
      };

      return {
        ...state,
        assignments: [newAssignment, ...state.assignments],
        notifications: [newNotification, ...state.notifications],
        toast: { message: 'Assignment created successfully!', type: 'success' },
      };
    }

    case ACTIONS.UPDATE_ASSIGNMENT: {
      const existing = state.assignments.find(a => a.id === action.payload.id);
      if (!existing) {
        return { ...state, toast: { message: 'Assignment not found.', type: 'error' } };
      }

      // Enforce RBAC (Teacher must be authorized for this subject)
      if (!can(state.currentUser, RBAC_ACTIONS.ASSIGNMENT_UPDATE, { assignment: existing })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: You cannot modify assignments for this subject.',
            type: 'error',
          },
        };
      }

      const updatedPayload = { ...action.payload, updatedAt: new Date().toISOString() };
      delete updatedPayload.status; // Cannot set student status here

      return {
        ...state,
        assignments: state.assignments.map(a =>
          a.id === action.payload.id ? { ...a, ...updatedPayload } : a
        ),
        toast: { message: 'Assignment updated successfully!', type: 'success' },
      };
    }

    case ACTIONS.DELETE_ASSIGNMENT: {
      const existing = state.assignments.find(a => a.id === action.payload);
      if (!existing) return state;

      // Enforce RBAC
      if (!can(state.currentUser, RBAC_ACTIONS.ASSIGNMENT_DELETE, { assignment: existing })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: You cannot delete assignments for this subject.',
            type: 'error',
          },
        };
      }

      return {
        ...state,
        assignments: state.assignments.filter(a => a.id !== action.payload),
        // Clean up any progress records for the deleted assignment
        studentProgress: state.studentProgress.filter(p => p.assignmentId !== action.payload),
        toast: { message: 'Assignment deleted.', type: 'info' },
      };
    }

    case ACTIONS.UPDATE_STUDENT_PROGRESS: {
      const { assignmentId, status } = action.payload;

      // Enforce RBAC: Student can update ONLY their own progress
      if (!can(state.currentUser, RBAC_ACTIONS.PROGRESS_UPDATE_SELF, { studentId: state.currentUser.id })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: Only students can update personal progress.',
            type: 'error',
          },
        };
      }

      const existingIndex = state.studentProgress.findIndex(
        p => p.studentId === state.currentUser.id && p.assignmentId === assignmentId
      );

      let updatedProgress;
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        updatedProgress = [...state.studentProgress];
        updatedProgress[existingIndex] = {
          ...updatedProgress[existingIndex],
          status,
          updatedAt: now,
        };
      } else {
        updatedProgress = [
          ...state.studentProgress,
          {
            studentId: state.currentUser.id,
            assignmentId,
            status,
            updatedAt: now,
          },
        ];
      }

      const assignment = state.assignments.find(a => a.id === assignmentId);
      const isCompleted = status === 'completed';

      const notification = isCompleted && assignment ? {
        id: generateId('notif'),
        type: 'completion',
        title: 'Assignment Completed! 🎉',
        description: `You completed "${assignment.title}". Great job!`,
        timestamp: now,
        read: false,
        link: '/assignments',
      } : null;

      return {
        ...state,
        studentProgress: updatedProgress,
        notifications: notification
          ? [notification, ...state.notifications]
          : state.notifications,
        toast: {
          message: isCompleted ? '🎉 Assignment marked as completed!' : `Progress updated to ${status}.`,
          type: isCompleted ? 'success' : 'info',
        },
      };
    }

    case ACTIONS.ADD_NOTIFICATION: {
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    }

    case ACTIONS.MARK_NOTIFICATION_READ: {
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    }

    case ACTIONS.MARK_ALL_READ: {
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };
    }

    case ACTIONS.UPDATE_NOTICE: {
      return {
        ...state,
        notices: state.notices.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        ),
      };
    }

    case ACTIONS.SET_TOAST: {
      return { ...state, toast: action.payload };
    }

    case ACTIONS.CLEAR_TOAST: {
      return { ...state, toast: null };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);

  // Persist state changes
  useEffect(() => {
    saveState('currentUserKey', state.currentUserKey);
    saveState('assignments_v2', state.assignments);
    saveState('student_progress_v2', state.studentProgress);
    saveState('notifications_v2', state.notifications);
    saveState('notices_v2', state.notices);
  }, [state.currentUserKey, state.assignments, state.studentProgress, state.notifications, state.notices]);

  // Auto-clear toast
  useEffect(() => {
    if (state.toast) {
      const timer = setTimeout(() => {
        dispatch({ type: ACTIONS.CLEAR_TOAST });
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [state.toast]);

  /**
   * Helper selector: Merges assignments with current student's decoupled progress.
   * If current user is student, each assignment includes their specific status ('pending', 'in-progress', 'completed').
   */
  const assignmentsWithProgress = useMemo(() => {
    const studentId = state.currentUser?.id;
    return state.assignments.map(a => {
      const progressRecord = state.studentProgress.find(
        p => p.studentId === studentId && p.assignmentId === a.id
      );
      return {
        ...a,
        status: progressRecord?.status || 'pending',
      };
    });
  }, [state.assignments, state.studentProgress, state.currentUser]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        actions: ACTIONS,
        assignmentsWithProgress,
        currentUser: state.currentUser,
        isStudent: state.currentUser?.role === ROLES.STUDENT,
        isTeacher: state.currentUser?.role === ROLES.TEACHER,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export { ACTIONS };
