"""
TaskForge Server-Side Authentication & RBAC Authorization Layer
Enforces security on EVERY API endpoint.
NEVER trusts frontend-supplied roles, user IDs, or query parameters.
"""

from typing import List, Optional
from ..database import db

class HTTPException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def authenticate_token(authorization_header: Optional[str]) -> dict:
    """
    Resolves the authenticated user from the Authorization header.
    Rejects missing or invalid tokens with HTTP 401 Unauthorized.
    """
    if not authorization_header or not authorization_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Missing or invalid Authorization header."
        )

    token = authorization_header[7:].strip()

    # Demo mode / JWT token resolution
    token_map = {
        "demo-token-student-alex": "usr-student-alex",
        "demo-token-student-bob": "usr-student-bob",
        "demo-token-teacher-chen": "usr-teacher-chen",
        "demo-token-teacher-vance": "usr-teacher-vance",
    }

    user_id = token_map.get(token)
    if not user_id:
        # Check if token follows pattern demo-token-<role>-<id>
        if token.startswith("demo-token-"):
            parts = token.split("-")
            potential_id = "-".join(parts[3:]) if len(parts) > 3 else parts[-1]
            if potential_id in db.users:
                user_id = potential_id

    if not user_id or user_id not in db.users:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or expired token."
        )

    user = db.users[user_id]
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "authorized_subject_ids": db.teacher_subjects.get(user["id"], []) if user["role"] == "TEACHER" else [],
    }


def require_role(user: dict, allowed_roles: List[str]) -> None:
    """
    Ensures authenticated user has one of the allowed roles.
    Raises HTTP 403 Forbidden if not permitted.
    """
    if user.get("role") not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Operation restricted to {', '.join(allowed_roles)}."
        )


def require_teacher_subject_access(user: dict, subject_id: str) -> None:
    """
    Verifies that a TEACHER is authorized to manage assignments for a given subject.
    Raises HTTP 403 Forbidden if the subject is not assigned to this teacher.
    """
    if user.get("role") != "TEACHER":
        raise HTTPException(status_code=403, detail="Forbidden: Teacher role required.")

    if not db.is_teacher_authorized_for_subject(user["id"], subject_id):
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: You are not authorized to manage subject '{subject_id}'."
        )


def require_student_ownership(user: dict, target_student_id: Optional[str]) -> None:
    """
    Verifies student is updating ONLY their own progress.
    Derives student_id from the authenticated user.
    """
    if user.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden: Only students can manage personal progress.")

    if target_student_id and target_student_id != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Cannot modify another student's progress."
        )
