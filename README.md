# Bomberman: Cooperative Multiplayer Game

A modern web-based implementation of the classic Bomberman game, reimagined for **cooperative multiplayer gameplay** where friends work together to complete objectives while avoiding friendly fire.

## 🎮 Game Concept

### Core Vision
Transform the traditional competitive Bomberman experience into a **cooperative team-based adventure** where players must collaborate to overcome challenges, defeat AI enemies, and achieve shared objectives.

### Key Features

#### **Cooperative Gameplay** 🤝
- **Team-focused mechanics**: Players work together rather than against each other
- **Friendly fire warnings**: System discourages accidental teammate damage
- **Shared objectives**: Victory requires team coordination and cooperation
- **10-second respawn system**: Eliminated players rejoin quickly to maintain team momentum

#### **Dynamic Objectives** 🎯
- **Boss Battles**: Coordinate attacks to defeat powerful AI bosses with multiple phases
- **Exit Gate Discovery**: Systematically explore maze to find hidden exit gates
- **Gate Destruction Consequences**: Accidentally destroying gates spawns monster waves
- **Escalating Difficulty**: Each destroyed gate increases monster power and spawn rates
- **Survival Mode**: If all gates are destroyed, objectives shift to endless survival

#### **Real-time Multiplayer** 🌐
- **WebSocket-based communication**: Low-latency real-time synchronization
- **Room-based sessions**: Create shareable rooms for friends to join
- **Cross-platform compatibility**: Play on desktop and mobile browsers
- **Reconnection support**: Automatic reconnection with state recovery

#### **Mobile-First Design** 📱
- **Progressive Web App (PWA)**: Install as native app on mobile devices
- **Touch controls**: Virtual joystick and haptic feedback for mobile
- **Responsive UI**: Adapts to different screen sizes and orientations
- **Offline capabilities**: Practice mode available without internet connection

#### **Strategic Gameplay Elements** ⚡
- **Power-up system**: Enhance bomb capacity, blast radius, and special abilities
- **AI Monster variety**: Different enemy types with unique behaviors and tactics
- **Minimap navigation**: Strategic overview with fog of war mechanics
- **Environmental destruction**: Destructible mazes that change as you play

## 🏗️ Implementation Architecture

### Technology Stack

#### **Frontend (Client)**
- **Vue.js 3** with Composition API for reactive UI components
- **TypeScript** for type-safe development and better code maintainability
- **HTML5 Canvas** for high-performance 2D game rendering
- **PWA technologies** (Service Workers, Web App Manifest) for native app experience
- **WebSocket client** integrated with unified EventBus system

#### **Backend (Server)**
- **Node.js** with **Koa.js** framework for lightweight, fast server
- **TypeScript** for consistent full-stack type safety
- **Unified EventBus** architecture for maximum code reuse across all event types
- **WebSocket server** with event-driven message routing
- **Specialized event handlers** for games, notifications, user actions, and admin events

#### **Infrastructure**
- **Docker containerization** for consistent deployment environments
- **Redis** for real-time event distribution and pub/sub messaging
- **PostgreSQL** for persistent game data, user statistics, and audit logs
- **Static file serving** directly from Node.js with Koa.js middleware
- **Dual-storage architecture** optimized for both real-time and persistent data

### System Architecture

```mermaid
graph TB
    Client[Vue.js PWA Client<br/>Canvas Renderer<br/>EventBus Integration]
    
    subgraph "Unified Event System"
        Server[UnifiedGameServer<br/>Event Orchestration]
        EventBus[EventBus Core<br/>Pub/Sub Infrastructure]
        GameHandler[GameEventHandler<br/>Real-time Game Events]
        NotifyHandler[NotificationHandler<br/>Multi-channel Delivery]
        ActionHandler[UserActionHandler<br/>Analytics & Tracking]
    end
    
    subgraph "Data Layer"
        Redis[(Redis<br/>Real-time State<br/>Pub/Sub Distribution)]
        PostgreSQL[(PostgreSQL<br/>Persistent Storage<br/>Analytics)]
    end
    
    Client <-->|WebSocket<br/>Event Messages| Server
    Server --> EventBus
    EventBus --> GameHandler
    EventBus --> NotifyHandler  
    EventBus --> ActionHandler
    
    GameHandler <--> Redis
    NotifyHandler <--> Redis
    ActionHandler <--> PostgreSQL
    
    Server --> PostgreSQL
    Client -->|PWA Install| Browser[Browser<br/>Mobile/Desktop]
```

