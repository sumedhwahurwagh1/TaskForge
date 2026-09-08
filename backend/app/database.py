"""
TaskForge In-Memory / Supabase Data Layer
Maintains strict separation between:
1. Teacher-owned assignments
2. Student personal progress
"""

import datetime
from typing import Dict, List, Optional

DEMO_USERS = {
    "usr-student-alex": {
        "id": "usr-student-alex",
        "name": "Alex Rivera",
        "email": "alex.rivera@student.edu",
        "role": "STUDENT",
    },
    "usr-student-bob": {
        "id": "usr-student-bob",
        "name": "Bob Smith",
        "email": "bob.smith@student.edu",
        "role": "STUDENT",
    },
    "usr-teacher-chen": {
        "id": "usr-teacher-chen",
        "name": "Dr. Sarah Chen",
        "email": "sarah.chen@university.edu",
        "role": "TEACHER",
        "department": "Computer Science",
    },
    "usr-teacher-vance": {
        "id": "usr-teacher-vance",
        "name": "Prof. Marcus Vance",
        "email": "marcus.vance@university.edu",
        "role": "TEACHER",
        "department": "Economics & Mathematics",
    },
}

TEACHER_SUBJECTS = {
    "usr-teacher-chen": ["cs301", "cs201"],
    "usr-teacher-vance": ["econ201", "math301"],
}

SUBJECTS = [
    {"id": "cs301", "code": "CS 301", "name": "Distributed Systems"},
    {"id": "cs201", "code": "CS 201", "name": "Algorithms & Data Structures"},
    {"id": "econ201", "code": "ECON 201", "name": "Macroeconomics"},
    {"id": "math301", "code": "MATH 301", "name": "Calculus III"},
    {"id": "psy101", "code": "PSY 101", "name": "Cognitive Psychology"},
]

INITIAL_ASSIGNMENTS = [
    {
        "id": "asg-1",
        "subject_id": "cs301",
        "created_by": "usr-teacher-chen",
        "title": "Distributed Systems Lab 2",
        "description": "Implement a basic leader election algorithm using the Bully algorithm.",
        "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat(),
        "priority": "HIGH",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "id": "asg-2",
        "subject_id": "econ201",
        "created_by": "usr-teacher-vance",
        "title": "Macroeconomics Problem Set 4",
        "description": "Solve problems on aggregate demand and supply curves.",
        "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        "priority": "HIGH",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "id": "asg-3",
        "subject_id": "cs201",
        "created_by": "usr-teacher-chen",
        "title": "Dynamic Programming Practice",
        "description": "Solve knapsack and longest common subsequence exercises.",
        "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=4)).isoformat(),
        "priority": "MEDIUM",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
]

INITIAL_STUDENT_PROGRESS = [
    {
        "student_id": "usr-student-alex",
        "assignment_id": "asg-1",
        "status": "IN_PROGRESS",
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "student_id": "usr-student-alex",
        "assignment_id": "asg-2",
        "status": "NOT_STARTED",
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "student_id": "usr-student-bob",
        "assignment_id": "asg-1",
        "status": "COMPLETED",
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
]


class Database:
    def __init__(self):
        self.users = dict(DEMO_USERS)
        self.teacher_subjects = {k: list(v) for k, v in TEACHER_SUBJECTS.items()}
        self.subjects = list(SUBJECTS)
        self.assignments: Dict[str, dict] = {a["id"]: dict(a) for a in INITIAL_ASSIGNMENTS}
        # progress keyed by (student_id, assignment_id)
        self.progress: Dict[str, dict] = {
            f"{p['student_id']}:{p['assignment_id']}": dict(p)
            for p in INITIAL_STUDENT_PROGRESS
        }

    def reset(self):
        """Reset state for tests."""
        self.__init__()

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return self.users.get(user_id)

    def is_teacher_authorized_for_subject(self, teacher_id: str, subject_id: str) -> bool:
        allowed = self.teacher_subjects.get(teacher_id, [])
        return subject_id in allowed

    def get_assignments(self, user_id: str, role: str) -> List[dict]:
        results = []
        for a in self.assignments.values():
            item = dict(a)
            if role == "STUDENT":
                # Attach this specific student's progress
                prog_key = f"{user_id}:{a['id']}"
                prog = self.progress.get(prog_key)
                item["progress"] = {"status": prog["status"] if prog else "NOT_STARTED"}
            results.append(item)
        return results

    def get_assignment_by_id(self, assignment_id: str) -> Optional[dict]:
        return self.assignments.get(assignment_id)

    def create_assignment(self, data: dict, created_by: str) -> dict:
        assignment_id = f"asg-{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record = {
            "id": assignment_id,
            "subject_id": data["subject_id"],
            "created_by": created_by,
            "title": data["title"].strip(),
            "description": data.get("description", "").strip(),
            "due_date": data["due_date"],
            "priority": data.get("priority", "MEDIUM"),
            "created_at": now,
            "updated_at": now,
        }
        self.assignments[assignment_id] = record
        return record

    def update_assignment(self, assignment_id: str, data: dict) -> Optional[dict]:
        existing = self.assignments.get(assignment_id)
        if not existing:
            return None
        
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if "title" in data and data["title"]:
            existing["title"] = data["title"].strip()
        if "description" in data:
            existing["description"] = data["description"].strip()
        if "due_date" in data and data["due_date"]:
            existing["due_date"] = data["due_date"]
        if "priority" in data and data["priority"]:
            existing["priority"] = data["priority"]
        if "subject_id" in data and data["subject_id"]:
            existing["subject_id"] = data["subject_id"]
        
        existing["updated_at"] = now
        return existing

    def delete_assignment(self, assignment_id: str) -> bool:
        if assignment_id in self.assignments:
            del self.assignments[assignment_id]
            # Cascade progress cleanup
            keys_to_del = [k for k in self.progress if k.endswith(f":{assignment_id}")]
            for k in keys_to_del:
                del self.progress[k]
            return True
        return False

    def update_student_progress(self, student_id: str, assignment_id: str, status: str) -> dict:
        key = f"{student_id}:{assignment_id}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record = {
            "student_id": student_id,
            "assignment_id": assignment_id,
            "status": status,
            "updated_at": now,
        }
        self.progress[key] = record
        return record

    def get_student_progress(self, student_id: str, assignment_id: str) -> Optional[dict]:
        return self.progress.get(f"{student_id}:{assignment_id}")


db = Database()
