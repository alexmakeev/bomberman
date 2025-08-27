/**
 * Admin and system management type definitions.
 * Includes admin users, system logs, audit trails, configuration, and reports.
 */

import { EntityId, Timestamp, DateRange, ValidationResult, PaginatedResponse, ErrorSeverity } from './common';

/**
 * Admin role levels
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
  OBSERVER = 'observer'
}

/**
 * Admin permissions
 */
export enum Permission {
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

/**
 * Admin user status
 */
export enum AdminStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  LOCKED = 'locked'
}

/**
 * Main admin user entity
 */
export interface AdminUser {
  /** Unique admin identifier */
  id: EntityId;
  /** Admin username */
  username: string;
  /** Contact email */
  email: string;
  /** Permission level */
  role: AdminRole;
  /** Specific permissions */
  permissions: Permission[];
  /** Admin profile info */
  profile: AdminProfile;
  /** Current session */
  session: AdminSession;
  /** UI preferences */
  preferences: AdminPreferences;
  /** Admin action history */
  auditLog: AuditLogEntry[];
  /** Current status */
  status: AdminStatus;
  /** Account creation */
  createdAt: Timestamp;
  /** Last login */
  lastLoginAt: Timestamp;
}

/**
 * Admin session security levels
 */
export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Admin authentication session
 */
export interface AdminSession {
  /** Session identifier */
  sessionId: EntityId;
  /** Associated admin user */
  adminId: EntityId;
  /** Authentication token */
  token: string;
  /** Login IP address */
  ipAddress: string;
  /** Browser/client info */
  userAgent: string;
  /** Session start time */
  loginTime: Timestamp;
  /** Last activity timestamp */
  lastActivity: Timestamp;
  /** Session expiry */
  expiresAt: Timestamp;
  /** Session permissions */
  permissions: Permission[];
  /** Multi-factor auth verified */
  mfaVerified: boolean;
  /** Session security rating */
  securityLevel: SecurityLevel;
}

/**
 * Admin profile information
 */
export interface AdminProfile {
  /** Associated admin ID */
  adminId: EntityId;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Organizational unit */
  department?: string;
  /** Timezone preference */
  timezone: string;
  /** Contact details */
  contactInfo: ContactInfo;
  /** Emergency contact */
  emergencyContact?: ContactInfo;
}

/**
 * Contact information
 */
export interface ContactInfo {
  /** Email address */
  email: string;
  /** Phone number */
  phone?: string;
  /** Secondary email */
  alternateEmail?: string;
}

/**
 * System log levels
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log categories
 */
export enum LogCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  DATABASE = 'database',
  NETWORK = 'network',
  GAME = 'game',
  PLAYER = 'player',
  ADMIN = 'admin',
  PERFORMANCE = 'performance',
  API = 'api'
}

/**
 * System log entry
 */
export interface SystemLog {
  /** Log entry identifier */
  id: EntityId;
  /** Log occurrence time */
  timestamp: Timestamp;
  /** Log severity */
  level: LogLevel;
  /** System component */
  component: string;
  /** Log classification */
  category: LogCategory;
  /** Log message */
  message: string;
  /** Additional log data */
  data?: any;
  /** Associated user ID */
  userId?: EntityId;
  /** Associated session */
  sessionId?: EntityId;
  /** Request correlation ID */
  requestId?: EntityId;
  /** Error stack trace */
  stackTrace?: string;
  /** Log tags for filtering */
  tags: string[];
}

/**
 * Log filtering parameters
 */
export interface LogFilter {
  /** Filter start time */
  startTime?: Timestamp;
  /** Filter end time */
  endTime?: Timestamp;
  /** Log levels to include */
  levels: LogLevel[];
  /** Components to include */
  components: string[];
  /** Categories to include */
  categories: LogCategory[];
  /** Text search */
  searchText?: string;
  /** Specific user logs */
  userId?: EntityId;
  /** Required tags */
  tags: string[];
  /** Maximum results */
  limit: number;
  /** Pagination offset */
  offset: number;
}

/**
 * Audit action types
 */
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  KICK_PLAYER = 'kick_player',
  BAN_PLAYER = 'ban_player',
  TERMINATE_ROOM = 'terminate_room',
  CONFIG_CHANGE = 'config_change'
}

