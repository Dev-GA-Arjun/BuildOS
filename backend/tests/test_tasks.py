def test_create_and_get_task(client) -> None:
    payload = {
        "title": "Write first task",
        "description": "Add task endpoint",
    }
    create_res = client.post("/api/v1/tasks", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["title"] == payload["title"]
    assert created["description"] == payload["description"]
    assert created["status"] == "todo"

    task_id = created["id"]
    get_res = client.get(f"/api/v1/tasks/{task_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == task_id


def test_list_tasks_returns_created_items(client) -> None:
    client.post("/api/v1/tasks", json={"title": "Task A", "description": "One"})
    client.post("/api/v1/tasks", json={"title": "Task B", "description": "Two"})

    list_res = client.get("/api/v1/tasks")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 2
    assert items[0]["title"] == "Task A"
    assert items[1]["title"] == "Task B"


def test_update_task(client) -> None:
    create_res = client.post("/api/v1/tasks", json={"title": "Old title"})
    task_id = create_res.json()["id"]

    update_res = client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"title": "New title", "status": "in_progress"},
    )
    assert update_res.status_code == 200
    body = update_res.json()
    assert body["title"] == "New title"
    assert body["status"] == "in_progress"


def test_delete_task(client) -> None:
    create_res = client.post("/api/v1/tasks", json={"title": "Delete me"})
    task_id = create_res.json()["id"]

    delete_res = client.delete(f"/api/v1/tasks/{task_id}")
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/v1/tasks/{task_id}")
    assert get_res.status_code == 404
