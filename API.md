# Studora API Reference

## Base URLs

- Direct Express API: `http://localhost:5000/api`
- Vite development proxy: `http://localhost:5173/api`

The Vite URL forwards `/api` requests to Express. If Vite selects a different port, use the port printed by `npm run dev`. Request bodies use `Content-Type: application/json`, except event create/update requests with an image, which use `multipart/form-data`.

## Frontend Page URLs

The app also supports direct browser URLs for each page. The examples below use Vite's default development address:

| Page | URL |
|---|---|
| Login | `http://localhost:5173/login` |
| Staff dashboard | `http://localhost:5173/home` |
| Students | `http://localhost:5173/home/students` |
| Add student | `http://localhost:5173/home/add-student` |
| Departments | `http://localhost:5173/home/departments` |
| Academic records | `http://localhost:5173/home/academic-records` |
| College events | `http://localhost:5173/home/events` |
| Pending approvals | `http://localhost:5173/home/pending-approvals` |
| Reports | `http://localhost:5173/home/reports` |
| Settings | `http://localhost:5173/home/settings` |
| Student overview | `http://localhost:5173/student/home` |
| Student profile | `http://localhost:5173/student/profile` |
| Student timetable | `http://localhost:5173/student/timetable` |
| Student exam results | `http://localhost:5173/student/results` |
| Student upcoming events | `http://localhost:5173/student/events` |

Protected URLs redirect to the appropriate sign-in page when the visitor is not authenticated or does not have the required role. Direct URLs continue to work after a page refresh.

## Authentication

Use the token returned by login on protected endpoints:

```http
Authorization: Bearer <token>
```

Student registration is public, but student management, department, events, settings, and registration-review endpoints require an administrator token. Student portal and upcoming-event endpoints require a student token. Tokens expire after eight hours.

## Students

| Action | Method and URL | Access |
|---|---|---|
| List students | `GET http://localhost:5000/api/students` | Admin |
| Create student | `POST http://localhost:5000/api/students` | Admin |
| Update student | `PUT http://localhost:5000/api/students/:id` | Admin |
| Delete student | `DELETE http://localhost:5000/api/students/:id` | Admin |

Use the student's MongoDB ID in place of `:id`. Create and update requests use:

```json
{
  "name": "Avery Johnson",
  "email": "avery@example.com",
  "department": "Computer Science"
}
```

The list and mutation responses return student objects with `id`, `name`, `email`, and `department`. Delete returns `204 No Content`.

### Student exam results

Exam results are stored on each student and can be read or replaced independently:

| Action | Method and URL | Access |
|---|---|---|
| Read exam results | `GET http://localhost:5000/api/students/:id/academic-records` | Admin |
| Replace exam results | `PUT http://localhost:5000/api/students/:id/academic-records` | Admin |

The update body contains the `examResults` array. Send an empty array to clear the student's results. Each student can have up to 500 results.

```json
{
  "examResults": [
    {
      "academicYear": "2025-2026",
      "examName": "Midterm",
      "subject": "Mathematics",
      "marksObtained": 86,
      "maximumMarks": 100,
      "grade": "A"
    }
  ]
}
```

## Department timetables

The weekly timetable and its optional picture belong to a department and are shared with students in that department. Administrators can read and replace the department timetable:

| Action | Method and URL | Access |
|---|---|---|
| Read department timetable | `GET http://localhost:5000/api/departments/:id/academic-records` | Admin |
| Replace department timetable | `PUT http://localhost:5000/api/departments/:id/academic-records` | Admin |

Send a `timetable` array in the update body; an empty array clears the entries. Timetables allow up to 60 entries.

```json
{
  "timetable": [
    {
      "dayOfWeek": "Monday",
      "subject": "Mathematics",
      "startTime": "09:00",
      "endTime": "10:00",
      "room": "B-204",
      "instructor": "Dr. Morgan Lee"
    }
  ]
}
```

Administrators can upload or remove a timetable picture for a department:

| Action | Method and URL | Access |
|---|---|---|
| Upload/replace department timetable picture | `PUT http://localhost:5000/api/departments/:id/timetable-image` | Admin |
| Remove department timetable picture | `DELETE http://localhost:5000/api/departments/:id/timetable-image` | Admin |

Upload the file as `multipart/form-data` using the `timetableImage` field. JPEG, PNG, and WebP files up to 2 MB are accepted. The student portal endpoint includes that student's department timetable and image as a data URL.

## Departments

| Action | Method and URL | Access |
|---|---|---|
| List departments and student counts | `GET http://localhost:5000/api/departments` | Admin |
| Create department | `POST http://localhost:5000/api/departments` | Admin |

Create request:

```json
{
  "name": "Computer Science",
  "head": "Dr. Morgan Lee"
}
```

The list response includes each department's `id`, `name`, `head`, and `students` count. The current backend does not implement department update or delete routes.

## College Events

Administrators can create, edit, list, and delete college events. Students can see events that are currently in progress or scheduled for the future; events are ordered by start time.

