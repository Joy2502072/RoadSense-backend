import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { publicUser, signToken } from "../utils/auth.js";

const otpStore = new Map();

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export async function signup(req, res) {
  try {
    const {
      role = "citizen",
      fullName,
      email = "",
      phone = "",
      city,
      password,
      department = "",
      employeeId = ""
    } = req.body;

    if (!fullName?.trim() || !city?.trim() || !password) {
      return res.status(400).json({ message: "Full name, city and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }
    if (!["citizen", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid account role." });
    }
    if (role === "citizen" && !email.trim() && !phone.trim()) {
      return res.status(400).json({ message: "Citizens must provide email or phone." });
    }
    if (role === "admin" && (!email.trim() || !department.trim() || !employeeId.trim())) {
      return res.status(400).json({ message: "Government signup requires email, department and employee ID." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmployeeId = employeeId.trim().toLowerCase();

    const [existing] = await pool.query(
      `SELECT id FROM users
       WHERE (email IS NOT NULL AND email <> '' AND email = ?)
          OR (phone IS NOT NULL AND phone <> '' AND phone = ?)
          OR (employee_id IS NOT NULL AND employee_id <> '' AND LOWER(employee_id) = ?)
       LIMIT 1`,
      [normalizedEmail, normalizedPhone, normalizedEmployeeId]
    );

    if (existing.length) {
      return res.status(409).json({ message: "An account already exists with these details." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users
       (role, full_name, email, phone, city, password_hash, department, employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role,
        fullName.trim(),
        normalizedEmail || null,
        normalizedPhone || null,
        city.trim(),
        passwordHash,
        department.trim() || null,
        employeeId.trim() || null
      ]
    );

    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    res.status(201).json({
      message: "Account created successfully.",
      user: publicUser(rows[0])
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not create account." });
  }
}

export async function login(req, res) {
  try {
    const {
      role = "citizen",
      email = "",
      password = "",
      employeeId = ""
    } = req.body;

    if (!password || !email.trim()) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    let sql = `SELECT * FROM users WHERE LOWER(email) = ? AND role = ?`;
    const params = [email.trim().toLowerCase(), role];

    if (role === "admin") {
      sql += " AND LOWER(employee_id) = ?";
      params.push(employeeId.trim().toLowerCase());
    }
    sql += " LIMIT 1";

    const [rows] = await pool.query(sql, params);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: "Invalid login credentials." });
    }

    const token = signToken(rows[0]);
    res.json({ message: "Login successful.", token, user: publicUser(rows[0]) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed." });
  }
}

export async function sendOtp(req, res) {
  try {
    const phone = normalizePhone(req.body.phone);
    if (phone.length < 8) return res.status(400).json({ message: "Please enter a valid phone number." });

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE role = 'citizen' AND phone = ? LIMIT 1",
      [phone]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "No citizen account is registered with this phone number." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    const response = {
      message: `OTP sent successfully to your mobile number ending in ${phone.slice(-4)}.`
    };

    if (String(process.env.DEMO_OTP_MODE).toLowerCase() !== "false") {
      response.demoOtp = otp;
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OTP could not be sent." });
  }
}

export async function verifyOtp(req, res) {
  try {
    const phone = normalizePhone(req.body.phone);
    const otp = String(req.body.otp || "").trim();
    const saved = otpStore.get(phone);

    if (!saved || saved.expiresAt < Date.now() || saved.otp !== otp) {
      return res.status(401).json({ message: "Incorrect or expired OTP." });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE role = 'citizen' AND phone = ? LIMIT 1",
      [phone]
    );
    if (!rows.length) return res.status(404).json({ message: "Citizen account not found." });

    otpStore.delete(phone);
    const token = signToken(rows[0]);
    res.json({ message: "OTP verified.", token, user: publicUser(rows[0]) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OTP verification failed." });
  }
}
