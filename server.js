const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "RoadSense Backend is running!"
    });
});


// ==========================================
// SIGNUP API
// ==========================================

app.post("/api/auth/signup", async (req, res) => {

    const {
        role,
        fullName,
        email,
        phone,
        city,
        department,
        employeeId,
        password
    } = req.body;


    // Required fields
    if (!role || !fullName || !city || !password) {

        return res.status(400).json({
            message: "Please fill all required fields"
        });

    }


    // Password validation
    if (password.length < 6) {

        return res.status(400).json({
            message:
                "Password must contain at least 6 characters"
        });

    }


    // Citizen validation
    if (
        role === "citizen" &&
        !email &&
        !phone
    ) {

        return res.status(400).json({
            message:
                "Citizens must provide at least one contact option: email or phone"
        });

    }


    // Government validation
    if (
        role === "admin" &&
        (!email || !department || !employeeId)
    ) {

        return res.status(400).json({
            message:
                "Government signup requires email, department and employee ID"
        });

    }


    // Check duplicate account
    const checkSql = `
        SELECT id
        FROM users
        WHERE
            (email IS NOT NULL AND email = ?)
            OR
            (phone IS NOT NULL AND phone = ?)
            OR
            (employee_id IS NOT NULL AND employee_id = ?)
        LIMIT 1
    `;


    db.query(
        checkSql,
        [
            email || null,
            phone || null,
            employeeId || null
        ],
        async (checkError, results) => {

            if (checkError) {

                console.error(
                    "Error checking existing user:",
                    checkError
                );

                return res.status(500).json({
                    message: "Database error"
                });

            }


            if (results.length > 0) {

                return res.status(409).json({
                    message:
                        "An account already exists with these details"
                });

            }


            try {

                // Hash password
                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );


                // Insert user
                const insertSql = `
                    INSERT INTO users
                    (
                        role,
                        full_name,
                        email,
                        phone,
                        city,
                        department,
                        employee_id,
                        password
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;


                db.query(
                    insertSql,
                    [
                        role,
                        fullName,
                        email || null,
                        phone || null,
                        city,
                        department || null,
                        employeeId || null,
                        hashedPassword
                    ],
                    (insertError, result) => {

                        if (insertError) {

                            console.error(
                                "Error creating user:",
                                insertError
                            );

                            return res.status(500).json({
                                message:
                                    "Failed to create account"
                            });

                        }


                        res.status(201).json({

                            message:
                                "Account created successfully",

                            userId:
                                result.insertId

                        });

                    }
                );


            } catch (hashError) {

                console.error(
                    "Password hashing error:",
                    hashError
                );

                return res.status(500).json({
                    message:
                        "Failed to secure password"
                });

            }

        }
    );

});


// ==========================================
// LOGIN API
// ==========================================

app.post("/api/auth/login", (req, res) => {

    const {
        role,
        email,
        employeeId,
        password
    } = req.body;


    // Basic validation
    if (
        !role ||
        !email ||
        !password
    ) {

        return res.status(400).json({
            message:
                "Please enter email and password"
        });

    }


    let sql = `
        SELECT *
        FROM users
        WHERE email = ?
        AND role = ?
    `;


    const values = [
        email.trim(),
        role
    ];


    // Government login
    if (role === "admin") {

        if (!employeeId) {

            return res.status(400).json({
                message:
                    "Employee ID is required"
            });

        }


        sql += `
            AND employee_id = ?
        `;


        values.push(
            employeeId.trim()
        );

    }


    sql += `
        LIMIT 1
    `;


    db.query(
        sql,
        values,
        async (err, results) => {

            if (err) {

                console.error(
                    "Login database error:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Database error"
                });

            }


            // User not found
            if (results.length === 0) {

                return res.status(401).json({
                    message:
                        "Invalid email, employee ID, or password"
                });

            }


            const user = results[0];


            try {

                // Compare entered password
                // with hashed password
                const passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );


                if (!passwordMatch) {

                    return res.status(401).json({
                        message:
                            "Invalid email, employee ID, or password"
                    });

                }


                // Never send password to frontend
                const {
                    password: storedPassword,
                    ...safeUserData
                } = user;


                res.json({

                    message:
                        "Login successful",

                    user:
                        safeUserData

                });


            } catch (passwordError) {

                console.error(
                    "Password verification error:",
                    passwordError
                );

                return res.status(500).json({
                    message:
                        "Unable to verify password"
                });

            }

        }
    );

});


// ==========================================
// REPORT SUBMISSION API
// ==========================================

app.post("/api/reports", (req, res) => {

    const {
        issueType,
        severity,
        location,
        description,
        latitude,
        longitude
    } = req.body;


    // Validation
    if (
        !issueType ||
        !severity ||
        !location ||
        !description
    ) {

        return res.status(400).json({
            message:
                "Please fill all required fields"
        });

    }


    const sql = `
        INSERT INTO reports
        (
            problem,
            severity,
            location,
            description,
            latitude,
            longitude
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;


    db.query(
        sql,
        [
            issueType,
            severity,
            location,
            description,
            latitude || null,
            longitude || null
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Error saving report:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to save report"
                });

            }


            res.status(201).json({

                message:
                    "Report submitted successfully",

                reportId:
                    result.insertId

            });

        }
    );

});


// ==========================================
// GET ALL REPORTS
// ==========================================

app.get("/api/reports", (req, res) => {

    const sql = `
        SELECT *
        FROM reports
        ORDER BY id DESC
    `;


    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.error(
                    "Error fetching reports:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to fetch reports"
                });

            }


            res.json(results);

        }
    );

});


// ==========================================
// GET SINGLE REPORT
// ==========================================

app.get("/api/reports/:id", (req, res) => {

    const reportId =
        req.params.id;


    const sql = `
        SELECT *
        FROM reports
        WHERE id = ?
    `;


    db.query(
        sql,
        [reportId],
        (err, results) => {

            if (err) {

                console.error(
                    "Error fetching report:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to fetch report"
                });

            }


            if (results.length === 0) {

                return res.status(404).json({
                    message:
                        "Report not found"
                });

            }


            res.json(
                results[0]
            );

        }
    );

});


// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {

        console.log(
            `RoadSense Backend running on http://localhost:${PORT}`
        );

    }
);