"""
Integration tests for authentication routes.
"""
import pytest


class TestRegister:
    def test_register_success(self, client, db):
        response = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "securepassword",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data

    def test_register_duplicate_email(self, client, regular_user):
        response = client.post("/api/auth/register", json={
            "email": "user@test.com",  # same as regular_user fixture
            "password": "anotherpassword",
        })
        assert response.status_code == 400

    def test_register_missing_fields(self, client):
        response = client.post("/api/auth/register", json={"email": "only@email.com"})
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client, regular_user):
        response = client.post("/api/auth/login", json={
            "email": "user@test.com",
            "password": "password123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, regular_user):
        response = client.post("/api/auth/login", json={
            "email": "user@test.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_unknown_email(self, client):
        response = client.post("/api/auth/login", json={
            "email": "ghost@nobody.com",
            "password": "somepassword",
        })
        assert response.status_code == 401


class TestGetMe:
    def test_get_me_authenticated(self, client, regular_user, user_token):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "user@test.com"
        assert data["role"] == "user"

    def test_get_me_unauthenticated(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer not.a.real.token"},
        )
        assert response.status_code == 401
