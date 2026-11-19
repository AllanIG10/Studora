# Studora

A student-management app built with React, Vite, Express, and MongoDB.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in the project root using `.env.example` as a template. Set:

   - `MONGODB_URI` to your MongoDB connection string.
   - `JWT_SECRET` to a private random value of at least 32 characters.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the administrator account. Admin passwords must be at least 12 characters.

   Keep `.env` private and do not commit it. The API provisions the administrator from these settings when it starts.

3. Start the frontend and API:

   ```sh
   npm run dev
   ```

   Vite runs on its default development port and proxies `/api` requests to Express on port `5000`.

## Authentication

- Staff select **Staff** and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Students select **Student** and sign in with their student account.
- Students can register with their name, email, password, and an existing department.
- If an email matches an existing student record, the name and department must match that record.
- New student registrations remain pending and cannot sign in until an administrator approves them from **Pending Approvals**.
- Approval creates or links the student profile and activates the account. Rejected requests are removed and can be submitted again.
- Students have individual URLs for their profile, timetable, and results. Staff manage department-wide timetables and timetable pictures, plus student-specific exam results, from **Academic Records**.
- Staff can publish and manage college events and upload poster/invitation images from **College Events**. Students can see upcoming events and open their posters from **Next Event** in their portal.
- Existing student accounts without a status are migrated to active when the API starts.
- Admin management APIs require an administrator JWT. Tokens expire after 8 hours and are kept in the current browser session.
- Login, registration, and server errors are displayed in the page.

This project does not send email verification or password-reset messages. Add email verification before using public student registration in production.

## API

See the [API reference](./API.md) for full local URLs, CRUD methods, request bodies, authentication requirements, and response behavior. The Express API runs on `http://localhost:5000/api` by default.

## Other commands

- `npm run build` — production frontend build
- `npm run lint` — lint project code
- `npm run server` — run only the API server
