# AttendEase – Smart Attendance System

A production-ready MERN stack attendance management system for college departments.

## Features

- **Role-based access**: Admin, Teacher, HOD
- **Dashboard**: Live stats + Pie & Line charts
- **Student Management**: Full CRUD with search & filters
- **Subject Management**: Assign subjects to teachers
- **Attendance Marking**: Bulk mark with duplicate prevention
- **Reports**: Monthly reports with CSV export
- **Security**: JWT auth, bcrypt, protected routes

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React (Vite), TailwindCSS v4, Recharts, React Hook Form |
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| Auth | JWT + bcrypt |
| Logging | Winston + Morgan |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd backend
npm install
# Edit .env with your MONGO_URI and JWT_SECRET
node seed.js        # Creates admin user
npm run dev         # Starts on port 5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # Starts on port 3000
```

### 3. Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | Admin@123 |

## API Reference

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/login | Public |
| POST | /api/auth/register | Admin |
| GET | /api/auth/me | Private |
| GET | /api/auth/users | Admin/HOD |

### Students
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/students | Private |
| POST | /api/students | Admin |
| PUT | /api/students/:id | Admin |
| DELETE | /api/students/:id | Admin |

### Subjects
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/subjects | Private |
| POST | /api/subjects | Admin |
| PUT | /api/subjects/:id | Admin |
| DELETE | /api/subjects/:id | Admin |

### Attendance
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/attendance/mark | Teacher/Admin |
| GET | /api/attendance/dashboard | Private |
| GET | /api/attendance/date/:date | Private |
| GET | /api/attendance/student/:id | Private |
| GET | /api/attendance/report | Private |
| GET | /api/attendance/check | Private |

## Project Structure

```
SAS/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── seed.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

## Deployment

### Backend → Render / Railway
1. Set environment variables from `.env.example`
2. Set `MONGO_URI` to MongoDB Atlas connection string
3. Deploy with `npm start`

### Frontend → Vercel / Netlify
1. Set `VITE_API_URL` to your backend URL
2. Build: `npm run build`
3. Deploy the `dist/` folder

## Database Indexes

- `Attendance`: `{ date, subjectId }`, `{ studentId, subjectId, date }` (unique)
- `Student`: `{ department, year, section }`, `{ rollNumber }`
- `Subject`: `{ department, year }`, `{ teacherId }`
