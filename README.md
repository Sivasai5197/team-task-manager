# Team Task Manager

Full-stack team task manager for creating projects, assigning tasks, and tracking progress with Admin/Member access control.

## Features

- JWT authentication with signup and login.
- Seeded demo accounts for Admin and Member review.
- Admin-only project creation/deletion.
- Admin-only task creation, assignment, and deletion.
- Member dashboard scoped to assigned tasks.
- Members can update only the status of their assigned tasks.
- Dashboard stats for total, pending, in-progress, completed, and overdue tasks.
- Team overview for admins with task totals and overdue counts.
- REST API with Prisma relationships and server-side validation.

## Tech Stack

- React 19 + Vite
- Node.js + Express
- Prisma ORM
- SQLite database
- JWT + bcryptjs authentication

## Demo Accounts

```text
Admin:  admin@demo.com  / admin123
Member: member@demo.com / member123
```

New signups are created as Members. Use the seeded Admin account to create projects and assign tasks.

## Local Development

```bash
npm install
copy .env.example .env
npm run dev
```

The `dev` script pushes the Prisma schema, seeds demo users, starts Express on `http://localhost:3001`, and starts Vite on `http://localhost:5173`.

## Production Build

```bash
npm run build
npm start
```

`npm start` runs `prisma db push`, seeds the demo users, and serves both the API and built React app from one Express service.

## API Summary

- `POST /api/auth/signup` - create a Member account.
- `POST /api/auth/login` - login and receive a JWT.
- `GET /api/projects` - list projects.
- `POST /api/projects` - create a project, Admin only.
- `DELETE /api/projects/:id` - delete a project, Admin only.
- `GET /api/tasks` - Admins see all tasks; Members see assigned tasks.
- `POST /api/tasks` - create and assign a task, Admin only.
- `PUT /api/tasks/:id` - Admins can update task fields; Members can update status only for their assigned tasks.
- `DELETE /api/tasks/:id` - delete a task, Admin only.
- `GET /api/users` - Admins see the team; Members see their own profile.

## Railway Deployment

1. Push this project to GitHub.
2. Create a Railway project and connect the GitHub repository.
3. Railway will use `railway.json`:
   - Build command: `npm run build`
   - Start command: `npm start`
4. Add a persistent volume so SQLite data survives restarts.
   - Mount path: `/app/prisma`
5. Add environment variables:
   - `JWT_SECRET=your-long-random-secret`
   - `DATABASE_URL=file:./dev.db`
6. Deploy and use the Railway service URL as the live submission URL.

## Submission Checklist

- Live Railway URL
- GitHub repository URL
- This README
- 2-5 minute demo video covering:
  - Login as Admin
  - Create a project
  - Create and assign a task
  - Login as Member
  - Update assigned task status
  - Show dashboard and overdue tracking