/**
 * Audit resource types
 */
export enum AuditResource {
  ADMIN_USER = 'admin_user',
  PLAYER = 'player',
  ROOM = 'room',
  GAME = 'game',
  CONFIGURATION = 'configuration',
  SERVER = 'server',
  DATABASE = 'database',
  REPORT = 'report'
}

/**
 * Audit action outcomes
 */
export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  BLOCKED = 'blocked'
}

/**
 * Audit severity levels
 */
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Audit log entry for admin actions
 */
export interface AuditLogEntry {
  /** Audit entry identifier */
  id: EntityId;
  /** Admin who performed action */
  adminId: EntityId;
  /** Action performed */
  action: AuditAction;
  /** Affected resource */
  resource: AuditResource;
  /** Resource identifier */
  resourceId: EntityId;
  /** State before action */
  previousState?: any;
  /** State after action */
  newState?: any;
  /** Action justification */
  reason?: string;
  /** Action result */
  outcome: AuditOutcome;
  /** Action timestamp */
  timestamp: Timestamp;
  /** Admin IP address */
  ipAddress: string;
  /** Admin browser/client */
  userAgent: string;
  /** Admin session */
  sessionId: EntityId;
  /** Additional context */
  metadata: AuditMetadata;
}

/**
 * Compliance flags
 */
export interface ComplianceFlags {
  /** GDPR relevant */
  gdpr: boolean;
  /** COPPA relevant */
  coppa: boolean;
  /** PCI DSS relevant */
  pci: boolean;
  /** SOX relevant */
  sox: boolean;
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  /** Retention period (days) */
  retentionDays: number;
  /** Archive after retention */
  archiveAfterRetention: boolean;
  /** Permanent deletion date */
  permanentDeletionDate?: Timestamp;
}

/**
 * Audit metadata
 */
export interface AuditMetadata {
  /** Request correlation */
  correlationId?: EntityId;
  /** Impacted user IDs */
  affectedUsers: EntityId[];
  /** Impact level */
  severity: AuditSeverity;
  /** Regulatory flags */
  compliance: ComplianceFlags;
  /** Data retention info */
  retention: RetentionPolicy;
}

/**
 * Deployment environment
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Configuration value types
 */
export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  JSON = 'json'
}

/**
 * Configuration setting
 */
export interface ConfigSetting {
  /** Setting key */
  key: string;
  /** Setting value */
  value: any;
  /** Value type */
  type: ConfigType;
  /** Setting description */
  description: string;
  /** Default value */
  defaultValue: any;
  /** Value validation */
  validation: ValidationRule;
  /** Contains secrets */
  sensitive: boolean;
  /** Needs server restart */
  requiresRestart: boolean;
  /** Last modification */
  lastModified: Timestamp;
}

/**
 * Configuration validation rule
 */
export interface ValidationRule {
  /** Value required */
  required: boolean;
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Minimum numeric value */
  minValue?: number;
  /** Maximum numeric value */
  maxValue?: number;
  /** Regex pattern */
  pattern?: string;
  /** Allowed values */
  enum?: string[];
  /** Custom validation function */
  custom?: string;
}

/**
 * Report types
 */
export enum ReportType {
  PLAYER_ACTIVITY = 'player_activity',
  GAME_STATISTICS = 'game_statistics',
  SERVER_PERFORMANCE = 'server_performance',
  SECURITY_AUDIT = 'security_audit',
  ERROR_ANALYSIS = 'error_analysis',
  USAGE_TRENDS = 'usage_trends',
  FINANCIAL = 'financial',
  COMPLIANCE = 'compliance'
}

/**
 * Report formats
 */
export enum ReportFormat {
  HTML = 'html',
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel'
}

/**
 * Report generation status
 */
