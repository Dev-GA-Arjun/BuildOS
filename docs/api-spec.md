# BuildOS API Specification (v1)

## API Conventions
- Base URL: `/api/v1`
- Data format: JSON
- Auth: Bearer JWT (for protected endpoints)
- Timestamp standard: ISO-8601 (UTC)

## Health
### GET `/health`
Returns API health status.

**Response 200**
```json
{
  "status": "ok",
  "service": "buildos-api",
  "version": "0.1.0"
}
```

## Authentication
### POST `/auth/register`
Register a new user.

### POST `/auth/login`
Issue access token.

### GET `/auth/me`
Return current authenticated user.

## Goals
### POST `/goals`
Create a goal.

### GET `/goals`
List current user goals.

### GET `/goals/{goal_id}`
Get goal details.

### PATCH `/goals/{goal_id}`
Update goal.

### DELETE `/goals/{goal_id}`
Delete goal.

## Systems
### POST `/systems`
Create a system/plan under a goal.

### GET `/systems?goal_id={goal_id}`
List systems for a goal.

### PATCH `/systems/{system_id}`
Update system.

### DELETE `/systems/{system_id}`
Delete system.

## Tasks
### POST `/tasks`
Create task.

### GET `/tasks?goal_id=&system_id=&status=`
List tasks by filters.

### GET `/tasks/{task_id}`
Get task details.

### PATCH `/tasks/{task_id}`
Update task.

### DELETE `/tasks/{task_id}`
Delete task.

## Execution
### POST `/execution/daily-checkin`
Create/update daily execution check-in.

### GET `/execution/streak`
Get current and best streak.

### GET `/execution/analytics`
Get summary metrics:
- completion rate
- executed days (last 7/30)
- goal progress snapshot

## Error Envelope
```json
{
  "detail": "Human-readable error message"
}
```
