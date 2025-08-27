# Admin Schema

This document defines administrative entities for system management, monitoring, and configuration.

## Admin User Entity

Represents administrators with elevated privileges for system management.

```typescript
interface AdminUser {
  id: string;                    // Unique admin identifier
  username: string;              // Admin username
  email: string;                 // Contact email
  role: AdminRole;               // Permission level
  permissions: Permission[];     // Specific permissions
  profile: AdminProfile;         // Admin information
  session: AdminSession;         // Current session
  preferences: AdminPreferences; // UI preferences
  auditLog: AuditLogEntry[];    // Admin action history
  status: AdminStatus;           // Current status
  createdAt: Date;
  lastLoginAt: Date;
}

enum AdminRole {
  SUPER_ADMIN = 'super_admin',   // Full system access
  ADMIN = 'admin',               // Standard admin privileges
  MODERATOR = 'moderator',       // Content/player moderation
  SUPPORT = 'support',           // Customer support access
  OBSERVER = 'observer'          // Read-only monitoring
}

enum Permission {
  // System Management
  MANAGE_SERVERS = 'manage_servers',
  MANAGE_CONFIG = 'manage_config',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_DATABASE = 'manage_database',
  
  // Room Management
  VIEW_ROOMS = 'view_rooms',
  MANAGE_ROOMS = 'manage_rooms',
  TERMINATE_ROOMS = 'terminate_rooms',
  
  // Player Management
  VIEW_PLAYERS = 'view_players',
  MANAGE_PLAYERS = 'manage_players',
  BAN_PLAYERS = 'ban_players',
  KICK_PLAYERS = 'kick_players',
  
  // Content Management
  MODERATE_CHAT = 'moderate_chat',
  MANAGE_REPORTS = 'manage_reports',
  
  // Analytics & Reporting
  VIEW_ANALYTICS = 'view_analytics',
  GENERATE_REPORTS = 'generate_reports',
  EXPORT_DATA = 'export_data',
  
  // Security
  MANAGE_ADMINS = 'manage_admins',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SECURITY = 'manage_security'
}

enum AdminStatus {
  ACTIVE = 'active',             // Active admin
  INACTIVE = 'inactive',         // Temporarily disabled
  SUSPENDED = 'suspended',       // Privilege suspended
  LOCKED = 'locked'              // Account locked
}
```

## Admin Session

Manages admin authentication and session security.

```typescript
interface AdminSession {
  sessionId: string;             // Session identifier
  adminId: string;               // Associated admin user
  token: string;                 // Authentication token
  ipAddress: string;             // Login IP address
  userAgent: string;             // Browser/client info
  loginTime: Date;               // Session start time
  lastActivity: Date;            // Last action timestamp
  expiresAt: Date;               // Session expiry
  permissions: Permission[];     // Session permissions
  mfaVerified: boolean;          // Multi-factor auth status
  securityLevel: SecurityLevel;  // Session security rating
}

enum SecurityLevel {
  LOW = 'low',                   // Basic authentication
  MEDIUM = 'medium',             // Password + IP verification
  HIGH = 'high'                  // MFA + secure connection
}

interface AdminProfile {
  adminId: string;               // Associated admin
  firstName: string;             // Admin first name
  lastName: string;              // Admin last name
  department?: string;           // Organizational unit
  timezone: string;              // Timezone preference
  contactInfo: ContactInfo;      // Contact details
  emergencyContact?: ContactInfo; // Emergency contact
}

interface ContactInfo {
  email: string;                 // Email address
  phone?: string;                // Phone number
  alternateEmail?: string;       // Secondary email
}
```

## System Logs

Comprehensive logging system for debugging and monitoring.

