-- =============================================================================
-- Pensaer-BIM Initial Database Schema
-- PostgreSQL 16+ with PostGIS extension
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- =============================================================================
-- Projects & Organizations
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id);

-- =============================================================================
-- Users & Authentication
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    auth_provider_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_provider, auth_provider_id);

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',  -- viewer, editor, admin, owner
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- =============================================================================
-- BIM Model State (Event-Sourced)
-- =============================================================================

CREATE TABLE IF NOT EXISTS model_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, sequence_number)
);

CREATE INDEX idx_model_events_project ON model_events(project_id, sequence_number);
CREATE INDEX idx_model_events_type ON model_events(event_type);
CREATE INDEX idx_model_events_created ON model_events(created_at);

-- =============================================================================
-- BIM Elements (Materialized View / Snapshot)
-- =============================================================================

CREATE TABLE IF NOT EXISTS elements (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    element_type VARCHAR(50) NOT NULL,  -- wall, door, window, room, floor, roof, column, beam, stair
    properties JSONB NOT NULL DEFAULT '{}',
    geometry JSONB,  -- Lightweight geometry representation
    geom GEOMETRY(GEOMETRYZ, 4326),  -- PostGIS 3D geometry for spatial queries
    level_id UUID,
    parent_id UUID REFERENCES elements(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version BIGINT DEFAULT 1
);

CREATE INDEX idx_elements_project ON elements(project_id);
CREATE INDEX idx_elements_type ON elements(element_type);
CREATE INDEX idx_elements_level ON elements(level_id);
CREATE INDEX idx_elements_parent ON elements(parent_id);
CREATE INDEX idx_elements_geom ON elements USING GIST(geom);
CREATE INDEX idx_elements_properties ON elements USING GIN(properties);

-- =============================================================================
-- Levels / Floors
-- =============================================================================

CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    elevation DOUBLE PRECISION NOT NULL DEFAULT 0,
    height DOUBLE PRECISION DEFAULT 3.0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_levels_project ON levels(project_id, elevation);

-- =============================================================================
-- Groups & Selections
-- =============================================================================

CREATE TABLE IF NOT EXISTS element_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_elements (
    group_id UUID NOT NULL REFERENCES element_groups(id) ON DELETE CASCADE,
    element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, element_id)
);

-- =============================================================================
-- IFC Import/Export History
-- =============================================================================

CREATE TABLE IF NOT EXISTS ifc_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL,  -- 'import' or 'export'
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    ifc_version VARCHAR(20),
    element_count INTEGER,
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ifc_files_project ON ifc_files(project_id);

-- =============================================================================
-- Validation Results
-- =============================================================================

CREATE TABLE IF NOT EXISTS validation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    run_type VARCHAR(50) NOT NULL,  -- clash_detection, compliance_check, etc.
    status VARCHAR(50) DEFAULT 'running',
    results JSONB,
    issue_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_validation_runs_project ON validation_runs(project_id);

-- =============================================================================
-- Audit Log
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- =============================================================================
-- Functions & Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_elements_updated_at BEFORE UPDATE ON elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_levels_updated_at BEFORE UPDATE ON levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Create default organization for development
INSERT INTO organizations (id, name, slug) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Pensaer Development', 'pensaer-dev')
ON CONFLICT (slug) DO NOTHING;

-- Create default project
INSERT INTO projects (id, organization_id, name, slug, description) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
     'Demo Project', 'demo', 'Default demo project for development')
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Create default levels
INSERT INTO levels (project_id, name, elevation, height, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Foundation', -1.0, 1.0, 0),
    ('00000000-0000-0000-0000-000000000001', 'Ground Floor', 0.0, 3.0, 1),
    ('00000000-0000-0000-0000-000000000001', 'First Floor', 3.0, 3.0, 2),
    ('00000000-0000-0000-0000-000000000001', 'Roof', 6.0, 0.5, 3)
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pensaer;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pensaer;
