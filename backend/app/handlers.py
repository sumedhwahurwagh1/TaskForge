"""
TaskForge API Route Handlers
Enforces exact business rules, RBAC matrix, and status codes.
"""

from typing import Optional, Tuple
from .dependencies.auth import (
    HTTPException,
    authenticate_token,
    require_role,
    require_teacher_subject_access,
    require_student_ownership,
)
from .database import db

VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH"}
VALID_STATUSES = {"NOT_STARTED", "IN_PROGRESS", "COMPLETED"}
MAX_SUBMISSION_SIZE = 15 * 1024 * 1024


def handle_get_me(auth_header: Optional[str]) -> Tuple[int, dict]:
    """GET /api/auth/me"""
    user = authenticate_token(auth_header)
    return 200, user


def handle_get_assignments(auth_header: Optional[str]) -> Tuple[int, list]:
    """GET /api/assignments"""
    user = authenticate_token(auth_header)
    assignments = db.get_assignments(user["id"], user["role"])
    return 200, assignments


def handle_get_assignment_by_id(auth_header: Optional[str], assignment_id: str) -> Tuple[int, dict]:
    """GET /api/assignments/{id}"""
    user = authenticate_token(auth_header)
    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    res = dict(assignment)
    if user["role"] == "STUDENT":
        prog = db.get_student_progress(user["id"], assignment_id)
        res["progress"] = {"status": prog["status"] if prog else "NOT_STARTED"}
    return 200, res


def handle_create_assignment(auth_header: Optional[str], payload: dict) -> Tuple[int, dict]:
    """POST /api/assignments (Teacher only, authorized subject only)"""
    user = authenticate_token(auth_header)
    
    # 1. Role Authorization
    require_role(user, ["TEACHER"])

    # 2. Input Validation
    title = payload.get("title", "")
    if not title or not title.strip():
        raise HTTPException(status_code=422, detail="Title is required and cannot be empty.")

    subject_id = payload.get("subject_id")
    if not subject_id:
        raise HTTPException(status_code=422, detail="subject_id is required.")

    due_date = payload.get("due_date")
    if not due_date:
        raise HTTPException(status_code=422, detail="due_date is required.")

    priority = payload.get("priority", "MEDIUM").upper()
    if priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=422, detail=f"Priority must be one of {VALID_PRIORITIES}.")

    # 3. Subject Authorization
    require_teacher_subject_access(user, subject_id)

    # 4. Create assignment (created_by derived strictly from authenticated user!)
    created = db.create_assignment(
        data={
            "title": title,
            "subject_id": subject_id,
            "description": payload.get("description", ""),
            "due_date": due_date,
            "priority": priority,
        },
        created_by=user["id"]
    )
    return 201, created


def handle_update_assignment(auth_header: Optional[str], assignment_id: str, payload: dict) -> Tuple[int, dict]:
    """PATCH /api/assignments/{id} (Teacher only, authorized subject only)"""
    user = authenticate_token(auth_header)
    
    # 1. Role Authorization
    require_role(user, ["TEACHER"])

    # 2. Load Resource
    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    # 3. Subject Authorization on current assignment
    require_teacher_subject_access(user, assignment["subject_id"])

    # If updating subject, also verify access to new subject
    if "subject_id" in payload and payload["subject_id"]:
        require_teacher_subject_access(user, payload["subject_id"])

    # 4. Input validation if provided
    if "title" in payload and not payload["title"].strip():
        raise HTTPException(status_code=422, detail="Title cannot be empty.")

    if "priority" in payload and payload["priority"].upper() not in VALID_PRIORITIES:
        raise HTTPException(status_code=422, detail=f"Priority must be one of {VALID_PRIORITIES}.")

    # Clean payload to ensure teacher cannot inject student progress
    safe_payload = {
        k: v for k, v in payload.items()
        if k in ("title", "description", "due_date", "priority", "subject_id")
    }

    updated = db.update_assignment(assignment_id, safe_payload)
    return 200, updated