### Core Modules

#### **Unified EventBus System**
- **Universal Event Infrastructure**: Single pub/sub system for all event types
- **Specialized Handlers**: Game events, user notifications, user actions, admin events
- **Event Routing**: Context-aware delivery with filtering and priorities
- **Performance Optimization**: Batching, compression, intelligent caching

#### **GameEventHandler**
- **Real-time Game Events**: Player actions, bomb explosions, power-ups, boss battles
- **State Synchronization**: Authoritative server state with delta updates
- **Team Coordination**: Cooperative gameplay events and friendly fire warnings
- **AI Systems**: Monster behavior, pathfinding, boss mechanics

#### **UserNotificationHandler**
- **Multi-channel Delivery**: In-game, WebSocket, email, push notifications
- **Notification Templates**: Reusable notification formats with variables
- **User Preferences**: Channel preferences, quiet hours, frequency limits
- **Engagement Analytics**: Read receipts, click-through rates, user behavior

#### **UserActionHandler**
- **Comprehensive Tracking**: All user interactions and behavior analysis
- **Analytics Pipeline**: Pattern detection, conversion funnels, A/B testing
- **Personalization**: Action recommendations and user segmentation
- **Anomaly Detection**: Unusual behavior patterns and security monitoring

#### **Progressive Web App**
- **Service Worker**: Asset caching and offline functionality
- **Installation prompts**: Native app installation experience
- **EventBus Integration**: Offline event queuing and synchronization
- **Push notifications**: Real-time game invitations and updates

#### **Admin Dashboard**
- **Real-time Monitoring**: Unified metrics across all event types
- **Event-driven Moderation**: Automated responses to user actions
- **Advanced Analytics**: Cross-system insights and performance metrics
- **Dynamic Configuration**: Real-time system parameter adjustments

## 📖 Project Documentation

Comprehensive documentation is available in the `docs/` directory:

### **Use Cases**
- [`docs/use-cases/gamer.md`](docs/use-cases/gamer.md) - Player user stories and scenarios
- [`docs/use-cases/admin.md`](docs/use-cases/admin.md) - Administrative use cases and workflows

### **System Design**
- [`docs/sequence-diagrams/`](docs/sequence-diagrams/) - Detailed interaction flows with unified EventBus integration
- [`docs/architecture/unified-event-system.md`](docs/architecture/unified-event-system.md) - Complete EventBus architecture documentation
- [`docs/schema/`](docs/schema/) - Complete data models and entity definitions
- [`docs/modules.md`](docs/modules.md) - Module architecture with dual-storage system
- [`docs/tech-stack.md`](docs/tech-stack.md) - Complete technology stack with Redis/PostgreSQL integration

### **Data Models**
- [`docs/schema/game.md`](docs/schema/game.md) - Game state, bombs, power-ups, maze entities
- [`docs/schema/player.md`](docs/schema/player.md) - Player data, abilities, achievements, sessions
- [`docs/schema/room.md`](docs/schema/room.md) - Multiplayer rooms, lobbies, chat systems
- [`docs/schema/monster.md`](docs/schema/monster.md) - AI enemies, bosses, combat mechanics
- [`docs/schema/admin.md`](docs/schema/admin.md) - Administrative users, logs, system configuration
- [`docs/schema/websocket.md`](docs/schema/websocket.md) - Real-time communication protocols

## 🚀 Getting Started

The TypeScript infrastructure and unified event system are now implemented with Docker containerization support.

