/**
 * User Action Handler - Specialized event handling for user actions and interactions
 * Extends the unified EventBus for user action tracking, analytics, and response
 */

import { EntityId, Position } from '../../types/common';
import { 
  UniversalEvent, 
  EventCategory, 
  UserActionData, 
  ActionContext 
} from '../../types/events';
import { EventBus, EventHandler, SubscriptionResult, EventPublishResult } from '../core/EventBus';

/**
 * User action types across the system
 */
export enum UserActionType {
  // Authentication actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  
  // Navigation actions
  PAGE_VIEW = 'page_view',
  NAVIGATION = 'navigation',
  MENU_INTERACTION = 'menu_interaction',
  
  // Game actions
  GAME_JOIN = 'game_join',
  GAME_LEAVE = 'game_leave',
  GAME_ACTION = 'game_action',
  INPUT_ACTION = 'input_action',
  
  // Room/Lobby actions
  ROOM_CREATE = 'room_create',
  ROOM_JOIN = 'room_join',
  ROOM_LEAVE = 'room_leave',
  ROOM_SETTINGS_CHANGE = 'room_settings_change',
  
  // Social actions
  CHAT_MESSAGE = 'chat_message',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPT = 'friend_accept',
  PLAYER_REPORT = 'player_report',
  
  // Settings actions
  PREFERENCES_UPDATE = 'preferences_update',
  SETTINGS_CHANGE = 'settings_change',
  PROFILE_UPDATE = 'profile_update',
  
  // Purchase/Economy actions
  PURCHASE_ATTEMPT = 'purchase_attempt',
  PURCHASE_COMPLETE = 'purchase_complete',
  VIRTUAL_CURRENCY_SPEND = 'virtual_currency_spend',
  
  // Feature usage
  FEATURE_USE = 'feature_use',
  TUTORIAL_STEP = 'tutorial_step',
  ACHIEVEMENT_VIEW = 'achievement_view',
  LEADERBOARD_VIEW = 'leaderboard_view',
  
  // Performance actions
  PERFORMANCE_REPORT = 'performance_report',
  ERROR_REPORT = 'error_report',
  FEEDBACK_SUBMIT = 'feedback_submit',
  
  // Administrative actions
  ADMIN_LOGIN = 'admin_login',
  MODERATION_ACTION = 'moderation_action',
  CONFIG_CHANGE = 'config_change'
}

/**
 * Action result types
 */
export enum ActionResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  UNAUTHORIZED = 'unauthorized',
  INVALID = 'invalid'
}

/**
 * Enhanced user action data with tracking
 */
export interface EnhancedUserActionData extends UserActionData {
  /** Action identifier */
  actionId: EntityId;
  /** User identifier */
  userId: EntityId;
  /** Action result */
  result: ActionResult;
  /** Action duration (milliseconds) */
  durationMs?: number;
  /** Error information (if failed) */
  error?: ActionError;
  /** Action tags for categorization */
  tags: string[];
  /** Experiment/feature flags active during action */
  experiments?: string[];
  /** A/B test variants active */
  variants?: Record<string, string>;
}

/**
 * Action error information
 */
export interface ActionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Additional error context */
  context?: Record<string, any>;
}

/**
 * Action analytics data
 */
export interface ActionAnalytics {
  /** Action frequency */
  frequency: ActionFrequency;
  /** User segments */
  segments: UserSegment[];
  /** Conversion metrics */
  conversion: ConversionMetrics;
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Error analytics */
  errors: ErrorAnalytics;
}

/**
 * Action frequency metrics
 */
export interface ActionFrequency {
  /** Total action count */
  total: number;
  /** Unique users performing action */
  uniqueUsers: number;
  /** Actions per user (average) */
  actionsPerUser: number;
  /** Daily active users */
  dailyActiveUsers: number;
  /** Peak usage times */
  peakHours: number[];
  /** Frequency by day of week */
  weeklyPattern: Record<string, number>;
}

/**
 * User segmentation data
 */
export interface UserSegment {
  /** Segment name */
  name: string;
  /** Segment criteria */
  criteria: SegmentCriteria[];
  /** Users in segment */
  userCount: number;
  /** Action count for segment */
  actionCount: number;
  /** Segment engagement rate */
  engagementRate: number;
}

/**
 * Segment criteria
 */
