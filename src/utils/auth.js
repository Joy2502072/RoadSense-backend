import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email || null
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function publicUser(user) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    department: user.department,
    employeeId: user.employee_id,
    createdAt: user.created_at
  };
}