### Prerequisites
- Node.js 18+ and npm/yarn
- Docker and Docker Compose (for local development)
- Modern web browser with WebSocket and Canvas support

### Development Setup
```bash
# Clone the repository
git clone https://github.com/alexmakeev/bomberman.git
cd bomberman

# Install dependencies
npm install

# Start development environment
docker-compose up -d

# Run development server (with TypeScript compilation)
npm run dev
```

### Development Commands
```bash
# Development  
npm run dev              # Start full development environment (server + client)
npm run dev:server       # Start server with hot reload
npm run dev:client       # Start client development server

# Development Server Management

## Unified Server Management Script
./scripts/start-dev.sh start front    # Start frontend only (port 3000)
./scripts/start-dev.sh start back     # Start backend only (port 8080) 
./scripts/start-dev.sh start full     # Start both servers (recommended)
./scripts/start-dev.sh stop front     # Stop frontend only
./scripts/start-dev.sh stop back      # Stop backend only
./scripts/start-dev.sh stop full      # Stop both servers
./scripts/start-dev.sh status         # Show status of both servers

# Building
npm run build            # Build both server and client for production
npm run build:server     # Build TypeScript server code
npm run build:client     # Build Vue.js client application

# Quality Assurance
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code quality check
npm run lint:fix         # Auto-fix linting issues
npm run test             # Run test suite
npm run test:coverage    # Run tests with coverage

# UI Testing (Playwright)
npm run test:ui          # Run all UI tests using Docker browsers
npm run test:ui:interactive  # Run UI tests in interactive mode

# Docker Operations
npm run docker:build     # Build Docker image
npm run docker:up        # Start all services with Docker Compose
npm run docker:down      # Stop all Docker services
npm run docker:prod      # Start production Docker environment
```

### Development Server Management

The project includes a **unified development server manager** that provides flexible control over frontend, backend, or both servers with proper dependency management.

#### 🎯 Why Use the Unified Server Manager?

- **Flexible Mode Selection**: Choose frontend-only, backend-only, or full environment
- **Automatic Port Management**: Kills conflicting processes before starting
- **Background Operation**: Runs servers in background with proper process management  
- **Unified Status Monitoring**: Always shows status of both servers regardless of mode
- **Docker Integration**: Automatically starts required database services for backend
- **Clean Operations**: Proper stop/start sequence prevents port conflicts

#### 🚀 Server Management Commands

```bash
# Start servers (automatically stops existing processes first)
./scripts/start-dev.sh start front    # Frontend only - for UI development
./scripts/start-dev.sh start back     # Backend only - for API development  
./scripts/start-dev.sh start full     # Both servers - for full development

# Stop servers  
./scripts/start-dev.sh stop front     # Stop frontend only
./scripts/start-dev.sh stop back      # Stop backend only
./scripts/start-dev.sh stop full      # Stop both servers

# Check status (always shows both servers)
./scripts/start-dev.sh status         # Comprehensive status of all services
```

#### 📊 Server Status Output

```bash
$ ./scripts/start-dev-full.sh status
📊 Development Environment Status
--------------------------------

🐳 Docker Services:
NAME                     STATUS                    PORTS
bomberman-postgres       Up 10 hours (healthy)     0.0.0.0:5432->5432/tcp
bomberman-redis          Up 10 hours (healthy)     0.0.0.0:6379->6379/tcp

🗄️  Backend Server (Port 8080):
🟢 Server is running on port 8080
📋 Process details:
  PID  PPID CMD
 1234  5678 npm run dev:server
🌐 URL: http://localhost:8080
✅ Server is responding to requests

🖥️  Frontend Server (Port 3000):
🟢 Server is running on port 3000
📋 Process details:
  PID  PPID CMD
 5678  9012 npm run dev:client
🌐 URL: http://localhost:3000
✅ Server is responding to requests
```

#### ⚠️ Important Notes