def handle_delete_assignment(auth_header: Optional[str], assignment_id: str) -> Tuple[int, dict]:
    """DELETE /api/assignments/{id} (Teacher only, authorized subject only)"""
    user = authenticate_token(auth_header)
    
    # 1. Role Authorization
    require_role(user, ["TEACHER"])

    # 2. Load Resource
    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    # 3. Subject Authorization
    require_teacher_subject_access(user, assignment["subject_id"])

    # 4. Delete
    db.delete_assignment(assignment_id)
    return 200, {"message": "Assignment deleted successfully."}


def handle_update_student_progress(auth_header: Optional[str], assignment_id: str, payload: dict) -> Tuple[int, dict]:
    """PATCH /api/assignments/{id}/progress (Student only, own progress only)"""
    user = authenticate_token(auth_header)
    
    # 1. Role Authorization
    require_role(user, ["STUDENT"])

    # 2. Resource check
    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    # 3. Student Ownership: derive student_id from auth and reject mismatch
    target_student_id = payload.get("student_id")
    require_student_ownership(user, target_student_id)

    # 4. Status validation
    status = payload.get("status")
    if not status or status.upper() not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Status must be one of {VALID_STATUSES}.")

    # 5. Update progress (Security: assignment metadata like title/due_date is completely untouched!)
    progress = db.update_student_progress(
        student_id=user["id"],
        assignment_id=assignment_id,
        status=status.upper(),
    )
    return 200, progress


def handle_create_submission(
    auth_header: Optional[str],
    assignment_id: str,
    file_name: str,
    file_type: str,
    file_bytes: bytes,
) -> Tuple[int, dict]:
    """POST /api/assignments/{id}/submissions (Student only)."""
    user = authenticate_token(auth_header)
    require_role(user, ["STUDENT"])

    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    safe_name = file_name.split("/")[-1].split("\\")[-1].replace('"', "'").strip()
    if not safe_name:
        raise HTTPException(status_code=422, detail="A file is required.")
    if not file_bytes:
        raise HTTPException(status_code=422, detail="The selected file is empty.")
    if len(file_bytes) > MAX_SUBMISSION_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 15 MB submission limit.")

    created = db.create_submission(
        assignment_id=assignment_id,
        student_id=user["id"],
        file_name=safe_name,
        file_type=file_type or "application/octet-stream",
        file_bytes=file_bytes,
    )
    return 201, created


def handle_get_my_assignment_submissions(
    auth_header: Optional[str],
    assignment_id: str,
) -> Tuple[int, list]:
    user = authenticate_token(auth_header)
    require_role(user, ["STUDENT"])
    if not db.get_assignment_by_id(assignment_id):
        raise HTTPException(status_code=404, detail="Assignment not found.")
    rows = [row for row in db.get_student_submissions(user["id"]) if row["assignment_id"] == assignment_id]
    return 200, rows


def handle_get_my_submissions(auth_header: Optional[str]) -> Tuple[int, list]:
    user = authenticate_token(auth_header)
    require_role(user, ["STUDENT"])
    return 200, db.get_student_submissions(user["id"])


def handle_get_teacher_assignment_submissions(
    auth_header: Optional[str],
    assignment_id: str,
) -> Tuple[int, list]:
    user = authenticate_token(auth_header)
    require_role(user, ["TEACHER"])
    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    require_teacher_subject_access(user, assignment["subject_id"])
    return 200, db.get_assignment_submissions(assignment_id)


def handle_get_teacher_submission_summary(
    auth_header: Optional[str],
    assignment_id: str,
) -> Tuple[int, dict]:
    user = authenticate_token(auth_header)
    require_role(user, ["TEACHER"])
    assignment = db.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    require_teacher_subject_access(user, assignment["subject_id"])
    return 200, db.get_submission_summary(assignment_id)


def handle_download_submission(
    auth_header: Optional[str],
    submission_id: str,
) -> tuple[bytes, str, str]:
    user = authenticate_token(auth_header)
    submission = db.get_submission(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    assignment = db.get_assignment_by_id(submission["assignment_id"])
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    if user["role"] == "STUDENT":
        if submission["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden: You can only access your own submissions.")
    elif user["role"] == "TEACHER":
        require_teacher_subject_access(user, assignment["subject_id"])
    else:
        raise HTTPException(status_code=403, detail="Forbidden.")

    try:
        return db.get_submission_file(submission_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
