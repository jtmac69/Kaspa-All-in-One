# Kaspa All-in-One Shared Module

This module contains shared resources and utilities used by both the Installation Wizard and Management Dashboard.

## Structure

- `lib/` - Shared JavaScript modules and utilities
- `styles/` - Shared CSS design system and components

## Modules

- `state-manager.js` - Manages shared installation state
- `port-fallback.js` - Handles Kaspa node connection with port fallback
- `service-detector.js` - Detects Docker container status
- `cross-launch.js` - Manages navigation between Wizard and Dashboard
- `error-display.js` - Unified error handling and display

## Design System

The shared styles provide a consistent visual identity across both services:

- CSS variables for colors, typography, and spacing
- Component styles for buttons, cards, forms, and status indicators
- Kaspa brand colors and design patterns

## Usage

Import shared modules in your service:

```javascript
import { SharedStateManager } from '@kaspa-aio/shared/state-manager';
import { PortFallbackService } from '@kaspa-aio/shared/port-fallback';
```

Import shared styles in your CSS:

```css
@import '@kaspa-aio/shared/styles';
```

## Requirements

This module supports the wizard-dashboard unification requirements:
- Requirements 11.1: Shared resource directory
- Requirements 11.2: Common CSS variables and components