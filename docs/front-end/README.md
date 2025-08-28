# Frontend Architecture Documentation

This directory contains comprehensive documentation for the Bomberman game frontend architecture, built with Vue 3, TypeScript, and mobile-first design principles.

## 📁 Documentation Structure

### Core Architecture
- **[01-architecture-overview.md](01-architecture-overview.md)** - High-level frontend architecture and design principles
- **[02-component-structure.md](02-component-structure.md)** - Vue 3 component hierarchy and interfaces
- **[03-state-management.md](03-state-management.md)** - Pinia stores architecture and data flow

### User Experience
- **[04-responsive-design.md](04-responsive-design.md)** - Mobile-first responsive layouts and CSS architecture
- **[05-input-system.md](05-input-system.md)** - Touch controls and unified input handling

## 🎯 Key Features

### Mobile-First Design
- **Touch Controls**: First finger for movement, second finger for bomb placement
- **Responsive Layout**: Adapts to all screen sizes from mobile to desktop
- **PWA Ready**: Progressive Web App capabilities with offline support

### Technical Stack
- **Vue 3** with Composition API and `<script setup>`
- **TypeScript** for type safety and better development experience
- **Pinia** for reactive state management
- **Vitest** for comprehensive testing
- **CSS Custom Properties** for responsive design

### Cross-Platform Support
- **Desktop**: Arrow keys + spacebar controls
- **Mobile**: Touch gestures with haptic feedback
- **Gamepad**: Future support for game controllers

## 🧪 Testing Strategy

All components follow **Test-Driven Development (TDD)**:
- Unit tests for all components and stores
- Integration tests for user interactions
- Performance testing for 60fps gameplay
- Accessibility testing (ARIA, screen readers)

## 🚀 Getting Started

1. **Architecture Overview** - Start with `01-architecture-overview.md` for the big picture
2. **Component Design** - Review `02-component-structure.md` for implementation details
3. **State Management** - Understand data flow in `03-state-management.md`
4. **Responsive Design** - Learn the mobile-first approach in `04-responsive-design.md`
5. **Input Handling** - Master touch controls in `05-input-system.md`

## 🔗 Related Documentation

- **Backend Architecture**: `../architecture/` - Server-side EventBus system
- **Game Design**: `../game-design.md` - Core gameplay mechanics
- **API Documentation**: `../api/` - WebSocket and REST endpoints
- **Testing**: `../../tests/frontend/` - Complete test suites

---

*This architecture supports the cooperative multiplayer Bomberman experience with real-time gameplay, responsive design, and cross-platform compatibility.*