"""
TaskForge database adapter.

When Supabase environment variables are configured, this adapter uses the
real Supabase PostgREST API. When they are absent, it falls back to an
in-memory dataset for local/demo development.

Security model:
- FastAPI handlers authenticate and authorize every mutation.
- The Supabase server credential is backend-only.
- Student progress is stored separately from shared assignment definitions.
"""

import datetime as dt
import os
import uuid
from typing import Dict, List, Optional

try:
    from supabase import create_client
except ImportError:  # pragma: no cover
    create_client = None


DEMO_USERS = {
    "usr-student-alex": {"id": "usr-student-alex", "name": "Alex Rivera", "email": "alex.rivera@student.edu", "role": "STUDENT"},
    "usr-student-bob": {"id": "usr-student-bob", "name": "Bob Smith", "email": "bob.smith@student.edu", "role": "STUDENT"},
    "usr-teacher-chen": {"id": "usr-teacher-chen", "name": "Dr. Sarah Chen", "email": "sarah.chen@university.edu", "role": "TEACHER", "department": "Computer Science"},
    "usr-teacher-vance": {"id": "usr-teacher-vance", "name": "Prof. Marcus Vance", "email": "marcus.vance@university.edu", "role": "TEACHER", "department": "Economics & Mathematics"},
}

TEACHER_SUBJECTS = {
    "usr-teacher-chen": ["cs301", "cs201"],
    "usr-teacher-vance": ["econ201", "math301"],
}

SUBMISSION_BUCKET = "assignment-submissions"
MAX_SUBMISSION_SIZE = 15 * 1024 * 1024

SUBJECTS = [
    {"id": "cs301", "code": "CS 301", "name": "Distributed Systems", "color": "#6366f1"},
    {"id": "cs201", "code": "CS 201", "name": "Algorithms & Data Structures", "color": "#8b5cf6"},
    {"id": "econ201", "code": "ECON 201", "name": "Macroeconomics", "color": "#0ea5e9"},
    {"id": "math301", "code": "MATH 301", "name": "Calculus III", "color": "#14b8a6"},
    {"id": "psy101", "code": "PSY 101", "name": "Cognitive Psychology", "color": "#f59e0b"},
    {"id": "chem201", "code": "CHEM 201", "name": "Organic Chemistry", "color": "#ef4444"},
    {"id": "bio201", "code": "BIO 201", "name": "Bioenergetics", "color": "#22c55e"},
]


def _days_from_now(days: int, hour: int = 23, minute: int = 59) -> str:
    value = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=days)
    value = value.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return value.isoformat()


def _days_ago(days: int) -> str:
    value = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)
    return value.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


