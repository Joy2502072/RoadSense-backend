import { pool } from "../config/db.js";

export async function createContact(req, res) {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Name, email, subject and message are required." });
    }

    await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    res.status(201).json({ message: "Thank you! Your message has been received." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not send your message." });
  }
}