| Action | Method and URL | Access |
|---|---|---|
| List all events | `GET http://localhost:5000/api/events` | Admin |
| Create event | `POST http://localhost:5000/api/events` | Admin |
| Update event | `PUT http://localhost:5000/api/events/:id` | Admin |
| Delete event | `DELETE http://localhost:5000/api/events/:id` | Admin |
| Read event poster | `GET http://localhost:5000/api/events/:id/poster` | Admin |
| Remove event poster | `DELETE http://localhost:5000/api/events/:id/poster` | Admin |
| List upcoming events | `GET http://localhost:5000/api/student/events` | Student |
| Read upcoming event poster | `GET http://localhost:5000/api/student/events/:id/poster` | Student |

Create and update requests accept the event fields below. The dates use ISO 8601 values:

```json
{
  "title": "Annual Science Fair",
  "description": "Student projects and demonstrations.",
  "location": "Main Hall",
  "startsAt": "2026-12-10T09:00:00.000Z",
  "endsAt": "2026-12-10T15:00:00.000Z"
}
```

Event title, start, and end are required. The end must be after the start. Description and location are optional.
To upload or replace a poster/invitation, send the fields and a file named `eventPoster` as `multipart/form-data`. JPEG, PNG, and WebP images up to 2 MB are accepted. Event lists return poster metadata without the image data; use the poster endpoints to load an image. The event poster is stored with its event in MongoDB.

## Settings

Settings are a singleton resource; the current API supports read and update, not delete.

| Action | Method and URL | Access |
|---|---|---|
| Read settings | `GET http://localhost:5000/api/settings` | Admin |
| Update settings | `PUT http://localhost:5000/api/settings` | Admin |

Update request:

```json
{
  "institution": "Studora",
  "emailNotifications": true,
  "weeklyReports": false,
  "studentServices": {
    "campusMapLocation": "Adithya Institute of Technology, Coimbatore",
    "attendance": [
      {
        "date": "2026-11-19",
        "subject": "Computer Science",
        "presentCount": 28,
        "totalCount": 30
      }
    ],
    "campusMap": [
      {
        "name": "Library",
        "description": "Main library building"
      }
    ],
    "fees": [
      {
        "title": "Semester fee",
        "amount": 25000,
        "dueDate": "2026-12-01",
        "details": "Semester tuition and campus fees"
      }
    ],
    "homework": [],
    "transport": []
  }
}
```

`studentServices` is shared with all students. Each list accepts up to 200 entries. Attendance counts must be non-negative integers, with present count no greater than total. `campusMapLocation` is shown as a Google Maps embed; campus map entries are displayed as location descriptions below it.

## Reports

There is no standalone reports endpoint. The Reports page is calculated from `GET /api/students` and `GET /api/departments`.

## Authentication and Registration

| Action | Method and URL | Access |
|---|---|---|
| Check API/database health | `GET http://localhost:5000/api/health` | Public |
| Get available registration departments | `GET http://localhost:5000/api/auth/registration-options` | Public |
| Submit student registration | `POST http://localhost:5000/api/auth/register` | Public |
| Log in | `POST http://localhost:5000/api/auth/login` | Public |
| Get current account | `GET http://localhost:5000/api/auth/me` | Signed-in user |
| Get own student portal profile, timetable, results, and shared student service content | `GET http://localhost:5000/api/student/portal` | Student |
| Update own name, email, or department | `PUT http://localhost:5000/api/student/profile` | Student |
| Get upcoming college events | `GET http://localhost:5000/api/student/events` | Student |

Registration request:

```json
{
  "name": "Avery Johnson",
  "email": "avery@example.com",
  "password": "choose-a-password",
  "department": "Computer Science"
}
```

Registration returns `202 Accepted` and a message that the request is pending. It does not issue a token. The student can log in after an administrator approves the request.

Students can update their own name, email, and department through `PUT /api/student/profile`:

```json
{
  "name": "Avery Johnson",
  "email": "avery@example.com",
  "department": "Computer Science"
}
```

Each successful save that changes at least one field counts as one profile edit. Students may make up to two edits during each six-calendar-month semester, for eight semesters (a maximum of 16 edits). No-op saves and rejected updates do not count. The portal response includes `profileEditing` with the current semester, remaining semester allowance, and remaining overall allowance. The eight-semester period starts on account approval; existing profiles without an approval date begin at the first server startup after this feature is deployed.

Login request:

```json
{
  "email": "avery@example.com",
  "password": "choose-a-password",
  "role": "student"
}
```

Set `role` to `student` or `admin`. A successful login returns `{ "token": "...", "user": { ... } }`.

## Registration Approval

| Action | Method and URL | Access |
|---|---|---|
| List pending registrations | `GET http://localhost:5000/api/registrations/pending` | Admin |
| Approve registration | `POST http://localhost:5000/api/registrations/:id/approve` | Admin |
| Reject registration | `DELETE http://localhost:5000/api/registrations/:id` | Admin |

Use the pending registration's ID in place of `:id`. Approval returns the created or linked student profile and activates the account. Rejection returns `204 No Content`.

## Error Responses

API errors use a JSON message, for example:

```json
{
  "message": "A student with this email already exists."
}
```

Common status codes are `400` for invalid input, `401` for missing or expired authentication, `403` for insufficient permissions or pending approval, `404` for a missing resource, and `409` for duplicate or conflicting data.