export enum ReportStatus {
  QUEUED = 'queued',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

/**
 * System performance metrics
 */
export interface SystemMetrics {
  /** Measurement timestamp */
  timestamp: Timestamp;
  /** Server performance */
  server: ServerMetrics;
  /** Game-specific metrics */
  game: GameMetrics;
  /** Player statistics */
  players: PlayerMetrics;
  /** Room statistics */
  rooms: RoomMetrics;
  /** Database performance */
  database: DatabaseMetrics;
  /** Network statistics */
  network: NetworkMetrics;
}

/**
 * Server performance metrics
 */
export interface ServerMetrics {
  /** Server uptime (milliseconds) */
  uptime: number;
  /** CPU utilization (%) */
  cpuUsage: number;
  /** Memory usage (bytes) */
  memoryUsage: number;
  /** Disk usage (bytes) */
  diskUsage: number;
  /** System load averages */
  loadAverage: number[];
  /** Active WebSocket connections */
  activeConnections: number;
  /** HTTP requests per minute */
  requestsPerMinute: number;
  /** Errors per minute */
  errorsPerMinute: number;
}

/**
 * Game performance metrics
 */
export interface GameMetrics {
  /** Currently running games */
  activeGames: number;
  /** All-time games completed */
  totalGamesPlayed: number;
  /** Average game length (milliseconds) */
  averageGameDuration: number;
  /** Average concurrent players */
  averagePlayersPerGame: number;
  /** Total monsters spawned */
  monstersSpawned: number;
  /** Total bombs detonated */
  bombsExploded: number;
  /** Total power-ups collected */
  powerupsCollected: number;
}

/**
 * Player metrics
 */
export interface PlayerMetrics {
  /** Currently online players */
  onlinePlayers: number;
  /** Daily peak players */
  peakConcurrentPlayers: number;
  /** New registrations today */
  newPlayersToday: number;
  /** Average session length (milliseconds) */
  averageSessionDuration: number;
  /** Retention percentage */
  playerRetentionRate: number;
}

/**
 * Room metrics
 */
export interface RoomMetrics {
  /** Currently active rooms */
  activeRooms: number;
  /** All-time rooms created */
  totalRoomsCreated: number;
  /** Average players per room */
  averageRoomOccupancy: number;
  /** Public room count */
  publicRooms: number;
  /** Private room count */
  privateRooms: number;
}

/**
 * Database performance metrics
 */
export interface DatabaseMetrics {
  /** Active DB connections */
  connections: number;
  /** Average query time (milliseconds) */
  queryTime: number;
  /** Queries per minute */
  queriesPerMinute: number;
  /** Cache hit percentage */
  cacheHitRatio: number;
  /** Database disk usage (bytes) */
  diskSpace: number;
}

/**
 * Network performance metrics
 */
export interface NetworkMetrics {
  /** Network throughput */
  bandwidth: NetworkBandwidth;
  /** Connection latencies */
  latency: NetworkLatency;
  /** Packet transmission stats */
  packets: PacketStatistics;
  /** WebSocket-specific metrics */
  websockets: WebSocketMetrics;
}

/**
 * Network bandwidth metrics
 */
export interface NetworkBandwidth {
  /** Incoming bytes per second */
  inbound: number;
  /** Outgoing bytes per second */
  outbound: number;
  /** Peak bandwidth used */
  peak: number;
}

/**
 * Network latency metrics
 */
export interface NetworkLatency {
  /** Average latency (milliseconds) */
  average: number;
  /** 95th percentile latency */
  p95: number;
  /** 99th percentile latency */
  p99: number;
  /** Worst case latency */
  worst: number;
}

/**
 * Packet transmission statistics
 */
export interface PacketStatistics {
  /** Packets sent */
  sent: number;
  /** Packets received */
  received: number;
  /** Packets lost */
  lost: number;
  /** Packets retransmitted */
  retransmitted: number;
}

/**
 * WebSocket-specific metrics
 */
export interface WebSocketMetrics {
  /** Active WebSocket connections */
  activeConnections: number;
  /** Messages per second */
  messagesPerSecond: number;
  /** Average message size (bytes) */
  averageMessageSize: number;
  /** Message compression efficiency */
  compressionRatio: number;
}

/**
 * Additional admin-related interfaces
 */
export interface AdminPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  autoRefreshInterval: number;
}

export interface AdminCredentials {
  username: string;
  password?: string;
  token?: string;
  mfaCode?: string;
}

export interface AdminAuthResult {
  success: boolean;
  adminId?: EntityId;
  sessionToken?: string;
  permissions?: Permission[];
  error?: string;
  requiresMfa?: boolean;
}