export interface SegmentCriteria {
  /** Field to segment by */
  field: string;
  /** Criteria operator */
  operator: string;
  /** Criteria value */
  value: any;
}

/**
 * Conversion tracking metrics
 */
export interface ConversionMetrics {
  /** Conversion funnel steps */
  funnelSteps: FunnelStep[];
  /** Overall conversion rate */
  conversionRate: number;
  /** Time to conversion (average) */
  timeToConversionMs: number;
  /** Drop-off points */
  dropOffPoints: DropOffPoint[];
}

/**
 * Funnel step definition
 */
export interface FunnelStep {
  /** Step name */
  name: string;
  /** Action type for this step */
  actionType: UserActionType;
  /** Users who reached this step */
  userCount: number;
  /** Conversion rate to next step */
  conversionToNext: number;
}

/**
 * Drop-off analysis
 */
export interface DropOffPoint {
  /** Step where drop-off occurs */
  step: string;
  /** Drop-off rate */
  dropOffRate: number;
  /** Common reasons for drop-off */
  reasons: string[];
}

/**
 * Performance metrics for actions
 */
export interface PerformanceMetrics {
  /** Average action duration */
  avgDurationMs: number;
  /** 95th percentile duration */
  p95DurationMs: number;
  /** Success rate */
  successRate: number;
  /** Timeout rate */
  timeoutRate: number;
  /** Retry rate */
  retryRate: number;
}

/**
 * Error analytics
 */
export interface ErrorAnalytics {
  /** Total error count */
  totalErrors: number;
  /** Error rate */
  errorRate: number;
  /** Errors by type */
  errorsByType: Record<string, number>;
  /** Most common errors */
  topErrors: TopError[];
  /** Error trends */
  errorTrends: ErrorTrend[];
}

/**
 * Top error information
 */
export interface TopError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Occurrence count */
  count: number;
  /** Affected users */
  affectedUsers: number;
}

/**
 * Error trend data
 */
export interface ErrorTrend {
  /** Time period */
  period: string;
  /** Error count */
  count: number;
  /** Trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Action pattern recognition
 */
export interface ActionPattern {
  /** Pattern identifier */
  patternId: EntityId;
  /** Pattern name */
  name: string;
  /** Action sequence defining the pattern */
  actionSequence: UserActionType[];
  /** Pattern frequency */
  frequency: number;
  /** Users exhibiting pattern */
  userCount: number;
  /** Pattern success rate */
  successRate: number;
  /** Pattern insights */
  insights: string[];
}

/**
 * User behavior profile
 */
export interface UserBehaviorProfile {
  /** User identifier */
  userId: EntityId;
  /** Most frequent actions */
  topActions: ActionFrequencyItem[];
  /** Preferred interaction times */
  preferredTimes: number[];
  /** Usage patterns */
  patterns: ActionPattern[];
  /** Engagement score */
  engagementScore: number;
  /** Churn risk score */
  churnRisk: number;
  /** Behavioral segments */
  segments: string[];
}

/**
 * Action frequency item
 */
export interface ActionFrequencyItem {
  /** Action type */
  actionType: UserActionType;
  /** Frequency count */
  count: number;
  /** Success rate for this action */
  successRate: number;
  /** Last performed */
  lastPerformed: Date;
}

/**
 * User Action Handler interface
 */
export interface UserActionHandler {
  /** Reference to underlying event bus */
  readonly eventBus: EventBus;

  // Action Tracking Methods

  /**
   * Track user action
   * @param actionData - Action data to track
   * @returns Promise resolving to publish result
   */
  trackAction(actionData: EnhancedUserActionData): Promise<EventPublishResult>;

  /**
   * Track multiple actions as a batch
   * @param actions - Array of actions to track
   * @returns Promise resolving to publish results
   */
  trackActionBatch(actions: EnhancedUserActionData[]): Promise<EventPublishResult[]>;

  /**
   * Track action with automatic context capture
   * @param userId - User identifier
   * @param actionType - Type of action
   * @param payload - Action payload
   * @param result - Action result
   * @returns Promise resolving to publish result
   */
  trackUserAction(
    userId: EntityId,
    actionType: UserActionType,
    payload: any,
    result: ActionResult
  ): Promise<EventPublishResult>;

