export function mapReport(row, timeline = []) {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email || "",
    reporterPhone: row.reporter_phone || "",
    issueType: row.issue_type,
    severity: row.severity,
    location: row.location,
    description: row.description,
    latitude: row.latitude == null ? "Not captured" : String(row.latitude),
    longitude: row.longitude == null ? "Not captured" : String(row.longitude),
    imageUrl: row.image_url || "",
    status: row.status,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : "",
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "",
    assignedDepartment: row.assigned_department || "",
    assignedOfficer: row.assigned_officer || "",
    targetDate: row.target_date || "",
    internalNote: row.internal_note || "",
    timeline
  };
}