- **Flexible Modes**: Use `front` for UI development, `back` for API work, `full` for complete development
- **Port Management**: Frontend runs on port 3000, Backend runs on port 8080
- **Database Dependencies**: Backend modes automatically start PostgreSQL and Redis via Docker
- **Automatic Cleanup**: Script always stops existing processes before starting new ones
- **Background Operation**: Servers run in background, use appropriate `stop` command to terminate
- **Unified Status**: Status command always shows both servers regardless of the mode used
- **Default Mode**: If no mode is specified, `full` is used as default

### UI Testing with Playwright

The project includes comprehensive UI testing using **Playwright with Docker browsers** to ensure cross-platform compatibility while keeping the development environment clean. Tests cover both basic UI functionality and full integration scenarios based on documented use cases.

#### 🎭 Test Architecture

- **Docker-based browsers**: All browsers run in containers to avoid polluting the host OS
- **Multi-browser testing**: Chrome, Firefox, Safari (WebKit) on desktop and mobile
- **Visual regression**: Screenshots and videos captured for debugging
- **Headless by default**: Fast execution with visual feedback when needed
- **Use case driven**: Integration tests implement real user scenarios from sequence diagrams

#### 🚀 Quick Start

```bash
# Start development server (required)
npm run dev:client

# Run basic UI tests
npm run test:ui

# Run integration tests (use cases)
./scripts/test-integration.sh all

# Interactive mode (keeps containers running)
npm run test:ui:interactive
```

#### 📋 Integration Testing

The project includes a dedicated integration test runner for comprehensive use case testing:

```bash
# Test specific use case categories
./scripts/test-integration.sh gamer     # UC-G001, UC-G002, UC-G003 (player flows)
./scripts/test-integration.sh admin     # UC-A001 (admin monitoring)  
./scripts/test-integration.sh system    # WebSocket/Redis integration flows
./scripts/test-integration.sh all       # All integration tests

# Advanced options
./scripts/test-integration.sh gamer --headed           # Run in headed mode
./scripts/test-integration.sh admin --debug            # Debug mode with pauses
./scripts/test-integration.sh system --reporter html   # HTML report output
```

#### 🛠️ Advanced Usage

Use the dedicated script for more control:

```bash
# Run specific browser
./scripts/test-playwright.sh --project "Desktop Chrome"
./scripts/test-playwright.sh --project "Mobile Safari"

# Run specific test file
./scripts/test-playwright.sh --project "Desktop Chrome" basic-ui.test.ts

# Run with debugging
./scripts/test-playwright.sh --debug --project "Desktop Chrome"

# Run all projects with custom settings
./scripts/test-playwright.sh --max-failures 5 --reporter html
```

#### 📊 Available Test Projects

**Basic UI Tests:**
- **Desktop Chrome - Basic UI**: Core UI functionality testing
- **Desktop Firefox - Basic UI**: Cross-browser compatibility
- **Mobile Chrome - Basic UI**: Mobile interface testing  
- **Mobile Safari - Basic UI**: iOS Safari compatibility

**Integration Tests:**
- **Desktop Chrome - Integration Tests**: Complete use case scenarios (UC-G001, UC-G002, UC-G003)
- **Desktop Firefox - Critical Flows**: Cross-browser testing for critical user flows
- **Mobile Chrome - Mobile Flows**: Mobile-specific gameplay and touch interactions
- **Desktop Chrome - Admin Tests**: Administrative dashboard monitoring (UC-A001)
- **Desktop Chrome - System Integration**: WebSocket/Redis event flows and pub/sub testing

#### 🔍 Test Results

After running tests, check these locations:

- `./test-results/`: Screenshots, videos, and traces for failed tests
- `./playwright-report/`: Interactive HTML report with detailed analysis
- Console output: Real-time logging from frontend application

#### 🧪 Test Categories

**Basic UI Tests** (`tests/front-end/basic-ui.test.ts`):
- Application loading and rendering
- Navigation and routing
- Basic user interface interactions
- Cross-browser compatibility

**Game UI Tests** (`tests/front-end/game-ui.test.ts`):
- Game canvas rendering
- Game controls and input handling
- Game state visualization

