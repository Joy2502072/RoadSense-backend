
# RoadSense API quick examples

## Signup

POST `/api/auth/signup`

```json
{
  "role": "citizen",
  "fullName": "Raj",
  "email": "raj@example.com",
  "phone": "9876543210",
  "city": "Bhubaneswar, Odisha",
  "password": "Password@123"
}
```

## Citizen login

POST `/api/auth/login`

```json
{
  "role": "citizen",
  "email": "raj@example.com",
  "password": "Password@123"
}
```

## Government login

POST `/api/auth/login`

```json
{
  "role": "admin",
  "email": "admin@example.gov",
  "employeeId": "PWD-2026-104",
  "password": "Password@123"
}
```

## Send OTP

POST `/api/auth/otp/send`

```json
{
  "phone": "9876543210"
}
```

## Verify OTP

POST `/api/auth/otp/verify`

```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

## Update report

PATCH `/api/reports/1`

Headers:

`Authorization: Bearer YOUR_JWT`

```json
{
  "status": "In Progress",
  "assignedDepartment": "Municipal Road Maintenance Unit",
  "assignedOfficer": "North Zone Repair Team",
  "targetDate": "2026-09-20",
  "publicUpdate": "Repair work has started."
}
```
