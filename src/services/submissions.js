import { apiService } from './api';
import { DEMO_USERS } from '../data/seedData';

const STORAGE_KEY = 'taskforge_submissions_v1';
const DEMO_MAX_SIZE = 5 * 1024 * 1024;

const isApiMode = () =>
  String(import.meta.env.VITE_DATA_MODE || 'demo').toLowerCase() === 'api';

function loadLocal() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function saveLocal(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function isoNow() {
  return new Date().toISOString();
}

function submissionStatus(dueDate) {
  return new Date() > new Date(dueDate) ? 'LATE' : 'SUBMITTED';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function seedDemoSubmissions() {
  const rows = loadLocal();
  if (rows.some(row => row.id === 'sub-demo-bob-asg1-v1')) return rows;

  const seed = {
    id: 'sub-demo-bob-asg1-v1',
    assignmentId: 'asg-1',
    studentId: 'usr-student-bob',
    studentName: 'Bob Smith',
    studentEmail: 'bob.smith@student.edu',
    assignmentTitle: 'Distributed Systems Lab 2',
    fileName: 'bob-distributed-systems.txt',
    fileType: 'text/plain',
    fileSize: 46,
    submittedAt: isoNow(),
    version: 1,
    status: 'SUBMITTED',
    dataUrl: 'data:text/plain;base64,RGVtbyBzdWJtaXNzaW9uIGZyb20gQm9iIFNtaXRoIGZvciBUYXNrRm9yZ2Uu',
  };
  const seeded = [seed, ...rows];
  saveLocal(seeded);
  return seeded;
}

function getDemoRows() {
  return seedDemoSubmissions();
}

export async function submitAssignmentFile({ assignmentId, studentId, assignment, file }) {
  if (!file) throw new Error('Please choose a file to submit.');

  if (!isApiMode()) {
    if (file.size > DEMO_MAX_SIZE) {
      throw new Error('Demo Mode supports files up to 5 MB. Use a smaller file for the live demo.');
    }

    const dataUrl = await fileToDataUrl(file);
    const rows = getDemoRows();
    const prior = rows.filter(
      row => row.assignmentId === assignmentId && row.studentId === studentId
    );
    const version =
      Math.max(...prior.map(row => Number(row.version) || 0), 0) + 1;
    const submittedAt = isoNow();

    const record = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assignmentId,
      studentId,
      assignmentTitle: assignment?.title || 'Assignment',
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      submittedAt,
      version,
      status: submissionStatus(assignment?.dueDate),
      dataUrl,
    };

    saveLocal([record, ...rows]);
    return record;
  }

  return apiService.uploadSubmission(assignmentId, file);
}

export async function getMyAssignmentSubmissions(assignmentId, studentId) {
  if (!isApiMode()) {
    return getDemoRows().filter(
      row => row.assignmentId === assignmentId && row.studentId === studentId
    );
  }
  return apiService.getMyAssignmentSubmissions(assignmentId);
}

export async function getMySubmissions(studentId) {
  if (!isApiMode()) {
    return getDemoRows()
      .filter(row => row.studentId === studentId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }
  return apiService.getMySubmissions();
}

export async function getTeacherAssignmentSubmissions(assignmentId) {
  if (!isApiMode()) {
    return getDemoRows().filter(row => row.assignmentId === assignmentId);
  }
  return apiService.getTeacherAssignmentSubmissions(assignmentId);
}

export async function getTeacherSubmissionSummary(assignmentId, assignment) {
  if (!isApiMode()) {
    const rows = getDemoRows().filter(row => row.assignmentId === assignmentId);
    const students = Object.values(DEMO_USERS).filter(user => user.role === 'STUDENT');
    const latest = new Map();

    rows.forEach(row => {
      const previous = latest.get(row.studentId);
      if (!previous || Number(row.version) > Number(previous.version)) {
        latest.set(row.studentId, row);
      }
    });

    const studentRows = students.map(student => {
      const row = latest.get(student.id);
      return row
        ? {
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            status: row.status,
            submittedAt: row.submittedAt,
            latestSubmission: row,
          }
        : {
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            status: 'NOT_SUBMITTED',
            submittedAt: null,
            latestSubmission: null,
          };
    });

    const submitted = studentRows.filter(row => row.latestSubmission).length;
    const late = studentRows.filter(row => row.status === 'LATE').length;
    const total = students.length;

    return {
      assignmentId,
      assignmentTitle: assignment?.title || 'Assignment',
      totalStudents: total,
      submitted,
      notSubmitted: total - submitted,
      late,
      submissionRate: total ? Math.round((submitted / total) * 1000) / 10 : 0,
      students: studentRows,
    };
  }

  return apiService.getTeacherSubmissionSummary(assignmentId);
}

export async function downloadSubmission(submission) {
  if (!isApiMode()) {
    if (!submission?.dataUrl) {
      throw new Error('This demo submission has no downloadable file content.');
    }
    const response = await fetch(submission.dataUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = submission.fileName || 'submission';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const result = await apiService.downloadSubmission(submission.id);
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const match = result.contentDisposition.match(/filename="([^"]+)"/i);
  anchor.download = match?.[1] || submission.fileName || 'submission';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
