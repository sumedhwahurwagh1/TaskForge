"""
TaskForge Security & RBAC Audit Test Suite
Tests All 12 Attack Vectors and Business Rules:
- Student cannot create, edit, or delete assignments (403)
- Student can update only their own progress (200)
- Student cannot update another student's progress (403)
- Student cannot inject metadata alterations via progress endpoint
- Teacher can manage authorized subjects only (201, 200)
- Teacher cannot manage unauthorized subjects (403)
- Unauthenticated requests are rejected (401)
"""

import unittest
from backend.app.database import db
from backend.app.dependencies.auth import HTTPException
from backend.app.handlers import (
    handle_get_me,
    handle_get_assignments,
    handle_get_assignment_by_id,
    handle_create_assignment,
    handle_update_assignment,
    handle_delete_assignment,
    handle_update_student_progress,
)

STUDENT_TOKEN = "Bearer demo-token-student-alex"
OTHER_STUDENT_TOKEN = "Bearer demo-token-student-bob"
TEACHER_CHEN_TOKEN = "Bearer demo-token-teacher-chen"   # Authorized: cs301, cs201
TEACHER_VANCE_TOKEN = "Bearer demo-token-teacher-vance" # Authorized: econ201, math301
INVALID_TOKEN = "Bearer invalid-garbage-token"