```typescript
interface SystemLog {
  id: string;                    // Log entry identifier
  timestamp: Date;               // Log occurrence time
  level: LogLevel;               // Log severity
  component: string;             // System component
  category: LogCategory;         // Log classification
  message: string;               // Log message
  data?: any;                    // Additional log data
  userId?: string;               // Associated user (if applicable)
  sessionId?: string;            // Associated session
  requestId?: string;            // Request correlation ID
  stackTrace?: string;           // Error stack trace
  tags: string[];                // Log tags for filtering
}

enum LogLevel {
  TRACE = 'trace',               // Detailed execution trace
  DEBUG = 'debug',               // Debug information
  INFO = 'info',                 // General information
  WARN = 'warn',                 // Warning conditions
  ERROR = 'error',               // Error conditions
  FATAL = 'fatal'                // Critical failures
}

enum LogCategory {
  SYSTEM = 'system',             // System operations
  SECURITY = 'security',         // Security events
  DATABASE = 'database',         // Database operations
  NETWORK = 'network',           // Network communications
  GAME = 'game',                 // Game logic
  PLAYER = 'player',             // Player actions
  ADMIN = 'admin',               // Admin actions
  PERFORMANCE = 'performance',   // Performance metrics
  API = 'api'                    // API requests
}

interface LogFilter {
  startTime?: Date;              // Filter start time
  endTime?: Date;                // Filter end time
  levels: LogLevel[];            // Log levels to include
  components: string[];          // Components to include
  categories: LogCategory[];     // Categories to include
  searchText?: string;           // Text search
  userId?: string;               // Specific user logs
  tags: string[];                // Required tags
  limit: number;                 // Maximum results
  offset: number;                // Pagination offset
}
```

## Audit Log

Tracks administrative actions for security and compliance.

```typescript
interface AuditLogEntry {
  id: string;                    // Audit entry identifier
  adminId: string;               // Admin who performed action
  action: AuditAction;           // Action performed
  resource: AuditResource;       // Affected resource
  resourceId: string;            // Resource identifier
  previousState?: any;           // State before action
  newState?: any;                // State after action
  reason?: string;               // Action justification
  outcome: AuditOutcome;         // Action result
  timestamp: Date;               // Action timestamp
  ipAddress: string;             // Admin IP address
  userAgent: string;             // Admin browser/client
  sessionId: string;             // Admin session
  metadata: AuditMetadata;       // Additional context
}

enum AuditAction {
  CREATE = 'create',             // Created resource
  READ = 'read',                 // Viewed resource
  UPDATE = 'update',             // Modified resource
  DELETE = 'delete',             // Removed resource
  LOGIN = 'login',               // Admin login
  LOGOUT = 'logout',             // Admin logout
  PERMISSION_GRANT = 'permission_grant', // Granted permission
  PERMISSION_REVOKE = 'permission_revoke', // Revoked permission
  KICK_PLAYER = 'kick_player',   // Kicked player
  BAN_PLAYER = 'ban_player',     // Banned player
  TERMINATE_ROOM = 'terminate_room', // Closed room
  CONFIG_CHANGE = 'config_change' // Changed configuration
}

enum AuditResource {
  ADMIN_USER = 'admin_user',     // Admin user account
  PLAYER = 'player',             // Player account
  ROOM = 'room',                 // Game room
  GAME = 'game',                 // Game session
  CONFIGURATION = 'configuration', // System config
  SERVER = 'server',             // Server instance
  DATABASE = 'database',         // Database operation
  REPORT = 'report'              // Generated report
}

enum AuditOutcome {
  SUCCESS = 'success',           // Action successful
  FAILURE = 'failure',           // Action failed
  PARTIAL = 'partial',           // Partially successful
  BLOCKED = 'blocked'            // Action blocked by policy
}

interface AuditMetadata {
  correlationId?: string;        // Request correlation
  affectedUsers: string[];       // Impacted user IDs
  severity: AuditSeverity;       // Impact level
  compliance: ComplianceFlags;   // Regulatory flags
  retention: RetentionPolicy;    // Data retention info
}

enum AuditSeverity {
  LOW = 'low',                   // Routine operation
  MEDIUM = 'medium',             // Significant operation
  HIGH = 'high',                 // Critical operation
  CRITICAL = 'critical'          // Emergency operation
}

interface ComplianceFlags {
  gdpr: boolean;                 // GDPR relevant
  coppa: boolean;                // COPPA relevant
  pci: boolean;                  // PCI DSS relevant
  sox: boolean;                  // SOX relevant
}
```

