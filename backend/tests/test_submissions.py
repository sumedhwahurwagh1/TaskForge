"""
TaskForge assignment submission security and workflow tests.
"""

import unittest

from backend.app.database import db
from backend.app.dependencies.auth import HTTPException
from backend.app.handlers import (
    handle_create_submission,
    handle_get_my_assignment_submissions,
    handle_get_my_submissions,
    handle_get_teacher_assignment_submissions,
    handle_get_teacher_submission_summary,
    handle_download_submission,
)

STUDENT_TOKEN = "Bearer demo-token-student-alex"
OTHER_STUDENT_TOKEN = "Bearer demo-token-student-bob"
TEACHER_CHEN_TOKEN = "Bearer demo-token-teacher-chen"
TEACHER_VANCE_TOKEN = "Bearer demo-token-teacher-vance"


class TaskForgeSubmissionTests(unittest.TestCase):
    def setUp(self):
        db.reset()

    def test_student_can_submit_file(self):
        code, data = handle_create_submission(
            STUDENT_TOKEN,
            "asg-1",
            "final-report.pdf",
            "application/pdf",
            b"%PDF-demo-taskforge",
        )
        self.assertEqual(code, 201)
        self.assertEqual(data["student_id"], "usr-student-alex")
        self.assertEqual(data["assignment_id"], "asg-1")
        self.assertEqual(data["file_name"], "final-report.pdf")
        self.assertEqual(data["version"], 1)

    def test_student_submission_history_is_private(self):
        handle_create_submission(
            STUDENT_TOKEN,
            "asg-1",
            "final-report.pdf",
            "application/pdf",
            b"%PDF-demo-taskforge",
        )
        _, alex_rows = handle_get_my_submissions(STUDENT_TOKEN)
        _, bob_rows = handle_get_my_submissions(OTHER_STUDENT_TOKEN)

        self.assertTrue(any(row["student_id"] == "usr-student-alex" for row in alex_rows))
        self.assertTrue(all(row["student_id"] == "usr-student-bob" for row in bob_rows))

        with self.assertRaises(HTTPException) as ctx:
            handle_get_my_submissions(TEACHER_CHEN_TOKEN)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_student_assignment_history_returns_only_own_rows(self):
        handle_create_submission(
            STUDENT_TOKEN,
            "asg-1",
            "v1.pdf",
            "application/pdf",
            b"%PDF-v1",
        )
        handle_create_submission(
            STUDENT_TOKEN,
            "asg-1",
            "v2.pdf",
            "application/pdf",
            b"%PDF-v2",
        )

        code, rows = handle_get_my_assignment_submissions(STUDENT_TOKEN, "asg-1")
        self.assertEqual(code, 200)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["version"], 2)

    def test_student_cannot_view_teacher_submission_overview(self):
        with self.assertRaises(HTTPException) as ctx:
            handle_get_teacher_assignment_submissions(STUDENT_TOKEN, "asg-1")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_teacher_can_view_submission_overview_for_authorized_subject(self):
        code, rows = handle_get_teacher_assignment_submissions(TEACHER_CHEN_TOKEN, "asg-1")
        self.assertEqual(code, 200)
        self.assertTrue(any(row["student_id"] == "usr-student-bob" for row in rows))

    def test_teacher_cannot_view_unauthorized_subject_submissions(self):
        with self.assertRaises(HTTPException) as ctx:
            handle_get_teacher_assignment_submissions(TEACHER_VANCE_TOKEN, "asg-1")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_teacher_summary_identifies_not_submitted_students(self):
        code, summary = handle_get_teacher_submission_summary(TEACHER_CHEN_TOKEN, "asg-1")
        self.assertEqual(code, 200)
        self.assertEqual(summary["total_students"], 2)
        self.assertEqual(summary["submitted"], 1)
        self.assertEqual(summary["not_submitted"], 1)

        alex = next(row for row in summary["students"] if row["student_id"] == "usr-student-alex")
        bob = next(row for row in summary["students"] if row["student_id"] == "usr-student-bob")
        self.assertEqual(alex["status"], "NOT_SUBMITTED")
        self.assertEqual(bob["status"], "SUBMITTED")

    def test_student_cannot_download_another_students_submission(self):
        with self.assertRaises(HTTPException) as ctx:
            handle_download_submission(
                STUDENT_TOKEN,
                "sub-demo-bob-asg1-v1",
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_teacher_can_download_submission_for_authorized_subject(self):
        content, content_type, file_name = handle_download_submission(
            TEACHER_CHEN_TOKEN,
            "sub-demo-bob-asg1-v1",
        )
        self.assertIn(b"Demo submission", content)
        self.assertEqual(content_type, "text/plain")
        self.assertEqual(file_name, "bob-distributed-systems.txt")


if __name__ == "__main__":
    unittest.main()