  /**
   * Start action timing (for duration tracking)
   * @param userId - User identifier  
   * @param actionType - Action type
   * @returns Action timer identifier
   */
  startActionTimer(userId: EntityId, actionType: UserActionType): EntityId;

  /**
   * End action timing and track
   * @param timerId - Timer identifier from startActionTimer
   * @param payload - Action payload
   * @param result - Action result
   * @returns Promise resolving to publish result
   */
  endActionTimer(
    timerId: EntityId,
    payload: any,
    result: ActionResult
  ): Promise<EventPublishResult>;

  // Subscription Methods

  /**
   * Subscribe to user actions
   * @param userId - User to monitor (optional, for all users if not specified)
   * @param handler - Action event handler
   * @param actionTypes - Optional filter by action types
   * @returns Promise resolving to subscription result
   */
  subscribeToUserActions(
    userId: EntityId | null,
    handler: EventHandler<EnhancedUserActionData>,
    actionTypes?: UserActionType[]
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to action patterns
   * @param patterns - Patterns to monitor
   * @param handler - Pattern event handler
   * @returns Promise resolving to subscription result
   */
  subscribeToActionPatterns(
    patterns: ActionPattern[],
    handler: EventHandler<ActionPattern>
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to action anomalies
   * @param handler - Anomaly event handler
   * @returns Promise resolving to subscription result
   */
  subscribeToActionAnomalies(
    handler: EventHandler<ActionAnomaly>
  ): Promise<SubscriptionResult>;

  // Analytics Methods

  /**
   * Get action analytics for time period
   * @param actionTypes - Action types to analyze
   * @param timeRange - Time range for analysis
   * @param segments - Optional user segments to include
   * @returns Promise resolving to analytics data
   */
  getActionAnalytics(
    actionTypes: UserActionType[],
    timeRange: { start: Date; end: Date },
    segments?: string[]
  ): Promise<ActionAnalytics>;

  /**
   * Get user behavior profile
   * @param userId - User identifier
   * @param timeRange - Time range for profile generation
   * @returns Promise resolving to behavior profile
   */
  getUserBehaviorProfile(
    userId: EntityId,
    timeRange?: { start: Date; end: Date }
  ): Promise<UserBehaviorProfile>;

  /**
   * Get action conversion funnel
   * @param funnelSteps - Funnel step definitions
   * @param timeRange - Time range for analysis
   * @returns Promise resolving to conversion metrics
   */
  getConversionFunnel(
    funnelSteps: FunnelStep[],
    timeRange: { start: Date; end: Date }
  ): Promise<ConversionMetrics>;

  /**
   * Detect action patterns
   * @param userId - User identifier (optional, for all users if not specified)
   * @param minFrequency - Minimum pattern frequency
   * @param timeRange - Time range for pattern detection
   * @returns Promise resolving to detected patterns
   */
  detectActionPatterns(
    userId?: EntityId,
    minFrequency?: number,
    timeRange?: { start: Date; end: Date }
  ): Promise<ActionPattern[]>;

  // Segmentation Methods

  /**
   * Create user segment based on action criteria
   * @param name - Segment name
   * @param criteria - Segmentation criteria
   * @returns Promise resolving to segment data
   */
  createUserSegment(name: string, criteria: SegmentCriteria[]): Promise<UserSegment>;

  /**
   * Get users in segment
   * @param segmentName - Segment name
   * @returns Promise resolving to user IDs in segment
   */
  getUsersInSegment(segmentName: string): Promise<EntityId[]>;

  /**
   * Update user segments (recalculate membership)
   * @returns Promise that resolves when segments are updated
   */
  updateUserSegments(): Promise<void>;

  // Anomaly Detection

  /**
   * Detect action anomalies
   * @param userId - User identifier (optional)
   * @param actionTypes - Action types to monitor
   * @param timeRange - Time range for detection
   * @returns Promise resolving to detected anomalies
   */
  detectAnomalies(
    userId?: EntityId,
    actionTypes?: UserActionType[],
    timeRange?: { start: Date; end: Date }
  ): Promise<ActionAnomaly[]>;

  /**
   * Configure anomaly detection rules
   * @param rules - Anomaly detection rules
   * @returns Promise that resolves when configured
   */
  configureAnomalyDetection(rules: AnomalyDetectionRule[]): Promise<void>;

  // A/B Testing Integration

  /**
   * Track action with A/B test context
   * @param userId - User identifier
   * @param actionType - Action type
   * @param payload - Action payload
   * @param testVariants - Active A/B test variants
   * @returns Promise resolving to publish result
   */
  trackActionWithABTest(
    userId: EntityId,
    actionType: UserActionType,
    payload: any,
    testVariants: Record<string, string>
  ): Promise<EventPublishResult>;

  /**
   * Get A/B test results for actions
   * @param testName - Test name
   * @param actionTypes - Action types to analyze
   * @param timeRange - Time range for analysis
   * @returns Promise resolving to test results
   */
  getABTestResults(
    testName: string,
    actionTypes: UserActionType[],
    timeRange: { start: Date; end: Date }
  ): Promise<ABTestResults>;

  // Personalization

  /**
   * Get personalized action recommendations
   * @param userId - User identifier
   * @param context - Current context
   * @returns Promise resolving to recommended actions
   */
  getActionRecommendations(
    userId: EntityId,
    context: ActionContext
  ): Promise<ActionRecommendation[]>;

  /**
   * Update user action preferences
   * @param userId - User identifier
   * @param preferences - Action preferences
   * @returns Promise that resolves when updated
   */
  updateActionPreferences(
    userId: EntityId,
    preferences: ActionPreferences
  ): Promise<void>;

  // Reporting and Export

  /**
   * Generate action report
   * @param reportConfig - Report configuration
   * @returns Promise resolving to report data
   */
  generateActionReport(reportConfig: ActionReportConfig): Promise<ActionReport>;

  /**
   * Export action data
   * @param exportConfig - Export configuration
   * @returns Promise resolving to export result
   */
  exportActionData(exportConfig: ActionExportConfig): Promise<ActionExportResult>;
}

// Supporting interfaces

export interface ActionAnomaly {
  anomalyId: EntityId;
  userId: EntityId;
  actionType: UserActionType;
  anomalyType: 'frequency' | 'pattern' | 'timing' | 'sequence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  context: Record<string, any>;
}

export interface AnomalyDetectionRule {
  ruleId: EntityId;
  name: string;
  actionType: UserActionType;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface ABTestResults {
  testName: string;
  variants: ABTestVariant[];
  winningVariant?: string;
  confidenceLevel: number;
  statisticalSignificance: boolean;
}

export interface ABTestVariant {
  variantName: string;
  userCount: number;
  actionCount: number;
  conversionRate: number;
  confidenceInterval: [number, number];
}

export interface ActionRecommendation {
  actionType: UserActionType;
  confidence: number;
  reason: string;
  expectedOutcome: string;
  context: Record<string, any>;
}

export interface ActionPreferences {
  userId: EntityId;
  preferredActions: UserActionType[];
  dislikedActions: UserActionType[];
  notificationPreferences: Record<UserActionType, boolean>;
  privacySettings: PrivacySettings;
}

export interface PrivacySettings {
  allowTracking: boolean;
  allowAnalytics: boolean;
  allowPersonalization: boolean;
  dataRetentionDays: number;
}

export interface ActionReportConfig {
  reportType: 'summary' | 'detailed' | 'funnel' | 'cohort';
  actionTypes: UserActionType[];
  timeRange: { start: Date; end: Date };
  segments?: string[];
  format: 'json' | 'csv' | 'pdf';
}

export interface ActionReport {
  reportId: EntityId;
  reportType: string;
  generatedAt: Date;
  data: any;
  summary: ReportSummary;
}

export interface ReportSummary {
  totalActions: number;
  uniqueUsers: number;
  topActions: ActionFrequencyItem[];
  keyInsights: string[];
}

export interface ActionExportConfig {
  actionTypes: UserActionType[];
  timeRange: { start: Date; end: Date };
  userIds?: EntityId[];
  format: 'json' | 'csv' | 'parquet';
  compression?: 'gzip' | 'bzip2';
  includePersonalData: boolean;
}

export interface ActionExportResult {
  exportId: EntityId;
  status: 'pending' | 'completed' | 'failed';
  downloadUrl?: string;
  recordCount: number;
  fileSizeBytes: number;
  expiresAt: Date;
}

/**
 * User Action Handler factory function
 */
export type UserActionHandlerFactory = (eventBus: EventBus) => UserActionHandler;