INITIAL_ASSIGNMENTS = [
    {"id": "asg-1", "subject_id": "cs301", "created_by": "usr-teacher-chen", "title": "Distributed Systems Lab 2", "description": "Implement a basic leader election algorithm using the Bully algorithm.", "due_date": _days_from_now(-1), "priority": "HIGH", "created_at": _days_ago(5), "updated_at": _days_ago(5)},
    {"id": "asg-2", "subject_id": "econ201", "created_by": "usr-teacher-vance", "title": "Macroeconomics Problem Set 4", "description": "Solve problems on aggregate demand and supply curves.", "due_date": _days_from_now(0), "priority": "HIGH", "created_at": _days_ago(4), "updated_at": _days_ago(4)},
    {"id": "asg-3", "subject_id": "cs201", "created_by": "usr-teacher-chen", "title": "Dynamic Programming Practice", "description": "Solve knapsack and longest common subsequence exercises.", "due_date": _days_from_now(4), "priority": "MEDIUM", "created_at": _days_ago(3), "updated_at": _days_ago(3)},
    {"id": "asg-4", "subject_id": "psy101", "created_by": "usr-teacher-other", "title": "Cognitive Psychology Literature Review", "description": "Write a 1500-word literature review on working memory models.", "due_date": _days_from_now(1), "priority": "HIGH", "created_at": _days_ago(7), "updated_at": _days_ago(7)},
    {"id": "asg-5", "subject_id": "bio201", "created_by": "usr-teacher-other", "title": "Bioenergetics Lab Worksheet", "description": "Complete the lab worksheet on cellular respiration and ATP synthesis.", "due_date": _days_from_now(2), "priority": "MEDIUM", "created_at": _days_ago(2), "updated_at": _days_ago(2)},
    {"id": "asg-6", "subject_id": "chem201", "created_by": "usr-teacher-other", "title": "Organic Chemistry Molecular Models", "description": "Build and document molecular models for alkenes and alkynes.", "due_date": _days_from_now(3), "priority": "LOW", "created_at": _days_ago(3), "updated_at": _days_ago(3)},
    {"id": "asg-7", "subject_id": "cs201", "created_by": "usr-teacher-chen", "title": "Algorithms Design Project Draft", "description": "Submit the first draft with pseudocode and complexity analysis.", "due_date": _days_from_now(5), "priority": "MEDIUM", "created_at": _days_ago(10), "updated_at": _days_ago(10)},
    {"id": "asg-8", "subject_id": "cs301", "created_by": "usr-teacher-chen", "title": "Distributed Systems Reading Summary", "description": "Summarize chapters 5-7 with emphasis on consensus protocols.", "due_date": _days_from_now(6), "priority": "LOW", "created_at": _days_ago(2), "updated_at": _days_ago(2)},
    {"id": "asg-9", "subject_id": "econ201", "created_by": "usr-teacher-vance", "title": "Macroeconomics Case Study", "description": "Analyze the 2008 financial crisis using the IS-LM framework.", "due_date": _days_from_now(-3), "priority": "MEDIUM", "created_at": _days_ago(14), "updated_at": _days_ago(14)},
    {"id": "asg-10", "subject_id": "math301", "created_by": "usr-teacher-vance", "title": "Calculus Integration Quiz Prep", "description": "Complete practice problems on double and triple integrals.", "due_date": _days_from_now(-5), "priority": "HIGH", "created_at": _days_ago(10), "updated_at": _days_ago(10)},
]

INITIAL_STUDENT_PROGRESS = [
    {"student_id": "usr-student-alex", "assignment_id": "asg-1", "status": "IN_PROGRESS", "updated_at": _days_ago(1)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-2", "status": "NOT_STARTED", "updated_at": _days_ago(1)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-3", "status": "NOT_STARTED", "updated_at": _days_ago(2)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-4", "status": "NOT_STARTED", "updated_at": _days_ago(3)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-5", "status": "NOT_STARTED", "updated_at": _days_ago(2)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-6", "status": "NOT_STARTED", "updated_at": _days_ago(1)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-7", "status": "IN_PROGRESS", "updated_at": _days_ago(4)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-8", "status": "NOT_STARTED", "updated_at": _days_ago(2)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-9", "status": "COMPLETED", "updated_at": _days_ago(3)},
    {"student_id": "usr-student-alex", "assignment_id": "asg-10", "status": "COMPLETED", "updated_at": _days_ago(5)},
]

INITIAL_NOTICES = [
    {"id": "notice-1", "title": "Mid-Semester Exam Schedule Released", "summary": "The mid-semester examination schedule has been published.", "category": "exam", "source": "Examination Cell", "published_at": _days_ago(1), "importance": "high", "read": False},
    {"id": "notice-2", "title": "Library Hours Extended During Exam Week", "summary": "The central library will remain open until 11:00 PM during exam week.", "category": "academic", "source": "Central Library", "published_at": _days_ago(2), "importance": "medium", "read": False},
    {"id": "notice-3", "title": "Guest Lecture: AI in Modern Education", "summary": "Guest lecture on the role of AI in higher education.", "category": "event", "source": "CS Department", "published_at": _days_ago(3), "importance": "medium", "read": True},
    {"id": "notice-4", "title": "Course Registration Deadline Reminder", "summary": "Last date to add/drop courses is approaching.", "category": "important", "source": "Registrar Office", "published_at": _days_ago(1), "importance": "high", "read": False},
    {"id": "notice-5", "title": "Lab Safety Training Mandatory", "summary": "All students in laboratory courses must complete safety training.", "category": "academic", "source": "Science Department", "published_at": _days_ago(4), "importance": "medium", "read": True},
    {"id": "notice-6", "title": "Hackathon Registration Open", "summary": "Annual inter-college hackathon registration is open.", "category": "event", "source": "Student Council", "published_at": _days_ago(2), "importance": "low", "read": False},
]


