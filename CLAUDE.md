# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A cooperative multiplayer Bomberman game built with WebSockets that allows friends to play together in real-time. Players work as a team to complete objectives while avoiding accidental friendly fire. The game features room-based multiplayer, cross-platform support (desktop/mobile browsers), PWA capabilities, and classic 8-bit pixel art graphics.

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

### Frontend
- HTML5 Canvas for game rendering
- WebSocket client for real-time communication
- PWA manifest and service worker
- Responsive design for mobile/desktop

### Backend
- WebSocket server for real-time multiplayer
- Room management system
- Game state synchronization
- Player session handling

### Game Engine
- Client-side rendering with server authority
- Delta compression for network efficiency
- Collision detection and physics
- AI monster behavior

## Development Commands

*To be added once tech stack is chosen (Node.js/Express, Python/Flask, etc.)*

## Key Directories

*Directory structure to be established:*
- `/client/` - Frontend game client
- `/server/` - WebSocket server and game logic
- `/shared/` - Common game constants and utilities
- `/assets/` - 8-bit sprites and audio files
- `/docs/` - Game design and API documentation

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