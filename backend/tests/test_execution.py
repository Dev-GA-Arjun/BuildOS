from datetime import date, timedelta


def test_daily_checkin_create_and_update(client) -> None:
    today = date.today().isoformat()

    create_res = client.post("/api/v1/execution/daily-checkin", json={"execution_date": today, "completed": True})
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["execution_date"] == today
    assert created["completed"] is True

    update_res = client.post("/api/v1/execution/daily-checkin", json={"execution_date": today, "completed": False})
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["id"] == created["id"]
    assert updated["completed"] is False


def test_streak_current_and_best(client) -> None:
    days = [date.today() - timedelta(days=4), date.today() - timedelta(days=3), date.today() - timedelta(days=1), date.today()]
    for day in days:
        client.post("/api/v1/execution/daily-checkin", json={"execution_date": day.isoformat(), "completed": True})

    response = client.get("/api/v1/execution/streak")
    assert response.status_code == 200
    body = response.json()
    assert body["current_streak"] == 2
    assert body["best_streak"] == 2


def test_analytics_snapshot(client) -> None:
    today = date.today()
    payloads = [
        {"execution_date": (today - timedelta(days=1)).isoformat(), "completed": True},
        {"execution_date": today.isoformat(), "completed": True},
        {"execution_date": (today - timedelta(days=10)).isoformat(), "completed": False},
    ]
    for payload in payloads:
        client.post("/api/v1/execution/daily-checkin", json=payload)

    response = client.get("/api/v1/execution/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["total_checkins"] == 3
    assert body["executed_days_last_7"] == 2
    assert body["executed_days_last_30"] == 2
    assert body["completion_rate"] == 0.67
