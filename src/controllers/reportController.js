import { pool } from "../config/db.js";
import { mapReport } from "../utils/reportMapper.js";

async function getTimeline(reportId) {
  const [events] = await pool.query(
    `SELECT status, note, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS time
     FROM report_timeline WHERE report_id = ? ORDER BY id ASC`,
    [reportId]
  );
  return events;
}

async function getReportRow(id) {
  const [rows] = await pool.query(
    `SELECT r.*, u.full_name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone
     FROM reports r
     LEFT JOIN users u ON u.id = r.reporter_id
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

export async function listReports(req, res) {
  try {
    const { status, severity, mine } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== "All") {
      conditions.push("r.status = ?");
      params.push(status);
    }
    if (severity && severity !== "All") {
      conditions.push("r.severity = ?");
      params.push(severity);
    }
    if (mine === "true") {
      if (!req.user) return res.status(401).json({ message: "Login required." });
      conditions.push("r.reporter_id = ?");
      params.push(req.user.id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name AS reporter_name, u.email AS reporter_email, u.phone AS reporter_phone
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );

    const reports = await Promise.all(
      rows.map(async (row) => mapReport(row, await getTimeline(row.id)))
    );
    res.json({ reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load reports." });
  }
}

export async function getReport(req, res) {
  try {
    const row = await getReportRow(req.params.id);
    if (!row) return res.status(404).json({ message: "Report not found." });

    const report = mapReport(row, await getTimeline(row.id));
    res.json({ report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load report." });
  }
}

export async function createReport(req, res) {
  try {
    const { issueType, severity, location, description, latitude, longitude } = req.body;

    if (!location?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Location and description are required." });
    }

    const lat = latitude && latitude !== "Not captured" ? Number(latitude) : null;
    const lng = longitude && longitude !== "Not captured" ? Number(longitude) : null;

    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      return res.status(400).json({ message: "Invalid latitude." });
    }
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      return res.status(400).json({ message: "Invalid longitude." });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO reports
       (reporter_id, issue_type, severity, location, description, latitude, longitude, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        req.user.id,
        issueType || "Pothole",
        severity || "Medium",
        location.trim(),
        description.trim(),
        lat,
        lng,
        imageUrl
      ]
    );

    await pool.query(
      `INSERT INTO report_timeline (report_id, status, note) VALUES (?, 'Submitted', ?)`,
      [result.insertId, "Citizen report received by RoadSense."]
    );

    const row = await getReportRow(result.insertId);
    res.status(201).json({
      message: "Road issue report submitted successfully.",
      report: mapReport(row, await getTimeline(result.insertId))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "The report could not be saved." });
  }
}

export async function updateReport(req, res) {
  try {
    const id = Number(req.params.id);
    const current = await getReportRow(id);
    if (!current) return res.status(404).json({ message: "Report not found." });

    const {
      status,
      assignedDepartment,
      assignedOfficer,
      targetDate,
      publicUpdate,
      internalNote
    } = req.body;

    const allowedStatuses = ["Submitted", "In Review", "In Progress", "Resolved", "Rejected"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid report status." });
    }

    const nextStatus = status || current.status;

    await pool.query(
      `UPDATE reports
       SET status = ?,
           assigned_department = ?,
           assigned_officer = ?,
           target_date = ?,
           internal_note = ?
       WHERE id = ?`,
      [
        nextStatus,
        assignedDepartment ?? current.assigned_department ?? null,
        assignedOfficer ?? current.assigned_officer ?? null,
        targetDate || null,
        internalNote ?? current.internal_note ?? null,
        id
      ]
    );

    if (status && status !== current.status) {
      await pool.query(
        `INSERT INTO report_timeline (report_id, status, note, created_by)
         VALUES (?, ?, ?, ?)`,
        [id, status, "Status updated by a government official.", req.user.id]
      );
    }

    if (publicUpdate?.trim()) {
      await pool.query(
        `INSERT INTO report_timeline (report_id, status, note, created_by)
         VALUES (?, ?, ?, ?)`,
        [id, nextStatus, publicUpdate.trim(), req.user.id]
      );
    }

    const row = await getReportRow(id);
    res.json({
      message: "Report updated successfully.",
      report: mapReport(row, await getTimeline(id))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update report." });
  }
}

export async function dashboardStats(_req, res) {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Resolved') AS resolved,
        SUM(status = 'In Progress') AS inProgress,
        SUM(status NOT IN ('Resolved','Rejected')) AS pending,
        SUM(severity = 'High' AND status NOT IN ('Resolved','Rejected')) AS critical
      FROM reports
    `);

    const [severity] = await pool.query(`
      SELECT severity, COUNT(*) AS count
      FROM reports GROUP BY severity
    `);

    const [status] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM reports GROUP BY status
    `);

    const [issueTypes] = await pool.query(`
      SELECT issue_type AS issueType, COUNT(*) AS count
      FROM reports GROUP BY issue_type ORDER BY count DESC
    `);

    res.json({
      totals: {
        total: Number(totals.total || 0),
        resolved: Number(totals.resolved || 0),
        inProgress: Number(totals.inProgress || 0),
        pending: Number(totals.pending || 0),
        critical: Number(totals.critical || 0)
      },
      severity,
      status,
      issueTypes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load dashboard statistics." });
  }
}
