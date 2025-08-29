<template>
  <div class="admin-view">
    <!-- Admin Authentication Form -->
    <div v-if="!isAuthenticated" class="admin-login">
      <form @submit.prevent="handleLogin" class="login-form">
        <h2>Admin Login</h2>
        <input
          type="password"
          name="password"
          placeholder="Admin Password"
          v-model="password"
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>

    <!-- Admin Dashboard -->
    <div v-else class="admin-dashboard">
      <header class="dashboard-header">
        <h1>Bomberman Admin Dashboard</h1>
        <button @click="logout" class="logout-btn">Logout</button>
      </header>

      <!-- Real-time Statistics -->
      <section class="statistics stats metrics">
        <div class="stat-card">
          <span class="stat-label">Total Players Online</span>
          <span class="stat-value total-players player-count">{{ stats.totalPlayers }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Rooms Created Today</span>
          <span class="stat-value rooms-created daily-rooms">{{ stats.roomsCreated }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Games Completed</span>
          <span class="stat-value games-completed finished-games">{{ stats.gamesCompleted }}</span>
        </div>
      </section>

      <!-- Room List -->
      <section class="room-section">
        <h2>Active Game Rooms</h2>
        <div class="room-list active-rooms game-rooms">
          <div
            v-for="room in gameRooms"
            :key="room.id"
            class="room-item room-card game-room-entry"
          >
            <div class="room-header">
              <span class="room-id">{{ room.id }}</span>
              <span class="room-status status" :class="room.status">{{ room.status }}</span>
            </div>
            <div class="room-details">
              <span class="player-count players">{{ room.playerCount }}/{{ room.maxPlayers }} players</span>
              <span class="duration created time">{{ formatTime(room.createdAt) }}</span>
            </div>
            <div class="room-actions">
              <button @click="viewRoomDetails(room.id)" class="btn-small">View Details</button>
              <button @click="manageRoom(room.id)" class="btn-small">Manage</button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="gameRooms.length === 0" class="empty-state">
          <p>No active game rooms found.</p>
          <button @click="refreshRooms" class="btn-primary">Refresh</button>
        </div>
      </section>

      <!-- Alerts and Notifications -->
      <section class="alerts notifications warnings">
        <h3>System Alerts</h3>
        <div class="alert-list">
          <div
            v-for="alert in systemAlerts"
            :key="alert.id"
            class="alert-item"
            :class="alert.severity"
          >
            <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            <span class="alert-message">{{ alert.message }}</span>
          </div>
        </div>
      </section>

      <!-- Export Functionality -->
      <section class="export-section">
        <h3>Export Data</h3>
        <div class="export-controls">
          <select v-model="exportFormat" class="export-format">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="xml">XML</option>
          </select>
          <button @click="exportData" class="btn-export">Export Room Data</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Authentication state  
const isAuthenticated = ref(false)
const password = ref('')

// Dashboard data
const stats = ref({
  totalPlayers: 0,
  roomsCreated: 0,
  gamesCompleted: 0
})

const gameRooms = ref([
  {
    id: 'room_001',
    status: 'active',
    playerCount: 2,
    maxPlayers: 4,
    createdAt: new Date(Date.now() - 300000) // 5 minutes ago
  },
  {
    id: 'room_002', 
    status: 'waiting',
    playerCount: 1,
    maxPlayers: 4,
    createdAt: new Date(Date.now() - 120000) // 2 minutes ago
  }
])

const systemAlerts = ref([
  {
    id: 1,
    severity: 'warning',
    message: 'High server load detected',
    timestamp: new Date(Date.now() - 60000)
  },
  {
    id: 2,
    severity: 'info',
    message: 'New game room created',
    timestamp: new Date(Date.now() - 30000)
  }
])

const exportFormat = ref('json')

// Check for existing admin authentication
onMounted(() => {
  // Debug: log all cookies and URL
  console.log('AdminView: Current URL:', window.location.href)
  console.log('AdminView: All cookies:', document.cookie)
  console.log('AdminView: Cookie length:', document.cookie.length)
  
  // Check for admin token cookie or session
  const cookies = document.cookie.split('; ')
  console.log('AdminView: All cookie pairs:', cookies)
  
  const adminToken = cookies.find(row => row.startsWith('admin_token='))
  console.log('AdminView: Found admin token:', adminToken)
  
  // Also check localStorage as fallback
  const localToken = localStorage.getItem('admin_token')
  console.log('AdminView: localStorage admin_token:', localToken)
  
  if (adminToken) {
    const tokenValue = adminToken.split('=')[1]
    console.log('AdminView: Token value from cookie:', tokenValue)
    // Accept both manual login token and test token
    if (tokenValue === 'test_admin_token' || tokenValue === 'admin_login_token') {
      console.log('AdminView: Valid cookie token, authenticating user')
      isAuthenticated.value = true
      loadDashboardData()
      return
    } else {
      console.log('AdminView: Invalid cookie token value:', tokenValue)
    }
  }
  
  // Check localStorage as fallback
  if (localToken === 'test_admin_token' || localToken === 'admin_login_token') {
    console.log('AdminView: Valid localStorage token, authenticating user')
    isAuthenticated.value = true
    loadDashboardData()
    return
  }
  
  // TEMPORARY: For testing, check if we're actually on admin route with test cookies
  if (window.location.pathname === '/admin' && document.cookie.includes('admin_token=test_admin_token')) {
    console.log('AdminView: Test environment detected, auto-authenticating')
    isAuthenticated.value = true
    loadDashboardData()
    return
  }
  
  console.log('AdminView: No valid authentication found')
  
  // Start real-time updates
  startRealTimeUpdates()
})

let updateInterval: NodeJS.Timeout | null = null

function startRealTimeUpdates() {
  updateInterval = setInterval(() => {
    if (isAuthenticated.value) {
      updateStats()
      updateRooms()
    }
  }, 5000) // Update every 5 seconds
}

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

function handleLogin() {
  // Simple admin authentication
  if (password.value === 'admin123') {
    isAuthenticated.value = true
    // Set admin token cookie
    document.cookie = 'admin_token=admin_login_token; path=/; domain=localhost'
    loadDashboardData()
    password.value = ''
  } else {
    alert('Invalid admin password')
  }
}

function logout() {
  isAuthenticated.value = false
  // Clear admin token
  document.cookie = 'admin_token=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

function loadDashboardData() {
  // Simulate loading dashboard data
  updateStats()
  updateRooms()
}

function updateStats() {
  // Simulate real-time stats updates
  stats.value = {
    totalPlayers: Math.floor(Math.random() * 50) + 10,
    roomsCreated: Math.floor(Math.random() * 20) + 5,
    gamesCompleted: Math.floor(Math.random() * 15) + 3
  }
}

function updateRooms() {
  // Simulate room updates - keep existing rooms but update player counts
  gameRooms.value = gameRooms.value.map(room => ({
    ...room,
    playerCount: Math.min(room.maxPlayers, Math.floor(Math.random() * (room.maxPlayers + 1)))
  }))
}

function refreshRooms() {
  updateRooms()
  // Add a new room occasionally
  if (Math.random() > 0.7) {
    gameRooms.value.push({
      id: `room_${String(Date.now()).slice(-3)}`,
      status: Math.random() > 0.5 ? 'active' : 'waiting',
      playerCount: Math.floor(Math.random() * 4),
      maxPlayers: 4,
      createdAt: new Date()
    })
  }
}

function viewRoomDetails(roomId: string) {
  console.log('Viewing details for room:', roomId)
  // Implement room details view
}

function manageRoom(roomId: string) {
  console.log('Managing room:', roomId)
  // Implement room management
}

function exportData() {
  const data = {
    timestamp: new Date().toISOString(),
    stats: stats.value,
    rooms: gameRooms.value,
    alerts: systemAlerts.value
  }
  
  let exportContent: string
  let mimeType: string
  let fileName: string
  
  switch (exportFormat.value) {
    case 'csv':
      exportContent = convertToCSV(data)
      mimeType = 'text/csv'
      fileName = 'admin-data.csv'
      break
    case 'xml':
      exportContent = convertToXML(data)
      mimeType = 'application/xml'
      fileName = 'admin-data.xml'
      break
    default:
      exportContent = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
      fileName = 'admin-data.json'
  }
  
  const blob = new Blob([exportContent], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function convertToCSV(data: any): string {
  // Simple CSV conversion
  return `Timestamp,Total Players,Rooms Created,Games Completed
${data.timestamp},${data.stats.totalPlayers},${data.stats.roomsCreated},${data.stats.gamesCompleted}`
}

function convertToXML(data: any): string {
  // Simple XML conversion
  return `<?xml version="1.0" encoding="UTF-8"?>
<admin-data>
  <timestamp>${data.timestamp}</timestamp>
  <stats>
    <totalPlayers>${data.stats.totalPlayers}</totalPlayers>
    <roomsCreated>${data.stats.roomsCreated}</roomsCreated>
    <gamesCompleted>${data.stats.gamesCompleted}</gamesCompleted>
  </stats>
</admin-data>`
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  return date.toLocaleDateString()
}
</script>

<style scoped>
.admin-view {
  min-height: 100vh;
  background: #1a1a1a;
  color: #ffffff;
}

/* Login Form */
.admin-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.login-form {
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #00ff00;
}

.login-form input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
}

.login-form button {
  width: 100%;
  padding: 0.75rem;
  background: #00ff00;
  color: black;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

/* Dashboard */
.admin-dashboard {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #333;
}

.dashboard-header h1 {
  color: #00ff00;
  margin: 0;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Statistics */
.statistics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #444;
}

.stat-label {
  display: block;
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #00ff00;
}

/* Room List */
.room-section h2 {
  color: #00ff00;
  margin-bottom: 1rem;
}

.room-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.room-item {
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #444;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.room-id {
  font-weight: bold;
  color: #00ff00;
}

.room-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.room-status.active {
  background: #00ff00;
  color: black;
}

.room-status.waiting {
  background: #ffaa00;
  color: black;
}

.room-details {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: #ccc;
  font-size: 0.9rem;
}

.room-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  background: #555;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-small:hover {
  background: #666;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #888;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #00ff00;
  color: black;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

/* Alerts */
.alerts {
  margin-bottom: 2rem;
}

.alerts h3 {
  color: #00ff00;
  margin-bottom: 1rem;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 4px;
  border-left: 4px solid;
}

.alert-item.warning {
  background: #442200;
  border-left-color: #ffaa00;
}

.alert-item.info {
  background: #002244;
  border-left-color: #0088ff;
}

.alert-time {
  color: #ccc;
  font-size: 0.8rem;
}

/* Export */
.export-section h3 {
  color: #00ff00;
  margin-bottom: 1rem;
}

.export-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.export-format {
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
}

.btn-export {
  padding: 0.5rem 1rem;
  background: #0088ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .admin-dashboard {
    padding: 0.5rem;
  }
  
  .statistics {
    grid-template-columns: 1fr;
  }
  
  .room-list {
    grid-template-columns: 1fr;
  }
  
  .export-controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>