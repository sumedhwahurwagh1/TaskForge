"""
TaskForge FastAPI Application Entrypoint
Full-Stack RBAC Assignment Management API
"""

import json
from .core.config import settings
from .handlers import (
    HTTPException,
    handle_get_me,
    handle_get_assignments,
    handle_get_assignment_by_id,
    handle_create_assignment,
    handle_update_assignment,
    handle_delete_assignment,
    handle_update_student_progress,
)

# Standard library fallback server for zero-dependency local execution
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class TaskForgeRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        auth_header = self.headers.get("Authorization")

        try:
            if path == "/api/auth/me":
                code, data = handle_get_me(auth_header)
            elif path == "/api/assignments":
                code, data = handle_get_assignments(auth_header)
            elif path.startswith("/api/assignments/") and not path.endswith("/progress"):
                asg_id = path.split("/")[-1]
                code, data = handle_get_assignment_by_id(auth_header, asg_id)
            elif path == "/api/health":
                code, data = 200, {"status": "healthy", "version": settings.VERSION}
            else:
                code, data = 404, {"detail": "Route not found"}
        except HTTPException as e:
            code, data = e.status_code, {"detail": e.detail}
        except Exception as e:
            code, data = 500, {"detail": f"Internal server error: {str(e)}"}

        self._send_json(code, data)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        auth_header = self.headers.get("Authorization")
        payload = self._read_json()

        try:
            if path == "/api/assignments":
                code, data = handle_create_assignment(auth_header, payload)
            else:
                code, data = 404, {"detail": "Route not found"}
        except HTTPException as e:
            code, data = e.status_code, {"detail": e.detail}
        except Exception as e:
            code, data = 500, {"detail": f"Internal server error: {str(e)}"}

        self._send_json(code, data)

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        auth_header = self.headers.get("Authorization")
        payload = self._read_json()

        try:
            parts = path.strip("/").split("/")
            # /api/assignments/{id}/progress
            if len(parts) == 4 and parts[0] == "api" and parts[1] == "assignments" and parts[3] == "progress":
                asg_id = parts[2]
                code, data = handle_update_student_progress(auth_header, asg_id, payload)
            # /api/assignments/{id}
            elif len(parts) == 3 and parts[0] == "api" and parts[1] == "assignments":
                asg_id = parts[2]
                code, data = handle_update_assignment(auth_header, asg_id, payload)
            else:
                code, data = 404, {"detail": "Route not found"}
        except HTTPException as e:
            code, data = e.status_code, {"detail": e.detail}
        except Exception as e:
            code, data = 500, {"detail": f"Internal server error: {str(e)}"}

        self._send_json(code, data)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        auth_header = self.headers.get("Authorization")

        try:
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[0] == "api" and parts[1] == "assignments":
                asg_id = parts[2]
                code, data = handle_delete_assignment(auth_header, asg_id)
            else:
                code, data = 404, {"detail": "Route not found"}
        except HTTPException as e:
            code, data = e.status_code, {"detail": e.detail}
        except Exception as e:
            code, data = 500, {"detail": f"Internal server error: {str(e)}"}

        self._send_json(code, data)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        body = self.rfile.read(length)
        return json.loads(body.decode("utf-8"))

    def _send_json(self, status_code: int, data: any):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))


def run_server(port=8000):
    server = HTTPServer(("0.0.0.0", port), TaskForgeRequestHandler)
    print(f"TaskForge Backend running at http://0.0.0.0:{port}")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
