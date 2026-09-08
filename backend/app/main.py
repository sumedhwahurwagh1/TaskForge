"""
TaskForge FastAPI application.

The hackathon demo supports explicit demo bearer tokens so the security flows
can be exercised without external credentials. Production authentication should
use Supabase Auth JWTs, while the same route-level RBAC rules remain in place.
"""

from fastapi import FastAPI, Header, HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .core.config import settings
from .database import db
from .handlers import (
    HTTPException as DomainHTTPException,
    handle_get_me,
    handle_get_assignments,
    handle_get_assignment_by_id,
    handle_create_assignment,
    handle_update_assignment,
    handle_delete_assignment,
    handle_update_student_progress,
)


class AssignmentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1)
    subject_id: str = Field(min_length=1)
    description: str = ""
    due_date: str = Field(min_length=1)
    priority: str = "MEDIUM"


class AssignmentUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = Field(default=None, min_length=1)
    subject_id: str | None = None
    description: str | None = None
    due_date: str | None = None
    priority: str | None = None


class ProgressUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(min_length=1)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TaskForge assignment management API with Student/Teacher RBAC.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _domain_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except DomainHTTPException as exc:
        raise FastAPIHTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@app.get("/api/health")
def health():
    return {"status": "healthy", "version": settings.VERSION, "mode": db.mode}


@app.get("/api/auth/me")
def get_me(authorization: str | None = Header(default=None)):
    return _domain_call(handle_get_me, authorization)


@app.get("/api/subjects")
def get_subjects(authorization: str | None = Header(default=None)):
    _domain_call(handle_get_me, authorization)
    return db.get_subjects()


@app.get("/api/assignments")
def get_assignments(authorization: str | None = Header(default=None)):
    return _domain_call(handle_get_assignments, authorization)


@app.get("/api/assignments/{assignment_id}")
def get_assignment(
    assignment_id: str,
    authorization: str | None = Header(default=None),
):
    return _domain_call(handle_get_assignment_by_id, authorization, assignment_id)


@app.post("/api/assignments", status_code=201)
def create_assignment(
    payload: AssignmentCreateRequest,
    authorization: str | None = Header(default=None),
):
    return _domain_call(handle_create_assignment, authorization, payload.model_dump())


@app.patch("/api/assignments/{assignment_id}")
def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdateRequest,
    authorization: str | None = Header(default=None),
):
    return _domain_call(
        handle_update_assignment,
        authorization,
        assignment_id,
        payload.model_dump(exclude_none=True),
    )


@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    authorization: str | None = Header(default=None),
):
    return _domain_call(handle_delete_assignment, authorization, assignment_id)


@app.patch("/api/assignments/{assignment_id}/progress")
def update_progress(
    assignment_id: str,
    payload: ProgressUpdateRequest,
    authorization: str | None = Header(default=None),
):
    return _domain_call(
        handle_update_student_progress,
        authorization,
        assignment_id,
        payload.model_dump(),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=int(settings.PORT),
        reload=False,
    )
