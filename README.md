# RoadSense Backend + MySQL Database

This backend is designed for the uploaded RoadSense React/Vite frontend.

## Stack

- Node.js + Express
- MySQL
- JWT authentication
- bcrypt password hashing
- Multer image upload (2 MB)
- CORS
- Demo phone OTP
- REST APIs

## 1. Requirements

Install:

- Node.js 18+
- MySQL 8+

## 2. Create the database

Open MySQL Workbench or MySQL CLI and run:

`database/schema.sql`

This creates the `roadsense` database, tables, demo users and sample reports.

Demo accounts:

- Citizen: `citizen@roadsense.demo` / `Password@123`
- Government: `admin@roadsense.demo`
- Employee ID: `PWD-2026-104`
- Government password: `Password@123`

## 3. Configure backend

Copy `.env.example` to `.env` and set your MySQL password.

Example:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=roadsense
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
DEMO_OTP_MODE=true
```

## 4. Install and run

```bash
npm install
npm run dev
```

API:

`http://localhost:5000`

Health check:

`GET http://localhost:5000/api/health`

## Main API endpoints

### Authentication

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/otp/send`
- `POST /api/auth/otp/verify`

### Reports

- `GET /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports` — citizen + JWT + multipart image
- `PATCH /api/reports/:id` — government + JWT
- `GET /api/reports/stats`

### Contact

- `POST /api/contact`

## Connecting the React frontend

The current frontend stores users and reports in `localStorage`. To make it a real full-stack application, replace those localStorage operations with API calls.

Recommended frontend base URL:

```js
const API_URL = "http://localhost:5000/api";
```

After login, save the returned JWT:

```js
localStorage.setItem("roadSenseToken", data.token);
localStorage.setItem("roadSenseRole", data.user.role);
localStorage.setItem("roadSenseProfile", JSON.stringify(data.user));
```

Authenticated requests should send:

```js
Authorization: `Bearer ${localStorage.getItem("roadSenseToken")}`
```

### Submit a report

Use `FormData` because the report can contain an image:

```js
const form = new FormData();
form.append("issueType", formData.issueType);
form.append("severity", formData.severity);
form.append("location", formData.location);
form.append("description", formData.description);
form.append("latitude", formData.latitude);
form.append("longitude", formData.longitude);
if (imageFile) form.append("image", imageFile);

await fetch(`${API_URL}/reports`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("roadSenseToken")}`
  },
  body: form
});
```

Do not manually set `Content-Type` for `FormData`; the browser adds the multipart boundary.

### Load reports

```js
const response = await fetch(`${API_URL}/reports`);
const data = await response.json();
```

### Load only the logged-in citizen's reports

```js
const response = await fetch(`${API_URL}/reports?mine=true`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("roadSenseToken")}`
  }
});
```

### Government update

```js
await fetch(`${API_URL}/reports/${reportId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("roadSenseToken")}`
  },
  body: JSON.stringify({
    status: "In Progress",
    assignedDepartment: "Municipal Road Maintenance Unit",
    assignedOfficer: "North Zone Repair Team",
    targetDate: "2026-09-20",
    publicUpdate: "Repair crew has started work."
  })
});
```

## Important

The demo OTP is returned by the API when `DEMO_OTP_MODE=true`. For a real deployment, connect `/api/auth/otp/send` to an SMS provider and set `DEMO_OTP_MODE=false`.

For production, also move uploaded images to object storage such as S3/Cloudinary, add stronger validation, HTTPS, proper secrets, audit logging and a real SMS provider.
