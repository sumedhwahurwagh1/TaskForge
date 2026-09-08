"""
TaskForge server-side authentication.

For the hackathon, explicit demo tokens are supported. When a real Supabase
access token is supplied and Supabase is configured, the token is validated
against Supabase Auth before the application role is loaded from public.users.

Never trust a client-provided role as an authority.
"""

from typing import List, Optional

from ..database import db


class HTTPException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


DEMO_TOKEN_MAP = {
    "demo-token-student-alex": "usr-student-alex",
    "demo-token-student-bob": "usr-student-bob",
    "demo-token-teacher-chen": "usr-teacher-chen",
    "demo-token-teacher-vance": "usr-teacher-vance",
}


def authenticate_token(authorization_header: Optional[str]) -> dict:
    if not authorization_header or not authorization_header.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized: Missing or invalid Authorization header.")

    token = authorization_header[7:].strip()

    # Explicit hackathon demo identities.
    if token in DEMO_TOKEN_MAP:
        user_id = DEMO_TOKEN_MAP[token]
        user = db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(401, "Unauthorized: Demo user is not provisioned in the active database.")
        return _decorate_user(user)

    # Real Supabase Auth token.
    if db.is_supabase:
        try:
            response = db.client.auth.get_user(token)
            auth_user = getattr(response, "user", None)
            if auth_user is None:
                raise HTTPException(401, "Unauthorized: Invalid or expired Supabase access token.")

            user = db.get_user_by_id(auth_user.id)
            if not user:
                raise HTTPException(403, "Authenticated user has no TaskForge profile.")
            return _decorate_user(user)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(401, f"Unauthorized: Supabase token validation failed: {exc}") from exc

    raise HTTPException(401, "Unauthorized: Invalid or expired token.")


def _decorate_user(user: dict) -> dict:
    role = user.get("role")
    authorized_subject_ids = (
        db.get_teacher_subject_ids(user["id"]) if role == "TEACHER" else []
    )
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": role,
        "authorized_subject_ids": authorized_subject_ids,
        **({"department": user["department"]} if user.get("department") else {}),
    }


def require_role(user: dict, allowed_roles: List[str]) -> None:
    if user.get("role") not in allowed_roles:
        raise HTTPException(403, f"Forbidden: Operation restricted to {', '.join(allowed_roles)}.")


def require_teacher_subject_access(user: dict, subject_id: str) -> None:
    if user.get("role") != "TEACHER":
        raise HTTPException(403, "Forbidden: Teacher role required.")
    if not db.is_teacher_authorized_for_subject(user["id"], subject_id):
        raise HTTPException(403, f"Forbidden: You are not authorized to manage subject '{subject_id}'.")


def require_student_ownership(user: dict, target_student_id: Optional[str]) -> None:
    if user.get("role") != "STUDENT":
        raise HTTPException(403, "Forbidden: Only students can manage personal progress.")
    if target_student_id and target_student_id != user["id"]:
        raise HTTPException(403, "Forbidden: Cannot modify another student's progress.")
