-- LabScan MySQL schema
-- Charset/engine defaults are set per-table for portability.

-- Table: Users
CREATE TABLE IF NOT EXISTS users (
    user_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'student')),
    -- Bumped to revoke all outstanding refresh tokens for a user.
    token_version INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: Labs
CREATE TABLE IF NOT EXISTS labs (
    lab_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    lab_name VARCHAR(255) NOT NULL,
    description TEXT,
    admin_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: Experiments
CREATE TABLE IF NOT EXISTS experiments (
    experiment_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    lab_id CHAR(36) NOT NULL,
    experiment_name VARCHAR(255) NOT NULL,
    description TEXT,
    ar_qr_marker_id VARCHAR(255) UNIQUE NOT NULL, -- Unique ArUco/QR marker identifier
    -- Points at the version served to new sessions. NULL until first version created.
    active_content_version_id CHAR(36) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES labs(lab_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: ExperimentContentVersions
CREATE TABLE IF NOT EXISTS experiment_content_versions (
    content_version_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    experiment_id CHAR(36) NOT NULL,
    version_number INT NOT NULL,
    theory_procedure_json JSON NOT NULL, -- Structured JSON blocks
    -- Array of video objects, e.g.
    --   {type: 'youtube', url: '...', min_duration: 60}
    --   {type: 'faculty', storage_key: '...', min_duration: 300}
    video_links JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (experiment_id, version_number),
    FOREIGN KEY (experiment_id) REFERENCES experiments(experiment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Deferred FK: active version on experiments references a content version.
ALTER TABLE experiments
    ADD CONSTRAINT fk_experiments_active_version
    FOREIGN KEY (active_content_version_id)
    REFERENCES experiment_content_versions(content_version_id)
    ON DELETE SET NULL;

-- Table: ChecklistItems
CREATE TABLE IF NOT EXISTS checklist_items (
    checklist_item_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    content_version_id CHAR(36) NOT NULL,
    item_text TEXT NOT NULL,
    item_order INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (content_version_id, item_order),
    FOREIGN KEY (content_version_id) REFERENCES experiment_content_versions(content_version_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: StudentSessions
CREATE TABLE IF NOT EXISTS student_sessions (
    session_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    student_id CHAR(36) NOT NULL,
    experiment_id CHAR(36) NOT NULL,
    content_version_id CHAR(36) NOT NULL, -- Snapshot of content version at session start
    learning_stage_completed_at DATETIME,
    visual_stage_completed_at DATETIME,
    checklist_completed_at DATETIME,
    session_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_completed_at DATETIME,
    -- Per-video accumulated watch progress, e.g. {"<video_id>": {"watched_seconds": 120}}
    current_video_progress JSON,
    UNIQUE (student_id, experiment_id), -- One session per student per experiment
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (experiment_id) REFERENCES experiments(experiment_id) ON DELETE CASCADE,
    FOREIGN KEY (content_version_id) REFERENCES experiment_content_versions(content_version_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: StudentChecklistProgress
CREATE TABLE IF NOT EXISTS student_checklist_progress (
    student_session_id CHAR(36) NOT NULL,
    checklist_item_id CHAR(36) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME,
    PRIMARY KEY (student_session_id, checklist_item_id),
    FOREIGN KEY (student_session_id) REFERENCES student_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(checklist_item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: AuditLogs (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id CHAR(36) PRIMARY KEY, -- Application-generated UUID
    actor_id CHAR(36), -- Admin who performed the action
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id CHAR(36),
    details JSON, -- Additional details about the action
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_experiments_lab_id ON experiments(lab_id);
CREATE INDEX idx_experiment_content_versions_experiment_id ON experiment_content_versions(experiment_id);
CREATE INDEX idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX idx_student_sessions_experiment_id ON student_sessions(experiment_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
