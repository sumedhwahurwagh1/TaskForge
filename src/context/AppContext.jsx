/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { loadState, saveState } from '../utils/storage';
import {
  DEMO_USERS,
  SEED_ASSIGNMENTS,
  SEED_STUDENT_PROGRESS,
  SEED_NOTICES,
  SEED_NOTIFICATIONS,
} from '../data/seedData';
import { can, ACTIONS as RBAC_ACTIONS, ROLES } from '../permissions/rbac';
import { apiService, setAuthToken } from '../services/api';

const AppContext = createContext(null);

export const ACTIONS = {
  SWITCH_USER: 'SWITCH_USER',
  HYDRATE_REMOTE: 'HYDRATE_REMOTE',
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

const DATA_MODE = (import.meta.env.VITE_DATA_MODE || 'demo').toLowerCase();
const USE_API = DATA_MODE === 'api';

function generateId(prefix = 'tf') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function normalizeStatus(status) {
  const value = String(status || 'NOT_STARTED').toUpperCase();
  if (value === 'COMPLETED') return 'completed';
  if (value === 'IN_PROGRESS') return 'in-progress';
  return 'pending';
}

function mapAssignmentFromApi(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject_id,
    createdBy: row.created_by,
    description: row.description || '',
    dueDate: row.due_date,
    priority: String(row.priority || 'MEDIUM').toLowerCase(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progressStatus: row.progress?.status ? normalizeStatus(row.progress.status) : undefined,
  };
}

function mapAssignmentToApi(payload) {
  return {
    title: payload.title,
    subject_id: payload.subject,
    description: payload.description || '',
    due_date: payload.dueDate,
    priority: String(payload.priority || 'medium').toUpperCase(),
  };
}

function getInitialState() {
  const savedUserKey = loadState('currentUserKey');
  const initialUserKey = savedUserKey && DEMO_USERS[savedUserKey] ? savedUserKey : 'student';
  const currentUser = DEMO_USERS[initialUserKey];

  setAuthToken(`demo-token-${currentUser.role.toLowerCase()}-${currentUser.id.replace('usr-', '')}`);

  return {
    isDemoMode: !USE_API,
    dataMode: USE_API ? 'api' : 'demo',
    isHydrating: USE_API,
    currentUserKey: initialUserKey,
    currentUser,
    assignments: loadState('assignments_v2') || SEED_ASSIGNMENTS,
    studentProgress: loadState('student_progress_v2') || SEED_STUDENT_PROGRESS,
    notifications: loadState('notifications_v2') || SEED_NOTIFICATIONS,
    notices: loadState('notices_v2') || SEED_NOTICES,
    toast: null,
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SWITCH_USER: {
      const targetUser = DEMO_USERS[action.payload];
      if (!targetUser) return state;

      setAuthToken(`demo-token-${targetUser.role.toLowerCase()}-${targetUser.id.replace('usr-', '')}`);

      return {
        ...state,
        currentUserKey: action.payload,
        currentUser: targetUser,
        isHydrating: USE_API,
        toast: {
          message: `Switched to ${targetUser.name} (${targetUser.role === ROLES.TEACHER ? '👨‍🏫 Teacher' : '🎓 Student'})`,
          type: 'info',
        },
      };
    }

    case ACTIONS.HYDRATE_REMOTE: {
      return {
        ...state,
        assignments: action.payload.assignments,
        studentProgress: action.payload.studentProgress,
        isHydrating: false,
      };
    }

    case ACTIONS.ADD_ASSIGNMENT: {
      if (!can(state.currentUser, RBAC_ACTIONS.ASSIGNMENT_CREATE, {
        subjectId: action.payload.subject,
      })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: You do not have permission to create assignments for this subject.',
            type: 'error',
          },
        };
      }

      const server = action.serverRecord;
      const newAssignment = server || {
        ...action.payload,
        id: generateId('asg'),
        createdBy: state.currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

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
        assignments: [newAssignment, ...state.assignments.filter(a => a.id !== newAssignment.id)],
        notifications: [newNotification, ...state.notifications],
        toast: { message: 'Assignment created successfully!', type: 'success' },
      };
    }

    case ACTIONS.UPDATE_ASSIGNMENT: {
      const existing = state.assignments.find(a => a.id === action.payload.id);
      if (!existing) {
        return { ...state, toast: { message: 'Assignment not found.', type: 'error' } };
      }

      if (!can(state.currentUser, RBAC_ACTIONS.ASSIGNMENT_UPDATE, { assignment: existing })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: You cannot modify assignments for this subject.',
            type: 'error',
          },
        };
      }

      const updated = action.serverRecord || {
        ...existing,
        ...action.payload,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        assignments: state.assignments.map(a => (a.id === updated.id ? updated : a)),
        toast: { message: 'Assignment updated successfully!', type: 'success' },
      };
    }

    case ACTIONS.DELETE_ASSIGNMENT: {
      const existing = state.assignments.find(a => a.id === action.payload);
      if (!existing) return state;

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
        studentProgress: state.studentProgress.filter(p => p.assignmentId !== action.payload),
        toast: { message: 'Assignment deleted.', type: 'info' },
      };
    }

    case ACTIONS.UPDATE_STUDENT_PROGRESS: {
      const { assignmentId, status } = action.payload;
      if (!can(state.currentUser, RBAC_ACTIONS.PROGRESS_UPDATE_SELF, { studentId: state.currentUser.id })) {
        return {
          ...state,
          toast: {
            message: 'Forbidden: Only students can update personal progress.',
            type: 'error',
          },
        };
      }

      const normalized = normalizeStatus(status);
      const dbStatus = normalized === 'completed'
        ? 'COMPLETED'
        : normalized === 'in-progress'
          ? 'IN_PROGRESS'
          : 'NOT_STARTED';
      const existingIndex = state.studentProgress.findIndex(
        p => p.studentId === state.currentUser.id && p.assignmentId === assignmentId
      );
      const record = {
        studentId: state.currentUser.id,
        assignmentId,
        status: dbStatus,
        updatedAt: new Date().toISOString(),
      };

      const updatedProgress = [...state.studentProgress];
      if (existingIndex >= 0) updatedProgress[existingIndex] = record;
      else updatedProgress.push(record);

      const assignment = state.assignments.find(a => a.id === assignmentId);
      const isCompleted = normalized === 'completed';
      const notification = isCompleted && assignment ? {
        id: generateId('notif'),
        type: 'completion',
        title: 'Assignment Completed! 🎉',
        description: `You completed "${assignment.title}". Great job!`,
        timestamp: record.updatedAt,
        read: false,
        link: '/assignments',
      } : null;

      return {
        ...state,
        studentProgress: updatedProgress,
        notifications: notification ? [notification, ...state.notifications] : state.notifications,
        toast: {
          message: isCompleted ? '🎉 Assignment marked as completed!' : `Progress updated to ${normalized === 'in-progress' ? 'In Progress' : 'Not Started'}.`,
          type: isCompleted ? 'success' : 'info',
        },
      };
    }

    case ACTIONS.ADD_NOTIFICATION:
      return { ...state, notifications: [action.payload, ...state.notifications] };

    case ACTIONS.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case ACTIONS.MARK_ALL_READ:
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };

    case ACTIONS.UPDATE_NOTICE:
      return {
        ...state,
        notices: state.notices.map(n => n.id === action.payload.id ? { ...n, ...action.payload } : n),
      };

    case ACTIONS.SET_TOAST:
      return { ...state, toast: action.payload };

    case ACTIONS.CLEAR_TOAST:
      return { ...state, toast: null };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, rawDispatch] = useReducer(appReducer, null, getInitialState);

  useEffect(() => {
    if (!USE_API) return;

    let cancelled = false;
    async function hydrate() {
      try {
        const [assignments] = await Promise.all([apiService.getAssignments()]);
        if (cancelled) return;

        const mappedAssignments = assignments.map(mapAssignmentFromApi);
        const progress = mappedAssignments
          .filter(a => a.progressStatus)
          .map(a => ({
            studentId: state.currentUser.id,
            assignmentId: a.id,
            status: a.progressStatus === 'completed' ? 'COMPLETED' : a.progressStatus === 'in-progress' ? 'IN_PROGRESS' : 'NOT_STARTED',
            updatedAt: new Date().toISOString(),
          }));

        rawDispatch({
          type: ACTIONS.HYDRATE_REMOTE,
          payload: { assignments: mappedAssignments, studentProgress: progress },
        });
      } catch (error) {
        rawDispatch({
          type: ACTIONS.SET_TOAST,
          payload: {
            message: `API unavailable: ${error.message}. Using cached demo data.`,
            type: 'error',
          },
        });
        rawDispatch({ type: ACTIONS.HYDRATE_REMOTE, payload: {
          assignments: state.assignments,
          studentProgress: state.studentProgress,
        }});
      }
    }

    hydrate();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUserKey]);

  const dispatch = useCallback(async (action) => {
    if (!USE_API) {
      rawDispatch(action);
      return;
    }

    try {
      if (action.type === ACTIONS.ADD_ASSIGNMENT) {
        const response = await apiService.createAssignment(mapAssignmentToApi(action.payload));
        rawDispatch({
          type: ACTIONS.ADD_ASSIGNMENT,
          payload: action.payload,
          serverRecord: mapAssignmentFromApi(response),
        });
        return;
      }

      if (action.type === ACTIONS.UPDATE_ASSIGNMENT) {
        const response = await apiService.updateAssignment(
          action.payload.id,
          mapAssignmentToApi(action.payload)
        );
        rawDispatch({
          type: ACTIONS.UPDATE_ASSIGNMENT,
          payload: action.payload,
          serverRecord: mapAssignmentFromApi(response),
        });
        return;
      }

      if (action.type === ACTIONS.DELETE_ASSIGNMENT) {
        await apiService.deleteAssignment(action.payload);
        rawDispatch(action);
        return;
      }

      if (action.type === ACTIONS.UPDATE_STUDENT_PROGRESS) {
        const response = await apiService.updateStudentProgress(
          action.payload.assignmentId,
          action.payload.status.toUpperCase().replace('-', '_')
        );
        rawDispatch({
          ...action,
          payload: {
            ...action.payload,
            status: response.status || action.payload.status,
          },
        });
        return;
      }

      rawDispatch(action);
    } catch (error) {
      rawDispatch({
        type: ACTIONS.SET_TOAST,
        payload: {
          message: error.status === 403
            ? 'Permission denied.'
            : `Request failed: ${error.message}`,
          type: 'error',
        },
      });
    }
  }, []);

  useEffect(() => {
    saveState('currentUserKey', state.currentUserKey);
    if (!USE_API || !state.isHydrating) {
      saveState('assignments_v2', state.assignments);
      saveState('student_progress_v2', state.studentProgress);
      saveState('notifications_v2', state.notifications);
      saveState('notices_v2', state.notices);
    }
  }, [state.currentUserKey, state.assignments, state.studentProgress, state.notifications, state.notices, state.isHydrating]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(() => rawDispatch({ type: ACTIONS.CLEAR_TOAST }), 3200);
    return () => clearTimeout(timer);
  }, [state.toast]);

  const assignmentsWithProgress = useMemo(() => {
    const studentId = state.currentUser?.id;

    return state.assignments.map(assignment => {
      const progressRecord = state.studentProgress.find(
        p => p.studentId === studentId && p.assignmentId === assignment.id
      );

      return {
        ...assignment,
        status: normalizeStatus(progressRecord?.status || assignment.progressStatus || 'NOT_STARTED'),
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
        isDemoMode: state.isDemoMode,
        isApiMode: USE_API,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
