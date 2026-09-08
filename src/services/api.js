/**
 * TaskForge Centralized API Service Layer
 *
 * Handles all network requests to the FastAPI backend.
 *
 * SECURITY:
 * - Frontend NEVER contains SUPABASE_SERVICE_ROLE_KEY or private JWT secrets.
 * - Only safe client-side environment variables are accessed.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

let currentAuthToken = 'demo-token-student-alex';

export function setAuthToken(token) {
  currentAuthToken = token;
}

export function getAuthToken() {
  return currentAuthToken;
}

async function request(endpoint, options = {}) {
  const isMultipart =
    options.isMultipart === true ||
    (typeof FormData !== 'undefined' && options.body instanceof FormData);

  const headers = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
    ...(options.headers || {}),
  };

  const { isMultipart: _ignored, ...fetchOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.detail || `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.detail = errorData.detail;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const apiService = {
  async getMe() {
    return request('/auth/me');
  },

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

  async updateStudentProgress(assignmentId, status) {
    return request(`/assignments/${assignmentId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async uploadSubmission(assignmentId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      body: formData,
      isMultipart: true,
    });
  },

  async getMyAssignmentSubmissions(assignmentId) {
    return request(`/assignments/${assignmentId}/submissions/me`);
  },

  async getMySubmissions() {
    return request('/submissions/me');
  },

  async getTeacherAssignmentSubmissions(assignmentId) {
    return request(`/assignments/${assignmentId}/submissions`);
  },

  async getTeacherSubmissionSummary(assignmentId) {
    return request(`/assignments/${assignmentId}/submission-summary`);
  },

  async downloadSubmission(id) {
    const response = await fetch(`${API_BASE_URL}/submissions/${id}/download`, {
      headers: currentAuthToken
        ? { Authorization: `Bearer ${currentAuthToken}` }
        : {},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.detail || `Download failed with status ${response.status}`
      );
      error.status = response.status;
      throw error;
    }

    return {
      blob: await response.blob(),
      contentDisposition: response.headers.get('Content-Disposition') || '',
    };
  },

  async getSubjects() {
    return request('/subjects');
  },
};
