/**
 * Network Utility Functions
 * WebSocket communication and message handling for multiplayer gameplay
 * 
 * @see docs/front-end/01-architecture-overview.md - Network layer
 */

import type { WebSocketMessage, NetworkState, Player, GameAction } from '../types/game'

// WebSocket Connection Management
export interface WebSocketManager {
  socket: WebSocket | null
  state: NetworkState
  messageQueue: WebSocketMessage[]
  reconnectTimer: NodeJS.Timeout | null
  heartbeatTimer: NodeJS.Timeout | null
  onMessage: (message: WebSocketMessage) => void
  onConnectionChange: (connected: boolean) => void
  onLatencyUpdate: (latency: number) => void
}

export function createWebSocketManager(): WebSocketManager {
  return {
    socket: null,
    state: {
      isConnected: false,
      reconnectAttempts: 0,
      lastHeartbeat: 0,
      latency: 0
    },
    messageQueue: [],
    reconnectTimer: null,
    heartbeatTimer: null,
    onMessage: () => {},
    onConnectionChange: () => {},
    onLatencyUpdate: () => {}
  }
}

export function connectWebSocket(
  manager: WebSocketManager,
  url: string,
  protocols?: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      manager.socket = new WebSocket(url, protocols)
      
      manager.socket.onopen = () => {
        manager.state.isConnected = true
        manager.state.reconnectAttempts = 0
        manager.onConnectionChange(true)
        
        // Start heartbeat
        startHeartbeat(manager)
        
        // Send queued messages
        flushMessageQueue(manager)
        
        resolve()
      }
      
      manager.socket.onclose = (event) => {
        manager.state.isConnected = false
        manager.onConnectionChange(false)
        stopHeartbeat(manager)
        
        // Auto-reconnect if not a clean close
        if (!event.wasClean && manager.state.reconnectAttempts < 5) {
          scheduleReconnect(manager, url, protocols)
        }
      }
      
      manager.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }
      
      manager.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleIncomingMessage(manager, message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
    } catch (error) {
      reject(error)
    }
  })
}

export function disconnectWebSocket(manager: WebSocketManager): void {
  if (manager.socket) {
    manager.socket.close(1000, 'Client disconnect')
  }
  
  stopHeartbeat(manager)
  
  if (manager.reconnectTimer) {
    clearTimeout(manager.reconnectTimer)
    manager.reconnectTimer = null
  }
}

export function sendMessage(manager: WebSocketManager, message: WebSocketMessage): boolean {
  if (manager.state.isConnected && manager.socket) {
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      }
      
      manager.socket.send(JSON.stringify(messageWithTimestamp))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      
      // Queue message for retry
      manager.messageQueue.push(message)
      return false
    }
  } else {
    // Queue message for when connection is restored
    manager.messageQueue.push(message)
    return false
  }
}

function handleIncomingMessage(manager: WebSocketManager, message: WebSocketMessage): void {
  // Handle heartbeat responses
  if (message.type === 'heartbeat_response') {
    const latency = Date.now() - manager.state.lastHeartbeat
    manager.state.latency = latency
    manager.onLatencyUpdate(latency)
    return
  }
  
  // Pass message to application handler
  manager.onMessage(message)
}

function startHeartbeat(manager: WebSocketManager): void {
  manager.heartbeatTimer = setInterval(() => {
    if (manager.state.isConnected) {
      manager.state.lastHeartbeat = Date.now()
      sendMessage(manager, { type: 'heartbeat', data: {} })
    }
  }, 30000) // 30 seconds
}

function stopHeartbeat(manager: WebSocketManager): void {
  if (manager.heartbeatTimer) {
    clearInterval(manager.heartbeatTimer)
    manager.heartbeatTimer = null
  }
}

function scheduleReconnect(
  manager: WebSocketManager,
  url: string,
  protocols?: string[]
): void {
  manager.state.reconnectAttempts++
  
  const delay = Math.min(1000 * Math.pow(2, manager.state.reconnectAttempts), 30000)
  
  manager.reconnectTimer = setTimeout(() => {
    console.log(`Attempting to reconnect (attempt ${manager.state.reconnectAttempts})...`)
    connectWebSocket(manager, url, protocols).catch(() => {
      // Reconnection failed, will try again
    })
  }, delay)
}

function flushMessageQueue(manager: WebSocketManager): void {
  while (manager.messageQueue.length > 0) {
    const message = manager.messageQueue.shift()!
    if (!sendMessage(manager, message)) {
      // Failed to send, put it back at the front
      manager.messageQueue.unshift(message)
      break
    }
  }
}

// Message Creation Helpers
export function createPlayerActionMessage(
  playerId: string,
  roomId: string,
  action: GameAction
): WebSocketMessage {
  return {
    type: 'player_action',
    data: action,
    playerId,
    roomId,
    timestamp: Date.now()
  }
}

export function createJoinRoomMessage(playerId: string, roomId: string, playerName: string): WebSocketMessage {
  return {
    type: 'join_room',
    data: { playerName },
    playerId,
    roomId,
    timestamp: Date.now()
  }
}

export function createLeaveRoomMessage(playerId: string, roomId: string): WebSocketMessage {
  return {
    type: 'leave_room',
    data: {},
    playerId,
    roomId,
    timestamp: Date.now()
  }
}

export function createChatMessage(
  playerId: string,
  roomId: string,
  message: string
): WebSocketMessage {
  return {
    type: 'chat_message',
    data: { message },
    playerId,
    roomId,
    timestamp: Date.now()
  }
}

export function createGameStateRequestMessage(playerId: string, roomId: string): WebSocketMessage {
  return {
    type: 'game_state_request',
    data: {},
    playerId,
    roomId,
    timestamp: Date.now()
  }
}