class Database:
    def __init__(self):
        self.mode = "memory"
        self.client = None
        url = os.getenv("SUPABASE_URL", "").strip()
        key = (os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

        if url and key:
            if create_client is None:
                raise RuntimeError("supabase package is required when Supabase is configured")
            self.client = create_client(url, key)
            self.mode = "supabase"

        self.users = dict(DEMO_USERS)
        self.teacher_subjects = {k: list(v) for k, v in TEACHER_SUBJECTS.items()}
        self.subjects = list(SUBJECTS)

        self.assignments: Dict[str, dict] = {a["id"]: dict(a) for a in INITIAL_ASSIGNMENTS}
        self.progress: Dict[str, dict] = {
            f"{p['student_id']}:{p['assignment_id']}": dict(p) for p in INITIAL_STUDENT_PROGRESS
        }
        # Demo-mode submission metadata and file bytes.
        self.submissions: Dict[str, dict] = {}
        self.submission_files: Dict[str, bytes] = {}
        demo_submission = {
            "id": "sub-demo-bob-asg1-v1",
            "assignment_id": "asg-1",
            "student_id": "usr-student-bob",
            "file_name": "bob-distributed-systems.txt",
            "file_path": "demo/asg-1/usr-student-bob/v1-bob-distributed-systems.txt",
            "file_type": "text/plain",
            "file_size": 46,
            "submitted_at": _days_ago(0),
            "version": 1,
            "status": "SUBMITTED",
            "created_at": _days_ago(0),
        }
        self.submissions[demo_submission["id"]] = demo_submission
        self.submission_files[demo_submission["id"]] = b"Demo submission from Bob Smith for TaskForge."

    @property
    def is_supabase(self) -> bool:
        return self.mode == "supabase"

    def reset(self):
        if self.is_supabase:
            return
        self.__init__()

    def _remote(self, table: str, operation):
        try:
            return operation(self.client.table(table))
        except Exception as exc:
            raise RuntimeError(f"Supabase {table} operation failed: {exc}") from exc

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        if self.is_supabase:
            result = self._remote("users", lambda q: q.select("*").eq("id", user_id).limit(1).execute())
            return result.data[0] if result.data else None
        return self.users.get(user_id)

    def get_teacher_subject_ids(self, teacher_id: str) -> List[str]:
        if self.is_supabase:
            result = self._remote("teacher_subjects", lambda q: q.select("subject_id").eq("teacher_id", teacher_id).execute())
            return [row["subject_id"] for row in result.data or []]
        return self.teacher_subjects.get(teacher_id, [])

    def is_teacher_authorized_for_subject(self, teacher_id: str, subject_id: str) -> bool:
        return subject_id in self.get_teacher_subject_ids(teacher_id)

    def get_subjects(self) -> List[dict]:
        if self.is_supabase:
            result = self._remote("subjects", lambda q: q.select("*").order("code").execute())
            return result.data or []
        return list(self.subjects)

    def get_assignments(self, user_id: str, role: str) -> List[dict]:
        if self.is_supabase:
            result = self._remote("assignments", lambda q: q.select("*").order("due_date").execute())
            rows = [dict(row) for row in (result.data or [])]
            if role == "STUDENT":
                progress = self._remote(
                    "student_assignment_progress",
                    lambda q: q.select("*").eq("student_id", user_id).execute(),
                )
                by_assignment = {p["assignment_id"]: p for p in (progress.data or [])}
                for item in rows:
                    p = by_assignment.get(item["id"])
                    item["progress"] = {"status": p["status"] if p else "NOT_STARTED"}
            return rows

        results = []
        for assignment in self.assignments.values():
            item = dict(assignment)
            if role == "STUDENT":
                progress = self.progress.get(f"{user_id}:{assignment['id']}")
                item["progress"] = {"status": progress["status"] if progress else "NOT_STARTED"}
            results.append(item)
        return sorted(results, key=lambda a: a.get("due_date", ""))

    def get_assignment_by_id(self, assignment_id: str) -> Optional[dict]:
        if self.is_supabase:
            result = self._remote("assignments", lambda q: q.select("*").eq("id", assignment_id).limit(1).execute())
            return result.data[0] if result.data else None
        return self.assignments.get(assignment_id)

    def create_assignment(self, data: dict, created_by: str) -> dict:
        if self.is_supabase:
            result = self._remote("assignments", lambda q: q.insert({
                "subject_id": data["subject_id"],
                "created_by": created_by,
                "title": data["title"].strip(),
                "description": data.get("description", "").strip(),
                "due_date": data["due_date"],
                "priority": data.get("priority", "MEDIUM").upper(),
            }).execute())
            if not result.data:
                raise RuntimeError("Supabase did not return the created assignment")
            return result.data[0]

        assignment_id = f"asg-{int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)}"
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        record = {"id": assignment_id, "subject_id": data["subject_id"], "created_by": created_by, "title": data["title"].strip(), "description": data.get("description", "").strip(), "due_date": data["due_date"], "priority": data.get("priority", "MEDIUM").upper(), "created_at": now, "updated_at": now}
        self.assignments[assignment_id] = record
        return record

    def update_assignment(self, assignment_id: str, data: dict) -> Optional[dict]:
        if self.is_supabase:
            if not data:
                return self.get_assignment_by_id(assignment_id)
            data = dict(data)
            if "priority" in data and data["priority"]:
                data["priority"] = data["priority"].upper()
            result = self._remote("assignments", lambda q: q.update(data).eq("id", assignment_id).execute())
            return result.data[0] if result.data else None

        existing = self.assignments.get(assignment_id)
        if not existing:
            return None
        for key in ("title", "description", "due_date", "priority", "subject_id"):
            if key in data and data[key] is not None:
                value = data[key]
                existing[key] = value.strip() if isinstance(value, str) and key in ("title", "description") else (value.upper() if key == "priority" and isinstance(value, str) else value)
        existing["updated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        return existing

    def delete_assignment(self, assignment_id: str) -> bool:
        if self.is_supabase:
            result = self._remote("assignments", lambda q: q.delete().eq("id", assignment_id).execute())
            return bool(result.data)
        if assignment_id in self.assignments:
            del self.assignments[assignment_id]
            self.progress = {k: v for k, v in self.progress.items() if not k.endswith(f":{assignment_id}")}
            return True
        return False

    def update_student_progress(self, student_id: str, assignment_id: str, status: str) -> dict:
        if self.is_supabase:
            payload = {
                "student_id": student_id,
                "assignment_id": assignment_id,
                "status": status.upper(),
                "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            }
            result = self._remote(
                "student_assignment_progress",
                lambda q: q.upsert(payload, on_conflict="student_id,assignment_id").execute(),
            )
            if not result.data:
                raise RuntimeError("Supabase did not return updated progress")
            return result.data[0]

        key = f"{student_id}:{assignment_id}"
        record = {"student_id": student_id, "assignment_id": assignment_id, "status": status.upper(), "updated_at": dt.datetime.now(dt.timezone.utc).isoformat()}
        self.progress[key] = record
        return record

    def get_student_progress(self, student_id: str, assignment_id: str) -> Optional[dict]:
        if self.is_supabase:
            result = self._remote(
                "student_assignment_progress",
                lambda q: q.select("*").eq("student_id", student_id).eq("assignment_id", assignment_id).limit(1).execute(),
            )
            return result.data[0] if result.data else None
        return self.progress.get(f"{student_id}:{assignment_id}")

    def _parse_timestamp(self, value: str) -> dt.datetime:
        parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)

    def _submission_status(self, assignment_id: str, submitted_at: dt.datetime) -> str:
        assignment = self.get_assignment_by_id(assignment_id)
        if not assignment:
            return "SUBMITTED"
        due = self._parse_timestamp(assignment["due_date"])
        return "LATE" if submitted_at > due else "SUBMITTED"

    def get_students(self) -> List[dict]:
        if self.is_supabase:
            result = self._remote(
                "users",
                lambda q: q.select("id,name,email,role").eq("role", "STUDENT").order("name").execute(),
            )
            return result.data or []
        return [
            {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
            for user in self.users.values()
            if user.get("role") == "STUDENT"
        ]

    def create_submission(self, assignment_id: str, student_id: str, file_name: str, file_type: str, file_bytes: bytes) -> dict:
        submitted_at = dt.datetime.now(dt.timezone.utc)
        safe_name = os.path.basename(file_name).replace('"', "'")
        if self.is_supabase:
            latest = self._remote(
                "assignment_submissions",
                lambda q: q.select("version").eq("assignment_id", assignment_id).eq("student_id", student_id).order("version", desc=True).limit(1).execute(),
            )
            version = int(latest.data[0]["version"]) + 1 if latest.data else 1
            extension = os.path.splitext(safe_name)[1].lower()
            file_path = f"{assignment_id}/{student_id}/v{version}-{uuid.uuid4().hex}{extension}"
            try:
                self.client.storage.from_(SUBMISSION_BUCKET).upload(
                    file_path,
                    file_bytes,
                    {"content-type": file_type or "application/octet-stream", "upsert": "false"},
                )
            except Exception as exc:
                raise RuntimeError(f"Supabase Storage upload failed: {exc}") from exc
            payload = {
                "assignment_id": assignment_id,
                "student_id": student_id,
                "file_name": safe_name,
                "file_path": file_path,
                "file_type": file_type or "application/octet-stream",
                "file_size": len(file_bytes),
                "submitted_at": submitted_at.isoformat(),
                "version": version,
                "status": self._submission_status(assignment_id, submitted_at),
            }
            result = self._remote("assignment_submissions", lambda q: q.insert(payload).execute())
            if not result.data:
                raise RuntimeError("Supabase did not return the submitted file metadata")
            return result.data[0]

        submission_id = f"sub-{uuid.uuid4().hex}"
        version = 1 + max(
            [int(item.get("version", 0)) for item in self.submissions.values()
             if item["assignment_id"] == assignment_id and item["student_id"] == student_id],
            default=0,
        )
        extension = os.path.splitext(safe_name)[1].lower()
        file_path = f"demo/{assignment_id}/{student_id}/v{version}-{uuid.uuid4().hex}{extension}"
        record = {
            "id": submission_id,
            "assignment_id": assignment_id,
            "student_id": student_id,
            "file_name": safe_name,
            "file_path": file_path,
            "file_type": file_type or "application/octet-stream",
            "file_size": len(file_bytes),
            "submitted_at": submitted_at.isoformat(),
            "version": version,
            "status": self._submission_status(assignment_id, submitted_at),
            "created_at": submitted_at.isoformat(),
        }
        self.submissions[submission_id] = record
        self.submission_files[submission_id] = file_bytes
        return record

    def get_submission(self, submission_id: str) -> Optional[dict]:
        if self.is_supabase:
            result = self._remote("assignment_submissions", lambda q: q.select("*").eq("id", submission_id).limit(1).execute())
            return result.data[0] if result.data else None
        return self.submissions.get(submission_id)

    def get_student_submissions(self, student_id: str) -> List[dict]:
        if self.is_supabase:
            result = self._remote("assignment_submissions", lambda q: q.select("*").eq("student_id", student_id).order("submitted_at", desc=True).execute())
            rows = [dict(row) for row in (result.data or [])]
        else:
            rows = [dict(row) for row in self.submissions.values() if row["student_id"] == student_id]
        for row in rows:
            assignment = self.get_assignment_by_id(str(row["assignment_id"]))
            row["assignment_title"] = assignment["title"] if assignment else "Assignment"
            row["subject_id"] = assignment["subject_id"] if assignment else None
            row["due_date"] = assignment["due_date"] if assignment else None
        return sorted(rows, key=lambda row: row.get("submitted_at", ""), reverse=True)

    def get_assignment_submissions(self, assignment_id: str) -> List[dict]:
        if self.is_supabase:
            result = self._remote("assignment_submissions", lambda q: q.select("*").eq("assignment_id", assignment_id).order("version").execute())
            rows = [dict(row) for row in (result.data or [])]
        else:
            rows = [dict(row) for row in self.submissions.values() if row["assignment_id"] == assignment_id]
        users = {user["id"]: user for user in self.get_students()}
        for row in rows:
            student = users.get(row["student_id"])
            row["student_name"] = student["name"] if student else row["student_id"]
            row["student_email"] = student["email"] if student else ""
        return sorted(rows, key=lambda row: (row["student_id"], int(row.get("version", 0))), reverse=True)

    def get_submission_summary(self, assignment_id: str) -> dict:
        assignment = self.get_assignment_by_id(assignment_id)
        if not assignment:
            return {"assignment_id": assignment_id, "total_students": 0, "submitted": 0, "not_submitted": 0, "late": 0, "submission_rate": 0, "students": []}
        students = self.get_students()
        submissions = self.get_assignment_submissions(assignment_id)
        latest = {}
        for row in submissions:
            current = latest.get(row["student_id"])
            if current is None or int(row.get("version", 0)) > int(current.get("version", 0)):
                latest[row["student_id"]] = row
        student_rows = []
        submitted_count = 0
        late_count = 0
        for student in students:
            row = latest.get(student["id"])
            if row:
                submitted_count += 1
                if row["status"] == "LATE":
                    late_count += 1
                student_rows.append({
                    "student_id": student["id"],
                    "student_name": student["name"],
                    "student_email": student["email"],
                    "status": row["status"],
                    "submitted_at": row["submitted_at"],
                    "latest_submission": row,
                })
            else:
                student_rows.append({
                    "student_id": student["id"],
                    "student_name": student["name"],
                    "student_email": student["email"],
                    "status": "NOT_SUBMITTED",
                    "submitted_at": None,
                    "latest_submission": None,
                })
        total = len(students)
        return {
            "assignment_id": assignment_id,
            "total_students": total,
            "submitted": submitted_count,
            "not_submitted": total - submitted_count,
            "late": late_count,
            "submission_rate": round((submitted_count / total) * 100, 1) if total else 0,
            "students": student_rows,
        }

    def get_submission_file(self, submission_id: str) -> tuple[bytes, str, str]:
        submission = self.get_submission(submission_id)
        if not submission:
            raise KeyError("Submission not found")
        if self.is_supabase:
            try:
                content = self.client.storage.from_(SUBMISSION_BUCKET).download(submission["file_path"])
            except Exception as exc:
                raise RuntimeError(f"Supabase Storage download failed: {exc}") from exc
            return content, submission.get("file_type") or "application/octet-stream", submission["file_name"]
        content = self.submission_files.get(submission_id)
        if content is None:
            raise KeyError("Submission file content not found")
        return content, submission.get("file_type") or "application/octet-stream", submission["file_name"]

    def get_notices(self) -> List[dict]:
        if self.is_supabase:
            result = self._remote("notices", lambda q: q.select("*").order("published_at", desc=True).execute())
            return result.data or []
        return list(INITIAL_NOTICES)


db = Database()