class TaskForgeRBACSecurityTests(unittest.TestCase):
    def setUp(self):
        db.reset()

    # TEST K: Unauthenticated request
    def test_k_unauthenticated_request_rejected(self):
        """Unauthenticated user accessing protected API must receive 401."""
        with self.assertRaises(HTTPException) as ctx:
            handle_get_me(None)
        self.assertEqual(ctx.exception.status_code, 401)

        with self.assertRaises(HTTPException) as ctx:
            handle_get_assignments(INVALID_TOKEN)
        self.assertEqual(ctx.exception.status_code, 401)

    # TEST A: Student sends POST /api/assignments
    def test_a_student_cannot_create_assignment(self):
        """Student attempting POST /api/assignments must receive 403 Forbidden."""
        payload = {
            "title": "Unauthorized Student Assignment",
            "subject_id": "cs301",
            "due_date": "2026-09-15T23:59:00Z",
            "priority": "HIGH",
        }
        with self.assertRaises(HTTPException) as ctx:
            handle_create_assignment(STUDENT_TOKEN, payload)
        self.assertEqual(ctx.exception.status_code, 403)

    # TEST B: Student sends PATCH /api/assignments/{id}
    def test_b_student_cannot_edit_assignment(self):
        """Student attempting PATCH /api/assignments/{id} must receive 403 Forbidden."""
        with self.assertRaises(HTTPException) as ctx:
            handle_update_assignment(STUDENT_TOKEN, "asg-1", {"title": "Hacked Title"})
        self.assertEqual(ctx.exception.status_code, 403)

    # TEST C: Student sends DELETE /api/assignments/{id}
    def test_c_student_cannot_delete_assignment(self):
        """Student attempting DELETE /api/assignments/{id} must receive 403 Forbidden."""
        with self.assertRaises(HTTPException) as ctx:
            handle_delete_assignment(STUDENT_TOKEN, "asg-1")
        self.assertEqual(ctx.exception.status_code, 403)

    # TEST D: Student sends PATCH /api/assignments/{id}/progress (Allowed for own progress)
    def test_d_student_can_update_own_progress(self):
        """Student updating their own progress must succeed with 200 OK."""
        code, data = handle_update_student_progress(
            STUDENT_TOKEN,
            "asg-1",
            {"status": "COMPLETED"}
        )
        self.assertEqual(code, 200)
        self.assertEqual(data["status"], "COMPLETED")
        self.assertEqual(data["student_id"], "usr-student-alex")

    # TEST E: Student attempts to update another student's progress
    def test_e_student_cannot_update_another_students_progress(self):
        """Student attempting to update another student's progress must receive 403 Forbidden."""
        payload = {
            "student_id": "usr-student-bob",
            "status": "COMPLETED",
        }
        with self.assertRaises(HTTPException) as ctx:
            handle_update_student_progress(STUDENT_TOKEN, "asg-1", payload)
        self.assertEqual(ctx.exception.status_code, 403)

    # TEST F: Student attempts to alter assignment metadata via progress endpoint
    def test_f_student_progress_cannot_alter_assignment_metadata(self):
        """Progress updates must NOT modify assignment title, due date, or priority."""
        payload = {
            "status": "COMPLETED",
            "title": "Hacked Course Assignment",
            "priority": "LOW",
        }
        code, _ = handle_update_student_progress(STUDENT_TOKEN, "asg-1", payload)
        self.assertEqual(code, 200)

        # Verify underlying assignment record remained unchanged
        assignment = db.get_assignment_by_id("asg-1")
        self.assertEqual(assignment["title"], "Distributed Systems Lab 2")
        self.assertEqual(assignment["priority"], "HIGH")

    # TEST G: Teacher creates assignment for authorized subject
    def test_g_teacher_creates_assignment_for_authorized_subject(self):
        """Teacher creating an assignment for an authorized subject receives 201 Created."""
        payload = {
            "title": "CS 301 Raft Protocol Implementation",
            "subject_id": "cs301", # Dr. Chen is authorized for cs301
            "description": "Implement consensus leader election.",
            "due_date": "2026-09-20T23:59:00Z",
            "priority": "HIGH",
        }
        code, data = handle_create_assignment(TEACHER_CHEN_TOKEN, payload)
        self.assertEqual(code, 201)
        self.assertEqual(data["title"], "CS 301 Raft Protocol Implementation")
        self.assertEqual(data["created_by"], "usr-teacher-chen")

    # TEST H: Teacher attempts to create assignment for unauthorized subject
    def test_h_teacher_cannot_create_for_unauthorized_subject(self):
        """Teacher creating an assignment for an unauthorized subject receives 403 Forbidden."""
        payload = {
            "title": "Unauthorized Economics Exam",
            "subject_id": "econ201", # Dr. Chen is NOT authorized for econ201 (Prof. Vance teaches it)
            "due_date": "2026-09-20T23:59:00Z",
            "priority": "HIGH",
        }
        with self.assertRaises(HTTPException) as ctx:
            handle_create_assignment(TEACHER_CHEN_TOKEN, payload)
        self.assertEqual(ctx.exception.status_code, 403)

    # TEST I: Teacher attempts to edit unauthorized subject assignment
    def test_i_teacher_cannot_edit_unauthorized_subject_assignment(self):
        """Teacher editing an assignment in an unauthorized subject receives 403 Forbidden."""
        # asg-2 belongs to econ201 (Prof. Vance)
        with self.assertRaises(HTTPException) as ctx:
            handle_update_assignment(TEACHER_CHEN_TOKEN, "asg-2", {"title": "Dr. Chen Edit Attempt"})
        self.assertEqual(ctx.exception.status_code, 403)

        # But Prof. Vance CAN edit asg-2 (authorized for econ201)
        code, data = handle_update_assignment(TEACHER_VANCE_TOKEN, "asg-2", {"title": "Vance Authorized Update"})
        self.assertEqual(code, 200)
        self.assertEqual(data["title"], "Vance Authorized Update")

    # TEST J: Teacher attempts to delete unauthorized subject assignment
    def test_j_teacher_cannot_delete_unauthorized_subject_assignment(self):
        """Teacher deleting an assignment in an unauthorized subject receives 403 Forbidden."""
        # asg-2 belongs to econ201 (Prof. Vance)
        with self.assertRaises(HTTPException) as ctx:
            handle_delete_assignment(TEACHER_CHEN_TOKEN, "asg-2")
        self.assertEqual(ctx.exception.status_code, 403)

        # Prof. Vance CAN delete it
        code, _ = handle_delete_assignment(TEACHER_VANCE_TOKEN, "asg-2")
        self.assertEqual(code, 200)
        self.assertIsNone(db.get_assignment_by_id("asg-2"))

    # TEST L: Decoupled progress does not pollute other students
    def test_l_student_progress_isolation(self):
        """One student's status change must NOT affect another student's status."""
        # Alex marks asg-1 as COMPLETED
        handle_update_student_progress(STUDENT_TOKEN, "asg-1", {"status": "COMPLETED"})

        # Retrieve assignments for Bob
        _, bob_assignments = handle_get_assignments(OTHER_STUDENT_TOKEN)
        asg1_bob = next(a for a in bob_assignments if a["id"] == "asg-1")

        # Bob should see his own status, NOT Alex's
        # Bob already had asg-1 as COMPLETED in initial seed, but let's reset Bob's to NOT_STARTED
        db.update_student_progress("usr-student-bob", "asg-1", "NOT_STARTED")
        _, bob_assignments2 = handle_get_assignments(OTHER_STUDENT_TOKEN)
        asg1_bob2 = next(a for a in bob_assignments2 if a["id"] == "asg-1")
        self.assertEqual(asg1_bob2["progress"]["status"], "NOT_STARTED")

        # Alex's progress remains COMPLETED
        alex_prog = db.get_student_progress("usr-student-alex", "asg-1")
        self.assertEqual(alex_prog["status"], "COMPLETED")


if __name__ == "__main__":
    unittest.main()
