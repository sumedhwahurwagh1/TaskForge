/**
 * TaskForge Centralized API Service Layer
 * 
 * Handles all network requests to the FastAPI backend with clear separation between
 * Full-Stack API Mode and Demo Mode.
 * 
 * SECURITY:
 * - Frontend NEVER contains SUPABASE_SERVICE_ROLE_KEY or private JWT secrets.
 * - Only safe client-side environment variables are accessed:
 *   - VITE_API_BASE_URL
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * In-memory storage for active authentication token.
 * In full-stack mode, this is the Supabase JWT.
 * In demo mode, this is a simulated demo token (e.g. 'demo-token-student-alex').
 */
let currentAuthToken = 'demo-token-student-alex';

export function setAuthToken(token) {
  currentAuthToken = token;
}

export function getAuthToken() {
  return currentAuthToken;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.detail = errorData.detail;
    throw error;
  }

  // 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

export const apiService = {
  // Auth
  async getMe() {
    return request('/auth/me');
  },

  // Assignments
  async getAssignments() {
    return request('/assignments');
  },

  async getAssignment(id) {
    return request(`/assignments/${id}`);
  },

  async createAssignment(assignmentData) {
    return request('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  },

  async updateAssignment(id, updateData) {
    return request(`/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  async deleteAssignment(id) {
    return request(`/assignments/${id}`, {
      method: 'DELETE',
    });
  },

  // Student Progress (Decoupled personal state)
  async updateStudentProgress(assignmentId, status) {
    return request(`/assignments/${assignmentId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Subjects
  async getSubjects() {
    return request('/subjects');
  },
};
