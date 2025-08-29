# CLAUDE.md

## Project Overview

A cooperative multiplayer Bomberman game built with a **unified event system architecture** that allows friends to play together in real-time.
Players work as a team to complete objectives while avoiding accidental friendly fire.
The game features an advanced EventBus infrastructure that handles game events, user notifications, user actions, and admin events through a single reusable pub/sub system.
Supports room-based multiplayer, cross-platform play (desktop/mobile browsers), PWA capabilities, and classic 8-bit pixel art graphics.

## Game Features

### Core Gameplay
- Classic Bomberman mechanics with destructible brick mazes
- Bomb power-ups: increased blast radius, more simultaneous bombs
- Cooperative gameplay - friendly fire is discouraged, players work together
- Combat against AI monsters and boss enemies
- 10-second respawn countdown when eliminated
- Respawn at random room corners

### Game Objectives
- **Primary Goal**: Navigate through the maze and complete one of these objectives:
  - Kill the boss enemy
  - Find and reach the exit gates hidden under destructible walls
- **Cooperative Focus**: Players must work together - bombing teammates is a mistake
- **Gate Mechanics**: 
  - Gates can be accidentally destroyed by bombs
  - Destroying gates triggers monster waves
  - Each subsequent gate destruction increases monster power level

### Multiplayer & Rooms
- Room-based multiplayer with unique shareable URLs
- First player creates room, others join via URL
- Real-time synchronization via WebSockets
- Support for multiple concurrent game rooms

### Graphics & UI
- 8-bit pixel art style
- Limited visibility: players see only their immediate area
- Minimap showing all players, maze layout, and monsters
- Mobile-responsive interface

### Platform Support
- Desktop and mobile browser compatibility
- Progressive Web App (PWA) with installation prompts
- Touch controls for mobile devices

## Architecture

### Unified Event System
- **EventBus Core**: Single pub/sub infrastructure for all event types
- **GameEventHandler**: Real-time game events with performance optimization
- **UserNotificationHandler**: Multi-channel delivery with templates and analytics
- **UserActionHandler**: Comprehensive tracking with personalization and anomaly detection
- **UnifiedGameServer**: Orchestrates all event handlers with WebSocket integration

### Frontend
- HTML5 Canvas for game rendering
- WebSocket client integrated with EventBus system
- PWA manifest and service worker with offline event queuing
- Responsive design for mobile/desktop

### Backend
- UnifiedGameServer with event-driven architecture
- Specialized event handlers extending base EventBus
- Dual-storage system: Redis for real-time, PostgreSQL for persistence
- Context-aware auto-subscription system

### Data Storage
- **Redis**: Real-time state, pub/sub messaging, session management
- **PostgreSQL**: Persistent data, analytics, audit logs, user management
- **Dual-storage pipeline**: Automatic conversion from real-time to persistent data

## Key Directories

Current directory structure:
- `/src/types/` - TypeScript type definitions for the unified event system
- `/src/interfaces/core/` - Core interfaces (EventBus, UnifiedGameServer)
- `/src/interfaces/specialized/` - Specialized event handlers
- `/docs/architecture/` - System architecture documentation
- `/docs/sequence-diagrams/` - Updated interaction flows with EventBus integration
- `/docs/schema/` - Data model specifications
- `/docs/` - Comprehensive game design and API documentation
- `/scripts/` - Development and testing shell scripts
@include SCRIPTS.md

## Technical Requirements

### Real-time Features
- WebSocket connections for low-latency gameplay
- Game state synchronization across all clients
- Efficient network protocols for mobile connections

### Mobile Optimization
- Touch-friendly controls
- PWA installation flow
- Offline capability consideration
- Battery optimization

### Game Mechanics
- Bomb explosion algorithms
- Destructible environment system
- Power-up spawn and collection
- Player visibility/fog of war system
- Minimap rendering
- Boss AI and combat system
- Gate discovery and destruction mechanics
- Monster wave spawning system
- Progressive monster power scaling
- Cooperative scoring and objectives

### Security Considerations
- Input validation for game actions
- Anti-cheat measures
- Rate limiting for actions
- Secure room ID generation
- If gates are boomed, and monsters out - gates remain destorted (not usable) until all monsters are boomed.
- Use Vue, Vuex, Node.js, Typescript, koa.js
- IMPORTANT! Claude behaviour: After each step, initiated by the user is completed, do the commit, where at the very beginning put summary of user request for the step (like a title of the comment message) and push it to repo.
- IMPORTANT! when I ask any kind of code/files change - reflect all changes at doc folder files, so, all docs will be up to date.
- instead of commenting unused code - implement stubs, some times it will need to create a new file. In this project we keep types separately from modules code, so, put stabs into ./src/modules and needed module file(s)
- When you write any code try to makec comments with references to docs/schemas/types - behave as you would behave if you know that one day you will not remember what you did and why

## SUPER IMPORTANT CORE RULES
**Reference**: [CORE_RULES.md](CORE_RULES.md) - Critical workflow and development rules that MUST be followed