## System Configuration

Manages system-wide settings and parameters.

```typescript
interface SystemConfiguration {
  id: string;                    // Configuration identifier
  version: string;               // Configuration version
  environment: Environment;      // Deployment environment
  sections: ConfigSection[];     // Configuration sections
  metadata: ConfigMetadata;      // Configuration info
  validation: ConfigValidation;  // Validation rules
  history: ConfigHistory[];      // Change history
  lastModified: Date;
  modifiedBy: string;            // Admin who modified
}

enum Environment {
  DEVELOPMENT = 'development',   // Dev environment
  STAGING = 'staging',           // Staging environment
  PRODUCTION = 'production'      // Production environment
}

interface ConfigSection {
  name: string;                  // Section name
  description: string;           // Section description
  settings: ConfigSetting[];     // Individual settings
  enabled: boolean;              // Section active status
  readOnly: boolean;             // Write protection
}

interface ConfigSetting {
  key: string;                   // Setting key
  value: any;                    // Setting value
  type: ConfigType;              // Value type
  description: string;           // Setting description
  defaultValue: any;             // Default value
  validation: ValidationRule;    // Value validation
  sensitive: boolean;            // Contains secrets
  requiresRestart: boolean;      // Needs server restart
  lastModified: Date;
}

enum ConfigType {
  STRING = 'string',             // Text value
  NUMBER = 'number',             // Numeric value
  BOOLEAN = 'boolean',           // Boolean value
  ARRAY = 'array',               // Array value
  OBJECT = 'object',             // Object value
  JSON = 'json'                  // JSON string
}

interface ValidationRule {
  required: boolean;             // Value required
  minLength?: number;            // Minimum string length
  maxLength?: number;            // Maximum string length
  minValue?: number;             // Minimum numeric value
  maxValue?: number;             // Maximum numeric value
  pattern?: string;              // Regex pattern
  enum?: string[];               // Allowed values
  custom?: string;               // Custom validation function
}
```

## System Statistics

Real-time and historical system metrics.

```typescript
interface SystemStatistics {
  timestamp: Date;               // Measurement time
  server: ServerMetrics;         // Server performance
  game: GameMetrics;             // Game-specific metrics
  players: PlayerMetrics;        // Player statistics
  rooms: RoomMetrics;           // Room statistics
  database: DatabaseMetrics;     // Database performance
  network: NetworkMetrics;       // Network statistics
}

interface ServerMetrics {
  uptime: number;                // Server uptime (ms)
  cpuUsage: number;              // CPU utilization (%)
  memoryUsage: number;           // Memory usage (bytes)
  diskUsage: number;             // Disk usage (bytes)
  loadAverage: number[];         // System load averages
  activeConnections: number;     // Active WebSocket connections
  requestsPerMinute: number;     // HTTP requests per minute
  errorsPerMinute: number;       // Errors per minute
}

interface GameMetrics {
  activeGames: number;           // Currently running games
  totalGamesPlayed: number;      // All-time games completed
  averageGameDuration: number;   // Average game length (ms)
  averagePlayersPerGame: number; // Average concurrent players
  monstersSpawned: number;       // Total monsters spawned
  bombsExploded: number;         // Total bombs detonated
  powerupsCollected: number;     // Total power-ups collected
}

interface PlayerMetrics {
  onlinePlayers: number;         // Currently online players
  peakConcurrentPlayers: number; // Daily peak players
  newPlayersToday: number;       // New registrations today
  averageSessionDuration: number; // Average session length (ms)
  playerRetentionRate: number;   // Retention percentage
}

interface RoomMetrics {
  activeRooms: number;           // Currently active rooms
  totalRoomsCreated: number;     // All-time rooms created
  averageRoomOccupancy: number;  // Average players per room
  publicRooms: number;           // Public room count
  privateRooms: number;          // Private room count
}

interface DatabaseMetrics {
  connections: number;           // Active DB connections
  queryTime: number;             // Average query time (ms)
  queriesPerMinute: number;      // Queries per minute
  cacheHitRatio: number;         // Cache hit percentage
  diskSpace: number;             // Database disk usage (bytes)
}

interface NetworkMetrics {
  bandwidth: NetworkBandwidth;   // Network throughput
  latency: NetworkLatency;       // Connection latencies
  packets: PacketStatistics;     // Packet transmission stats
  websockets: WebSocketMetrics;  // WebSocket-specific metrics
}

interface NetworkBandwidth {
  inbound: number;               // Incoming bytes per second
  outbound: number;              // Outgoing bytes per second
  peak: number;                  // Peak bandwidth used
}

interface NetworkLatency {
  average: number;               // Average latency (ms)
  p95: number;                   // 95th percentile latency
  p99: number;                   // 99th percentile latency
  worst: number;                 // Worst case latency
}

interface PacketStatistics {
  sent: number;                  // Packets sent
  received: number;              // Packets received
  lost: number;                  // Packets lost
  retransmitted: number;         // Packets retransmitted
}

interface WebSocketMetrics {
  activeConnections: number;     // Active WebSocket connections
  messagesPerSecond: number;     // Messages per second
  averageMessageSize: number;    // Average message size (bytes)
  compressionRatio: number;      // Message compression efficiency
}
```

