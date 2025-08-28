/**
 * Notification Store - Pinia Store for Notification Management
 * Handles toast messages, alerts, and user notifications
 * 
 * @see docs/front-end/03-state-management.md - Store architecture
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { NotificationMessage } from '../types/game';

export const useNotificationStore = defineStore('notification', () => {
  // State - Notification Management
  const messages = ref<NotificationMessage[]>([]);
  const toastQueue = ref<NotificationMessage[]>([]);
  const maxMessages = ref<number>(10);
  const defaultDuration = ref<number>(5000);

  // State - Display Settings
  const showToasts = ref<boolean>(true);
  const position = ref<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const animationDuration = ref<number>(300);
  const pauseOnHover = ref<boolean>(true);

  // State - Internal Timers
  const timers = ref<Map<string, NodeJS.Timeout>>(new Map());

  // Computed Properties
  const visibleMessages = computed(() => 
    messages.value.slice(-maxMessages.value),
  );

  const messagesByPriority = computed(() => 
    [...messages.value].sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }),
  );

  const hasHighPriority = computed(() =>
    messages.value.some(msg => msg.priority === 'high'),
  );

  const unreadCount = computed(() =>
    messages.value.filter(msg => !msg.isRead).length,
  );

  // Actions - Message Management
  function addMessage(
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string,
    options: {
      duration?: number
      priority?: 'low' | 'normal' | 'high'
      persistent?: boolean
      actions?: Array<{ label: string; handler: () => void }>
    } = {},
  ): string {
    const id = generateMessageId();
    const timestamp = Date.now();
    
    const notification: NotificationMessage = {
      id,
      type,
      title,
      message,
      timestamp,
      duration: options.duration ?? defaultDuration.value,
      priority: options.priority ?? 'normal',
      isPersistent: options.persistent ?? false,
      isRead: false,
      actions: options.actions ?? [],
    };

    messages.value.push(notification);

    // Auto-dismiss non-persistent messages
    if (!notification.isPersistent && notification.duration > 0) {
      const timer = setTimeout(() => {
        removeMessage(id);
      }, notification.duration);
      
      timers.value.set(id, timer);
    }

    // Limit total messages
    if (messages.value.length > maxMessages.value * 2) {
      messages.value = messages.value.slice(-maxMessages.value);
    }

    return id;
  }

  function removeMessage(messageId: string): void {
    const index = messages.value.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }

    // Clear timer if exists
    const timer = timers.value.get(messageId);
    if (timer) {
      clearTimeout(timer);
      timers.value.delete(messageId);
    }
  }

  function markAsRead(messageId: string): void {
    const message = messages.value.find(msg => msg.id === messageId);
    if (message) {
      message.isRead = true;
    }
  }

  function markAllAsRead(): void {
    messages.value.forEach(message => {
      message.isRead = true;
    });
  }

  function clearAll(): void {
    // Clear all timers
    timers.value.forEach(timer => clearTimeout(timer));
    timers.value.clear();
    
    // Clear messages
    messages.value = [];
    toastQueue.value = [];
  }

  function clearByType(type: 'info' | 'warning' | 'error' | 'success'): void {
    const toRemove = messages.value.filter(msg => msg.type === type);
    toRemove.forEach(msg => removeMessage(msg.id));
  }

  // Actions - Predefined Message Types
  function showInfo(title: string, message: string, duration?: number): string {
    return addMessage('info', title, message, { duration });
  }

  function showSuccess(title: string, message: string, duration?: number): string {
    return addMessage('success', title, message, { duration });
  }

  function showWarning(title: string, message: string, options: {
    duration?: number
    persistent?: boolean
  } = {}): string {
    return addMessage('warning', title, message, {
      duration: options.duration ?? 8000, // Longer for warnings
      priority: 'high',
      persistent: options.persistent,
    });
  }

  function showError(title: string, message: string, options: {
    persistent?: boolean
    actions?: Array<{ label: string; handler: () => void }>
  } = {}): string {
    return addMessage('error', title, message, {
      duration: 0, // Errors are persistent by default
      priority: 'high',
      persistent: options.persistent ?? true,
      actions: options.actions,
    });
  }

  // Actions - Game-Specific Notifications
  function showPlayerJoined(playerName: string): void {
    showInfo('Player Joined', `${playerName} joined the game`);
  }

  function showPlayerLeft(playerName: string): void {
    showInfo('Player Left', `${playerName} left the game`);
  }

  function showPowerUpCollected(powerUpType: string): void {
    showSuccess('Power-up!', `You collected ${powerUpType.replace('_', ' ')}!`, 2000);
  }

  function showPlayerDied(playerName: string, respawnTime: number): void {
    showWarning(
      'Player Eliminated',
      `${playerName} was eliminated! Respawning in ${respawnTime}s`,
    );
  }

  function showBossPhaseChange(phase: number): void {
    showWarning(
      'Boss Phase Change',
      `Boss entered phase ${phase}!`,
      { duration: 3000 },
    );
  }

  function showGameStarted(): void {
    showSuccess('Game Started', 'Good luck and work together!', 3000);
  }

  function showGameEnded(result: 'victory' | 'defeat'): void {
    if (result === 'victory') {
      showSuccess('Victory!', 'Congratulations! You completed the level!', 0);
    } else {
      showError('Game Over', 'Better luck next time!', { persistent: false });
    }
  }

  function showConnectionLost(): void {
    showError(
      'Connection Lost',
      'Trying to reconnect...',
      {
        persistent: true,
        actions: [
          {
            label: 'Retry',
            handler: () => {
              // TODO: Implement reconnection logic
              console.log('Retrying connection...');
            },
          },
        ],
      },
    );
  }

  function showConnectionRestored(): void {
    showSuccess('Connected', 'Connection restored!', 2000);
  }

  // Actions - Settings and Configuration
  function setPosition(newPosition: typeof position.value): void {
    position.value = newPosition;
    localStorage.setItem('bomberman-notification-position', newPosition);
  }

  function setMaxMessages(max: number): void {
    maxMessages.value = Math.max(1, Math.min(50, max));
    localStorage.setItem('bomberman-max-notifications', max.toString());
  }

  function setDefaultDuration(duration: number): void {
    defaultDuration.value = Math.max(1000, Math.min(30000, duration));
    localStorage.setItem('bomberman-notification-duration', duration.toString());
  }

  function toggleToasts(): void {
    showToasts.value = !showToasts.value;
    localStorage.setItem('bomberman-show-toasts', showToasts.value.toString());
  }

  function setPauseOnHover(enabled: boolean): void {
    pauseOnHover.value = enabled;
    localStorage.setItem('bomberman-notification-pause-hover', enabled.toString());
  }

  // Actions - Timer Management
  function pauseTimer(messageId: string): void {
    const timer = timers.value.get(messageId);
    if (timer) {
      clearTimeout(timer);
      timers.value.delete(messageId);
    }
  }

  function resumeTimer(messageId: string): void {
    const message = messages.value.find(msg => msg.id === messageId);
    if (message && !message.isPersistent && message.duration > 0) {
      const timer = setTimeout(() => {
        removeMessage(messageId);
      }, message.duration);
      
      timers.value.set(messageId, timer);
    }
  }

  // Actions - Persistence
  function loadSettings(): void {
    // TODO: Implement settings loading from localStorage
    const savedPosition = localStorage.getItem('bomberman-notification-position');
    if (savedPosition) {
      position.value = savedPosition as typeof position.value;
    }

    const savedMax = localStorage.getItem('bomberman-max-notifications');
    if (savedMax) {
      maxMessages.value = parseInt(savedMax);
    }

    const savedDuration = localStorage.getItem('bomberman-notification-duration');
    if (savedDuration) {
      defaultDuration.value = parseInt(savedDuration);
    }

    const savedShowToasts = localStorage.getItem('bomberman-show-toasts');
    if (savedShowToasts) {
      showToasts.value = savedShowToasts === 'true';
    }

    const savedPauseOnHover = localStorage.getItem('bomberman-notification-pause-hover');
    if (savedPauseOnHover) {
      pauseOnHover.value = savedPauseOnHover === 'true';
    }
  }

  // Utility Functions
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Return store interface
  return {
    // State
    messages: readonly(messages),
    toastQueue: readonly(toastQueue),
    maxMessages: readonly(maxMessages),
    defaultDuration: readonly(defaultDuration),
    showToasts: readonly(showToasts),
    position: readonly(position),
    animationDuration: readonly(animationDuration),
    pauseOnHover: readonly(pauseOnHover),

    // Computed
    visibleMessages,
    messagesByPriority,
    hasHighPriority,
    unreadCount,

    // Actions - Core
    addMessage,
    removeMessage,
    markAsRead,
    markAllAsRead,
    clearAll,
    clearByType,

    // Actions - Predefined Types
    showInfo,
    showSuccess,
    showWarning,
    showError,

    // Actions - Game-Specific
    showPlayerJoined,
    showPlayerLeft,
    showPowerUpCollected,
    showPlayerDied,
    showBossPhaseChange,
    showGameStarted,
    showGameEnded,
    showConnectionLost,
    showConnectionRestored,

    // Actions - Configuration
    setPosition,
    setMaxMessages,
    setDefaultDuration,
    toggleToasts,
    setPauseOnHover,

    // Actions - Timer Management
    pauseTimer,
    resumeTimer,

    // Actions - Persistence
    loadSettings,
  };
});