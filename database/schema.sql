CREATE DATABASE IF NOT EXISTS roadsense
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE roadsense;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('citizen','admin') NOT NULL DEFAULT 'citizen',
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(30) NULL,
  city VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(190) NULL,
  employee_id VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_employee_id (employee_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  issue_type VARCHAR(80) NOT NULL,
  severity ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  image_url VARCHAR(500) NULL,
  status ENUM('Submitted','In Review','In Progress','Resolved','Rejected')
    NOT NULL DEFAULT 'Submitted',
  assigned_department VARCHAR(190) NULL,
  assigned_officer VARCHAR(190) NULL,
  target_date DATE NULL,
  internal_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_status (status),
  KEY idx_reports_severity (severity),
  KEY idx_reports_reporter (reporter_id),
  KEY idx_reports_location (latitude, longitude),
  CONSTRAINT fk_reports_user
    FOREIGN KEY (reporter_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_timeline (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(50) NOT NULL,
  note TEXT NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_timeline_report (report_id),
  CONSTRAINT fk_timeline_report
    FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_timeline_user
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Demo accounts. Password for both is: Password@123
INSERT INTO users
(role, full_name, email, phone, city, password_hash, department, employee_id)
VALUES
(
  'citizen',
  'Demo Citizen',
  'citizen@roadsense.demo',
  '9876543210',
  'Kolkata, West Bengal',
  '$2b$12$3Z6Yqj3eWq1Yq6G7k0zY6e6eYV8Q0ZpR4cR3Y0V7Y9rKQk8H0J8wW',
  NULL,
  NULL
),
(
  'admin',
  'Demo Government Officer',
  'admin@roadsense.demo',
  '9876543211',
  'Kolkata, West Bengal',
  '$2b$12$3Z6Yqj3eWq1Yq6G7k0zY6e6eYV8Q0ZpR4cR3Y0V7Y9rKQk8H0J8wW',
  'Public Works Department',
  'PWD-2026-104'
)
ON DUPLICATE KEY UPDATE id=id;

-- Add sample reports after creating the users.
INSERT INTO reports
(reporter_id, issue_type, severity, location, description, latitude, longitude, status, assigned_department, assigned_officer, target_date)
SELECT
  u.id, 'Pothole', 'High', 'EM Bypass near Science City, Kolkata',
  'AI-assisted road scan detected a large pothole in a high-traffic lane.',
  22.5416000, 88.3982000, 'Submitted', NULL, NULL, NULL
FROM users u
WHERE u.email = 'citizen@roadsense.demo'
  AND NOT EXISTS (
    SELECT 1 FROM reports r WHERE r.location = 'EM Bypass near Science City, Kolkata'
  );

INSERT INTO reports
(reporter_id, issue_type, severity, location, description, latitude, longitude, status, assigned_department, assigned_officer, target_date)
SELECT
  u.id, 'Broken Streetlight', 'Medium', 'Gariahat Road, Kolkata',
  'Streetlight near the pedestrian crossing is not working at night.',
  22.5196000, 88.3659000, 'In Progress',
  'Streetlight Maintenance Department', 'Ward 68 Electrical Team', '2026-09-15'
FROM users u
WHERE u.email = 'citizen@roadsense.demo'
  AND NOT EXISTS (
    SELECT 1 FROM reports r WHERE r.location = 'Gariahat Road, Kolkata'
  );

INSERT INTO report_timeline (report_id, status, note)
SELECT r.id, r.status, 'Citizen report received by RoadSense.'
FROM reports r
WHERE NOT EXISTS (
  SELECT 1 FROM report_timeline t WHERE t.report_id = r.id
);