// Message Validation
export function isValidWebSocketMessage(data: any): data is WebSocketMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.type === 'string' &&
    data.hasOwnProperty('data')
  )
}

export function validatePlayerAction(action: GameAction): boolean {
  if (!action || typeof action !== 'object') return false
  
  const validTypes = ['movement', 'bomb', 'stop']
  if (!validTypes.includes(action.type)) return false
  
  if (action.type === 'movement') {
    const validDirections = ['up', 'down', 'left', 'right']
    return (
      validDirections.includes(action.direction!) &&
      typeof action.intensity === 'number' &&
      action.intensity >= 0 &&
      action.intensity <= 1
    )
  }
  
  return true
}

// Network Quality Detection
export function detectNetworkQuality(latency: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (latency < 50) return 'excellent'
  if (latency < 100) return 'good'
  if (latency < 200) return 'fair'
  return 'poor'
}

export function shouldReduceQuality(latency: number): boolean {
  return latency > 300
}

// Message Batching and Optimization
export interface MessageBatcher {
  messages: WebSocketMessage[]
  batchTimer: NodeJS.Timeout | null
  batchInterval: number
  maxBatchSize: number
}

export function createMessageBatcher(
  batchInterval: number = 16, // ~60fps
  maxBatchSize: number = 10
): MessageBatcher {
  return {
    messages: [],
    batchTimer: null,
    batchInterval,
    maxBatchSize
  }
}

export function addToBatch(
  batcher: MessageBatcher,
  manager: WebSocketManager,
  message: WebSocketMessage
): void {
  batcher.messages.push(message)
  
  // Send immediately if batch is full
  if (batcher.messages.length >= batcher.maxBatchSize) {
    flushBatch(batcher, manager)
    return
  }
  
  // Schedule batch send if not already scheduled
  if (!batcher.batchTimer) {
    batcher.batchTimer = setTimeout(() => {
      flushBatch(batcher, manager)
    }, batcher.batchInterval)
  }
}

export function flushBatch(batcher: MessageBatcher, manager: WebSocketManager): void {
  if (batcher.messages.length === 0) return
  
  if (batcher.messages.length === 1) {
    // Send single message
    sendMessage(manager, batcher.messages[0])
  } else {
    // Send batch message
    const batchMessage: WebSocketMessage = {
      type: 'action_batch',
      data: { actions: batcher.messages },
      timestamp: Date.now()
    }
    sendMessage(manager, batchMessage)
  }
  
  // Clear batch
  batcher.messages = []
  
  if (batcher.batchTimer) {
    clearTimeout(batcher.batchTimer)
    batcher.batchTimer = null
  }
}

// Connection State Management
export function getConnectionStatusText(state: NetworkState): string {
  if (state.isConnected) {
    const quality = detectNetworkQuality(state.latency)
    return `Connected (${state.latency}ms - ${quality})`
  } else if (state.reconnectAttempts > 0) {
    return `Reconnecting... (attempt ${state.reconnectAttempts})`
  } else {
    return 'Disconnected'
  }
}

export function getConnectionStatusColor(state: NetworkState): string {
  if (state.isConnected) {
    const quality = detectNetworkQuality(state.latency)
    switch (quality) {
      case 'excellent': return '#2ECC71'
      case 'good': return '#F39C12'
      case 'fair': return '#E67E22'
      case 'poor': return '#E74C3C'
    }
  }
  return '#95A5A6' // Disconnected
}

// Local Storage for Offline Support
export function saveGameStateToLocal(gameState: any, roomId: string): void {
  try {
    const key = `bomberman_game_state_${roomId}`
    localStorage.setItem(key, JSON.stringify({
      gameState,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.warn('Failed to save game state to localStorage:', error)
  }
}

export function loadGameStateFromLocal(roomId: string): any | null {
  try {
    const key = `bomberman_game_state_${roomId}`
    const saved = localStorage.getItem(key)
    
    if (!saved) return null
    
    const { gameState, timestamp } = JSON.parse(saved)
    
    // Don't use game states older than 5 minutes
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(key)
      return null
    }
    
    return gameState
  } catch (error) {
    console.warn('Failed to load game state from localStorage:', error)
    return null
  }
}

export function clearLocalGameState(roomId: string): void {
  try {
    const key = `bomberman_game_state_${roomId}`
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('Failed to clear local game state:', error)
  }
}

// Error Recovery
export function handleConnectionError(error: any): string {
  if (error instanceof Error) {
    if (error.message.includes('Failed to connect')) {
      return 'Unable to connect to game server. Please check your internet connection.'
    } else if (error.message.includes('timeout')) {
      return 'Connection timeout. The server may be overloaded.'
    } else if (error.message.includes('refused')) {
      return 'Connection refused. The game server may be down for maintenance.'
    }
  }
  
  return 'An unexpected network error occurred. Please try again.'
}

export function shouldAttemptReconnect(error: any): boolean {
  // Don't reconnect for certain permanent errors
  if (error instanceof Error) {
    if (error.message.includes('unauthorized') || 
        error.message.includes('forbidden') ||
        error.message.includes('banned')) {
      return false
    }
  }
  
  return true
}

// URL and Environment Utilities
export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  
  // In development, might use different port
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const port = process.env.WS_PORT || '8080'
    return `${protocol}//${host.split(':')[0]}:${port}/ws`
  }
  
  return `${protocol}//${host}/ws`
}

export function isOnline(): boolean {
  return navigator.onLine
}

export function addOnlineListener(callback: (online: boolean) => void): void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
}

export function removeOnlineListener(callback: (online: boolean) => void): void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
}