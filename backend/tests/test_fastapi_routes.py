"""Smoke tests for the real FastAPI HTTP layer and RBAC boundary."""

from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


class TestFastAPIRoutes:
    def test_health(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_student_cannot_create_assignment_over_http(self):
        response = client.post(
            "/api/assignments",
            headers={"Authorization": "Bearer demo-token-student-alex"},
            json={
                "title": "Unauthorized",
                "subject_id": "cs301",
                "due_date": "2026-09-20T23:59:00Z",
                "priority": "HIGH",
            },
        )
        assert response.status_code == 403

    def test_student_cannot_update_assignment_over_http(self):
        response = client.patch(
            "/api/assignments/asg-1",
            headers={"Authorization": "Bearer demo-token-student-alex"},
            json={"title": "Hacked"},
        )
        assert response.status_code == 403

    def test_student_can_update_only_personal_progress(self):
        response = client.patch(
            "/api/assignments/asg-1/progress",
            headers={"Authorization": "Bearer demo-token-student-alex"},
            json={"status": "COMPLETED"},
        )
        assert response.status_code == 200
        assert response.json()["student_id"] == "usr-student-alex"

    def test_teacher_cannot_move_assignment_to_unauthorized_subject(self):
        response = client.patch(
            "/api/assignments/asg-1",
            headers={"Authorization": "Bearer demo-token-teacher-chen"},
            json={"subject_id": "econ201"},
        )
        assert response.status_code == 403

    def test_unauthenticated_assignment_access_is_rejected(self):
        response = client.get("/api/assignments")
        assert response.status_code == 401