**Integration Tests** (`tests/front-end/integration/`):
- **UC-G001**: Join Game Room - Complete player joining flow with edge cases
- **UC-G002**: Create Game Room - Room creation and sharing functionality  
- **UC-G003**: Play Cooperative Game - Full gameplay mechanics and cooperation
- **UC-A001**: Monitor Game Rooms - Admin dashboard monitoring and management
- **WebSocket-Redis Integration**: Real-time event system and pub/sub messaging

#### 🐛 Debugging Tips

1. **Check console logs**: Tests capture all browser console output
2. **Review screenshots**: Visual evidence of what actually rendered
3. **Use trace viewer**: Playwright's built-in debugging tools
4. **Run specific tests**: Isolate issues with `--project` and test file filters
5. **Integration test debugging**: Use `--debug` flag for step-by-step execution

```bash
# Debug a specific failing test
./scripts/test-playwright.sh --debug --project "Desktop Chrome" basic-ui.test.ts

# Debug specific integration test
./scripts/test-integration.sh gamer --debug --project "Desktop Chrome"

# View detailed HTML report
npx playwright show-report
```

### Production Deployment
```bash
# Build for production
npm run build

# Deploy with Docker
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🎯 Game Mechanics Deep Dive

### **Cooperative Elements**
- **Team Revival**: Dead players respawn automatically after 10 seconds
- **Shared Resources**: Power-ups benefit the entire team's strategy
- **Communication**: Visual cues and movement patterns for coordination
- **Joint Objectives**: All players must reach exit gate for victory

### **AI Challenge System**
- **Dynamic Difficulty**: Monster strength scales with team performance
- **Behavioral Variety**: Different AI types require different strategies
- **Boss Encounters**: Multi-phase battles requiring team coordination
- **Wave Mechanics**: Gate destruction triggers escalating monster waves

### **Strategic Depth**
- **Risk vs Reward**: Destroying walls may reveal gates or spawn enemies
- **Resource Management**: Limited bombs require tactical placement
- **Map Knowledge**: Learning maze layouts and optimal paths
- **Team Composition**: Different players can specialize in different roles

## 🔒 Security & Privacy

- **Input validation**: All player actions validated server-side
- **Rate limiting**: Prevents spam and abuse
- **Secure communication**: WSS (WebSocket Secure) for encrypted data
- **Privacy-first**: Minimal data collection, GDPR compliant
- **Anti-cheat measures**: Server-authoritative game state

## 📈 Planned Features & Roadmap

### **Phase 1: Core Game** (Current)
- [x] System architecture design
- [x] Documentation and specifications
- [ ] Basic game engine implementation
- [ ] WebSocket multiplayer foundation
- [ ] Simple maze generation and rendering

### **Phase 2: Multiplayer Experience**
- [ ] Room creation and joining
- [ ] Real-time player synchronization
- [ ] Chat system and communication
- [ ] Mobile touch controls
- [ ] PWA installation flow

### **Phase 3: Game Content**
- [ ] AI monster system
- [ ] Boss battles and phases
- [ ] Power-up variety and effects
- [ ] Multiple maze themes and layouts
- [ ] Achievement system

### **Phase 4: Polish & Scale**
- [ ] Admin dashboard and moderation tools
- [ ] Analytics and reporting
- [ ] Performance optimization
- [ ] Load testing and scaling
- [ ] Community features

## 🤝 Contributing

Contributions are welcome! This project is in active development. Please see the documentation in `docs/` for architecture and implementation details.

### **Development Guidelines**
- Follow TypeScript strict mode and type safety
- Use Vue 3 Composition API patterns
- Maintain real-time performance requirements
- Write tests for critical game mechanics
- Follow the established module architecture

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the classic Bomberman series by Hudson Soft
- Built for modern web technologies and cooperative gameplay
- Designed for cross-platform accessibility and mobile-first experience

---

**Ready to bomb some walls and defeat monsters together?** 💣🎮

*This project prioritizes fun, teamwork, and accessibility in a modern web-based gaming experience.*