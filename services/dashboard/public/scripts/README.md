# Dashboard JavaScript Modules

This directory contains the modular JavaScript architecture for the Kaspa All-in-One Dashboard.

## Structure

```
scripts/
├── dashboard.js          # Main controller (entry point)
└── modules/
    ├── api-client.js     # API communication layer
    ├── websocket-manager.js  # Real-time updates
    └── ui-manager.js     # DOM manipulation & UI updates
```

## Module Overview

### dashboard.js (Main Controller)
**Purpose**: Application coordination and business logic

**Responsibilities**:
- Initialize all modules
- Coordinate data flow between modules
- Handle user interactions
- Manage application lifecycle

**Usage**:
```javascript
// Automatically initialized on page load
// Available globally as window.dashboard
```

### api-client.js
**Purpose**: Centralized API communication

**Features**:
- Request caching (5-second TTL)
- Error handling and retry logic
- Type-safe API methods
- Graceful degradation

**Example**:
```javascript
const api = new APIClient();
const services = await api.getServiceStatus();
const kaspaInfo = await api.getKaspaInfo();
```

### websocket-manager.js
**Purpose**: Real-time bidirectional communication

**Features**:
- Automatic reconnection with exponential backoff
- Event-based message handling
- Connection status tracking
- Max 10 reconnection attempts

**Example**:
```javascript
const ws = new WebSocketManager();
ws.connect();
ws.on('update', (data) => {
    console.log('Received update:', data);
});
```

### ui-manager.js
**Purpose**: DOM manipulation and UI updates

**Features**:
- Element caching for performance
- Service card generation
- Resource visualization
- Modal management
- Notification system

**Example**:
```javascript
const ui = new UIManager();
ui.init();
ui.updateServices(services);
ui.showNotification('Success!', 'success');
```

## Architecture Benefits

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Testability**: Modules can be tested independently
3. **Maintainability**: Easier to locate and fix bugs
4. **Reusability**: Modules can be reused across different parts of the application
5. **Performance**: Smaller, focused modules load faster

## Event Flow

```
User Interaction
    ↓
dashboard.js (handles event)
    ↓
api-client.js (fetches data)
    ↓
ui-manager.js (updates DOM)
```

```
WebSocket Message
    ↓
websocket-manager.js (receives message)
    ↓
dashboard.js (processes message)
    ↓
ui-manager.js (updates UI)
```

## Migration from Old Structure

The previous monolithic `script.js` (2296 lines) has been refactored into this modular structure:

**Before**:
- Single 2296-line file
- Inline event handlers
- Mixed concerns
- Difficult to test

**After**:
- 4 focused modules (~300-500 lines each)
- Proper event delegation
- Clear separation of concerns
- Easy to test and maintain

## Development Guidelines

### Adding New Features

1. **API Endpoint**: Add method to `api-client.js`
2. **UI Component**: Add method to `ui-manager.js`
3. **Business Logic**: Add method to `dashboard.js`
4. **Real-time Updates**: Add event handler in `websocket-manager.js`

### Code Style

- Use ES6+ features (classes, arrow functions, async/await)
- Use JSDoc comments for public methods
- Handle errors gracefully
- Log errors to console for debugging

### Testing

Each module should be testable independently:

```javascript
// Example test
import { APIClient } from './modules/api-client.js';

describe('APIClient', () => {
    it('should fetch service status', async () => {
        const api = new APIClient();
        const services = await api.getServiceStatus();
        expect(services).toBeArray();
    });
});
```

## Browser Compatibility

- Modern browsers with ES6 module support
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## Security

- No inline event handlers (CSP compliant)
- Input validation in API client
- XSS protection in UI manager
- Secure WebSocket connections (WSS in production)

## Performance

- Request caching reduces API calls
- Element caching reduces DOM queries
- Efficient event delegation
- Lazy loading of non-critical features

## Troubleshooting

### Module not loading
- Check browser console for errors
- Ensure `type="module"` in script tag
- Verify file paths are correct

### WebSocket not connecting
- Check WebSocket URL in console
- Verify backend WebSocket server is running
- Check firewall/proxy settings

### API errors
- Check network tab in browser dev tools
- Verify backend server is running
- Check `.env` configuration

## References

- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
