-- Bomberman Game Database Initialization
-- Creates the basic database structure for persistent storage

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('player', 'admin', 'moderator');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned', 'pending');
CREATE TYPE game_status AS ENUM ('waiting', 'in_progress', 'completed', 'abandoned');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'achievement', 'invitation', 'system_update');
CREATE TYPE notification_channel AS ENUM ('in_game', 'websocket', 'email', 'push', 'sms', 'webhook');

-- Users table - Core user management
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'player',
    status user_status DEFAULT 'active',
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- User preferences
    preferences JSONB DEFAULT '{}',
    
    -- Indexes
    CONSTRAINT users_username_check CHECK (LENGTH(username) >= 3),
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions table
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- User statistics table - Lifetime player stats
CREATE TABLE user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    total_games INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_play_time_seconds BIGINT DEFAULT 0,
    bombs_placed INTEGER DEFAULT 0,
    enemies_defeated INTEGER DEFAULT 0,
    power_ups_collected INTEGER DEFAULT 0,
    walls_destroyed INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    cooperative_score BIGINT DEFAULT 0,
    longest_survival_time INTEGER DEFAULT 0,
    best_completion_time INTEGER,
    
    -- Calculated fields
    win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN (games_won + games_lost) > 0 
        THEN (games_won::DECIMAL / (games_won + games_lost) * 100)
        ELSE 0 END
    ) STORED,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements table
CREATE TABLE user_achievements (
    achievement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_key VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    
    UNIQUE(user_id, achievement_key)
);

-- Game history table - Completed games
CREATE TABLE game_history (
    game_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(100) NOT NULL,
    game_mode VARCHAR(50) DEFAULT 'cooperative',
    status game_status NOT NULL,
    player_count INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Game outcome
    victory BOOLEAN,
    victory_condition VARCHAR(100), -- 'boss_defeated', 'exit_reached', 'survival'
    final_score BIGINT DEFAULT 0,
    
    -- Game metadata
    maze_seed VARCHAR(100),
    difficulty_level INTEGER DEFAULT 1,
    game_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game statistics table - Detailed stats per completed game
CREATE TABLE game_statistics (
    game_stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES game_history(game_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Player performance in this game
    survival_time_seconds INTEGER DEFAULT 0,
    deaths_count INTEGER DEFAULT 0,
    bombs_placed INTEGER DEFAULT 0,
    enemies_defeated INTEGER DEFAULT 0,
    power_ups_collected INTEGER DEFAULT 0,
    walls_destroyed INTEGER DEFAULT 0,
    team_damage_dealt INTEGER DEFAULT 0, -- Accidental friendly fire
    score_earned BIGINT DEFAULT 0,
    
    -- Final statistics
    final_position POINT,
    was_alive_at_end BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(game_id, user_id)
);

-- Audit logs table - Admin actions and security events
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for querying
    metadata JSONB DEFAULT '{}'
);

-- System configuration table
CREATE TABLE system_configuration (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by non-admin users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL
);

-- Notification templates table
CREATE TABLE notification_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    type notification_type NOT NULL,
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    default_channels notification_channel[] DEFAULT ARRAY['in_game'],
    variables JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    enabled_types notification_type[] DEFAULT ARRAY['info', 'success', 'warning', 'error', 'achievement', 'invitation'],
    channel_preferences JSONB DEFAULT '{}', -- Type -> Channels mapping
    quiet_hours JSONB, -- Start/end times, timezone, days
    frequency_limits JSONB DEFAULT '{"maxPerHour": 30, "maxPerDay": 100}',
    blocked_sources UUID[] DEFAULT ARRAY[]::UUID[],
    grouping_preferences JSONB DEFAULT '{"enabled": true, "maxGroupSize": 5}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_game_history_room_id ON game_history(room_id);
CREATE INDEX idx_game_history_status ON game_history(status);
CREATE INDEX idx_game_history_started_at ON game_history(started_at);

CREATE INDEX idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX idx_game_statistics_user_id ON game_statistics(user_id);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_key ON user_achievements(achievement_key);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system configuration
INSERT INTO system_configuration (config_key, config_value, description, is_public) VALUES
('game.max_players_per_room', '8', 'Maximum players allowed in a game room', true),
('game.default_respawn_time', '10', 'Default respawn time in seconds', true),
('game.max_bombs_per_player', '5', 'Maximum bombs a player can place simultaneously', true),
('game.bomb_explosion_delay', '3000', 'Bomb explosion delay in milliseconds', true),
('server.max_connections', '1000', 'Maximum WebSocket connections', false),
('notifications.rate_limit_per_hour', '50', 'Maximum notifications per user per hour', false);

-- Create default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, status, display_name, email_verified)
VALUES (
    'admin',
    'admin@bomberman.local',
    crypt('admin123', gen_salt('bf')),
    'admin',
    'active',
    'System Administrator',
    true
);

COMMIT;