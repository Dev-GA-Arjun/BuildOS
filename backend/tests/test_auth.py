def test_register_login_and_me(client) -> None:
    register_payload = {
        "email": "user@example.com",
        "full_name": "Test User",
        "password": "strongpass123",
    }

    register_res = client.post("/api/v1/auth/register", json=register_payload)
    assert register_res.status_code == 201
    registered_user = register_res.json()
    assert registered_user["email"] == register_payload["email"]
    assert registered_user["full_name"] == register_payload["full_name"]

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert login_res.status_code == 200
    token_body = login_res.json()
    assert token_body["token_type"] == "bearer"
    assert isinstance(token_body["access_token"], str)
    assert token_body["access_token"]

    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_body['access_token']}"},
    )
    assert me_res.status_code == 200
    me_body = me_res.json()
    assert me_body["email"] == register_payload["email"]


def test_register_duplicate_email(client) -> None:
    payload = {
        "email": "duplicate@example.com",
        "full_name": "Duplicate User",
        "password": "strongpass123",
    }
    first_res = client.post("/api/v1/auth/register", json=payload)
    assert first_res.status_code == 201

    second_res = client.post("/api/v1/auth/register", json=payload)
    assert second_res.status_code == 409


def test_login_invalid_credentials(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "invalid@example.com", "full_name": "Invalid", "password": "strongpass123"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "invalid@example.com", "password": "wrongpass123"},
    )
    assert login_res.status_code == 401


def test_me_requires_auth(client) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
