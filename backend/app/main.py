from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()

# ---- Data Models ----

class TaskCreate(BaseModel):
    title: str
    completed: bool = False

class Task(TaskCreate):
    id: int

# ---- Fake Database ----

tasks: List[Task] = []
current_id = 1

# ---- Routes ----

@app.get("/")
def root():
    return {"message": "BuildOS backend running"}

@app.post("/tasks", response_model=Task)
def create_task(task: TaskCreate):
    global current_id
    new_task = Task(id=current_id, **task.dict())
    tasks.append(new_task)
    current_id += 1
    return new_task

@app.get("/tasks", response_model=List[Task])
def get_tasks():
    return tasks

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    for task in tasks:
        if task.id == task_id:
            tasks.remove(task)
            return {"message": "Task deleted"}
    raise HTTPException(status_code=404, detail="Task not found")