## Reports

System for generating administrative reports.

```typescript
interface Report {
  id: string;                    // Report identifier
  type: ReportType;              // Report category
  title: string;                 // Report title
  description: string;           // Report description
  parameters: ReportParameters;  // Report configuration
  data: ReportData;              // Report content
  format: ReportFormat;          // Output format
  status: ReportStatus;          // Generation status
  generatedBy: string;           // Admin who requested
  generatedAt: Date;
  expiresAt?: Date;              // Report expiry
}

enum ReportType {
  PLAYER_ACTIVITY = 'player_activity',       // Player usage statistics
  GAME_STATISTICS = 'game_statistics',       // Game performance metrics
  SERVER_PERFORMANCE = 'server_performance', // System performance
  SECURITY_AUDIT = 'security_audit',         // Security events
  ERROR_ANALYSIS = 'error_analysis',         // Error patterns
  USAGE_TRENDS = 'usage_trends',             // Usage analytics
  FINANCIAL = 'financial',                   // Revenue/costs
  COMPLIANCE = 'compliance'                  // Regulatory compliance
}

interface ReportParameters {
  dateRange: DateRange;          // Time period
  filters: ReportFilter[];       // Data filters
  aggregation: AggregationLevel; // Data grouping
  includeCharts: boolean;        // Include visualizations
  includeRawData: boolean;       // Include raw data export
  maxRecords?: number;           // Record limit
}

interface DateRange {
  startDate: Date;               // Range start
  endDate: Date;                 // Range end
  timezone: string;              // Timezone for dates
}

enum AggregationLevel {
  MINUTE = 'minute',             // Per-minute aggregation
  HOUR = 'hour',                 // Per-hour aggregation
  DAY = 'day',                   // Per-day aggregation
  WEEK = 'week',                 // Per-week aggregation
  MONTH = 'month'                // Per-month aggregation
}

enum ReportFormat {
  HTML = 'html',                 // HTML web page
  PDF = 'pdf',                   // PDF document
  CSV = 'csv',                   // Comma-separated values
  JSON = 'json',                 // JSON data
  EXCEL = 'excel'                // Excel spreadsheet
}

enum ReportStatus {
  QUEUED = 'queued',             // Waiting to generate
  GENERATING = 'generating',     // Currently processing
  COMPLETED = 'completed',       // Successfully generated
  FAILED = 'failed',             // Generation failed
  EXPIRED = 'expired'            // Report expired
}
```

## Usage Notes

- Admin authentication should use secure protocols (HTTPS, MFA)
- All admin actions must be logged in the audit trail
- System logs should be automatically rotated and archived
- Configuration changes should be validated and backed up
- Sensitive configuration values must be encrypted at rest
- Statistics collection should have minimal performance impact
- Reports may take time to generate and should be queued
- Audit logs must be tamper-evident for compliance
- Admin permissions follow principle of least privilege
- System metrics enable proactive monitoring and alerting