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
