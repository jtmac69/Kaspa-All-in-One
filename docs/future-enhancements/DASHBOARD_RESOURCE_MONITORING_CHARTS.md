# Dashboard Resource Monitoring Charts Implementation

## Overview
Complete the resource monitoring feature by implementing visual trend charts and per-service resource display that appears when monitoring is enabled.

## Current State

### What's Already Implemented
- ✅ Monitoring toggle button (ON/OFF) with visual feedback
- ✅ Backend ResourceMonitor collects and saves historical data to `services/dashboard/data/resource-history.json`
- ✅ UI sections exist in HTML (`service-resources` and `resource-trends`)
- ✅ Sections show/hide based on monitoring state
- ✅ Backend API endpoint `/api/system/resources` returns current metrics
- ✅ ResourceMonitor has `getPerServiceResources()` method for Docker container stats

### What's Missing
- ⚠️ Trend charts are placeholders (canvas elements exist but no rendering)
- ⚠️ Per-service resource data not fetched or displayed
- ⚠️ No chart library integrated (Chart.js, D3.js, etc.)
- ⚠️ Historical data not loaded from backend

## Implementation Tasks

### Task 1: Integrate Chart Library

**Goal**: Add a charting library to render resource trends visually.

**Recommended Library**: Chart.js (lightweight, easy to use, good for time-series data)

**Steps**:
1. Add Chart.js to the dashboard:
   ```html
   <!-- In services/dashboard/public/index.html, add before closing </body> -->
   <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
   ```

2. Or install via npm:
   ```bash
   cd services/dashboard
   npm install chart.js
   ```

3. Import in dashboard.js:
   ```javascript
   import Chart from 'chart.js/auto';
   ```

### Task 2: Create Backend API for Historical Data

**Goal**: Provide endpoint to fetch historical resource data for charts.

**Implementation**:

Add to `services/dashboard/server.js`:

```javascript
// Get resource history for charts
app.get('/api/system/resources/history', async (req, res) => {
    try {
        const duration = req.query.duration || '1h'; // 1h, 6h, 24h
        const history = await resourceMonitor.getResourceHistory(duration);
        res.json(history);
    } catch (error) {
        const errorResult = errorDisplay.showApiError('/api/system/resources/history', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Get per-service resource usage
app.get('/api/system/resources/services', async (req, res) => {
    try {
        const serviceResources = await resourceMonitor.getPerServiceResources();
        res.json({ services: serviceResources });
    } catch (error) {
        const errorResult = errorDisplay.showApiError('/api/system/resources/services', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});
```

Add to `services/dashboard/lib/ResourceMonitor.js`:

```javascript
async getResourceHistory(duration = '1h') {
    try {
        const historyFile = path.join(__dirname, '../data/resource-history.json');
        
        if (!fs.existsSync(historyFile)) {
            return { timestamps: [], cpu: [], memory: [], disk: [] };
        }
        
        const data = JSON.parse(await fs.readFile(historyFile, 'utf-8'));
        
        // Filter by duration
        const now = Date.now();
        const durationMs = this.parseDuration(duration);
        const cutoff = now - durationMs;
        
        const filtered = data.filter(entry => 
            new Date(entry.timestamp).getTime() > cutoff
        );
        
        // Format for charts
        return {
            timestamps: filtered.map(e => e.timestamp),
            cpu: filtered.map(e => e.cpu),
            memory: filtered.map(e => e.memory),
            disk: filtered.map(e => e.disk)
        };
    } catch (error) {
        console.error('Failed to get resource history:', error);
        return { timestamps: [], cpu: [], memory: [], disk: [] };
    }
}

parseDuration(duration) {
    const units = {
        'h': 3600000,  // hours
        'm': 60000,    // minutes
        'd': 86400000  // days
    };
    
    const match = duration.match(/^(\d+)([hmd])$/);
    if (!match) return 3600000; // default 1 hour
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
}
```

### Task 3: Implement Chart Rendering

**Goal**: Render CPU and memory trend charts using historical data.

**Implementation**:

Add to `services/dashboard/public/scripts/dashboard.js`:

```javascript
/**
 * Load resource history and render charts
 */
async loadResourceHistory() {
    try {
        // Fetch historical data
        const history = await this.api.request('/api/system/resources/history?duration=1h');
        
        if (!history.timestamps || history.timestamps.length === 0) {
            this.ui.showNotification('No historical data available yet. Data will appear as monitoring collects it.', 'info');
            return;
        }
        
        // Render CPU trend chart
        this.renderTrendChart('cpu-trend-chart', {
            label: 'CPU Usage (%)',
            data: history.cpu,
            timestamps: history.timestamps,
            color: 'rgba(52, 152, 219, 0.8)',
            borderColor: 'rgba(52, 152, 219, 1)'
        });
        
        // Render Memory trend chart
        this.renderTrendChart('memory-trend-chart', {
            label: 'Memory Usage (%)',
            data: history.memory,
            timestamps: history.timestamps,
            color: 'rgba(155, 89, 182, 0.8)',
            borderColor: 'rgba(155, 89, 182, 1)'
        });
        
        // Load per-service resources
        await this.loadPerServiceResources();
        
    } catch (error) {
        console.error('Failed to load resource history:', error);
        this.ui.showNotification('Failed to load historical data', 'error');
    }
}

/**
 * Render a trend chart
 */
renderTrendChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (this.charts && this.charts[canvasId]) {
        this.charts[canvasId].destroy();
    }
    
    // Initialize charts object
    if (!this.charts) {
        this.charts = {};
    }
    
    // Create new chart
    this.charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: config.timestamps.map(ts => {
                const date = new Date(ts);
                return date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }),
            datasets: [{
                label: config.label,
                data: config.data,
                backgroundColor: config.color,
                borderColor: config.borderColor,
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

/**
 * Load per-service resource usage
 */
async loadPerServiceResources() {
    try {
        const response = await this.api.request('/api/system/resources/services');
        
        if (response.services && response.services.length > 0) {
            this.ui.renderPerServiceResources(response.services);
        } else {
            const grid = document.getElementById('service-resource-grid');
            if (grid) {
                grid.innerHTML = '<p class="no-data">No service resource data available</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load per-service resources:', error);
    }
}
```

### Task 4: Implement Per-Service Resource Display

**Goal**: Display Docker container resource usage in a grid.

**Implementation**:

Add to `services/dashboard/public/scripts/modules/ui-manager.js`:

```javascript
/**
 * Render per-service resource usage
 */
renderPerServiceResources(services) {
    const grid = document.getElementById('service-resource-grid');
    if (!grid) return;
    
    if (!services || services.length === 0) {
        grid.innerHTML = '<p class="no-data">No service resource data available</p>';
        return;
    }
    
    let html = '';
    
    services.forEach(service => {
        const cpuClass = service.cpuPercent > 80 ? 'high' : service.cpuPercent > 50 ? 'medium' : 'low';
        const memClass = service.memPercent > 80 ? 'high' : service.memPercent > 50 ? 'medium' : 'low';
        
        html += `
            <div class="service-resource-card">
                <div class="service-resource-header">
                    <h4>${service.name}</h4>
                </div>
                <div class="service-resource-stats">
                    <div class="resource-stat">
                        <span class="stat-label">CPU</span>
                        <span class="stat-value ${cpuClass}">${service.cpuPercent}%</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Memory</span>
                        <span class="stat-value ${memClass}">${service.memPercent}%</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Memory Usage</span>
                        <span class="stat-value">${service.memUsage}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Network I/O</span>
                        <span class="stat-value">${service.netIO}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Block I/O</span>
                        <span class="stat-value">${service.blockIO}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}
```

### Task 5: Add CSS Styling

**Goal**: Style the per-service resource cards and charts.

**Implementation**:

Add to `services/dashboard/public/dashboard.css`:

```css
/* Per-Service Resource Cards */
.service-resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
}

.service-resource-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
}

.service-resource-header h4 {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-primary);
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
}

.service-resource-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.resource-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2);
    background: var(--surface-elevated);
    border-radius: var(--radius-md);
}

.stat-label {
    color: var(--text-secondary);
    font-size: var(--text-sm);
}

.stat-value {
    color: var(--text-primary);
    font-weight: var(--font-semibold);
    font-size: var(--text-sm);
}

.stat-value.low {
    color: var(--success);
}

.stat-value.medium {
    color: var(--warning);
}

.stat-value.high {
    color: var(--error);
}

/* Resource Trends */
.resource-trends {
    margin-top: var(--space-6);
    padding: var(--space-4);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
}

.trend-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
}

.trend-charts canvas {
    max-height: 250px;
}

.no-data {
    text-align: center;
    color: var(--text-secondary);
    padding: var(--space-6);
    font-style: italic;
}
```

### Task 6: Add Periodic Updates

**Goal**: Refresh charts and per-service data periodically when monitoring is active.

**Implementation**:

Add to `services/dashboard/public/scripts/dashboard.js`:

```javascript
/**
 * Start resource monitoring refresh
 */
startResourceMonitoringRefresh() {
    // Clear existing interval if any
    if (this.resourceMonitoringInterval) {
        clearInterval(this.resourceMonitoringInterval);
    }
    
    // Refresh every 30 seconds
    this.resourceMonitoringInterval = setInterval(async () => {
        const monitoringBtn = document.getElementById('monitoring-status');
        const isMonitoringOn = monitoringBtn && monitoringBtn.textContent.includes('On');
        
        if (isMonitoringOn) {
            await this.loadResourceHistory();
        }
    }, 30000); // 30 seconds
}

// Update destroy method to clear this interval
destroy() {
    if (this.updateInterval) {
        clearInterval(this.updateInterval);
    }
    if (this.serviceStatusInterval) {
        clearInterval(this.serviceStatusInterval);
    }
    if (this.kaspaInfoInterval) {
        clearInterval(this.kaspaInfoInterval);
    }
    if (this.networkDataInterval) {
        clearInterval(this.networkDataInterval);
    }
    if (this.resourceMonitoringInterval) {
        clearInterval(this.resourceMonitoringInterval);
    }
    this.ws.disconnect();
}
```

## Testing Checklist

After implementation, test the following:

- [ ] Turn monitoring ON - sections appear
- [ ] CPU trend chart renders with historical data
- [ ] Memory trend chart renders with historical data
- [ ] Per-service resource cards display for each Docker container
- [ ] Charts update every 30 seconds with new data
- [ ] Turn monitoring OFF - sections disappear
- [ ] Charts are destroyed when monitoring is turned off
- [ ] No console errors
- [ ] Responsive design works on mobile/tablet
- [ ] Historical data persists across dashboard restarts

## Files to Modify

1. `services/dashboard/public/index.html` - Add Chart.js script
2. `services/dashboard/server.js` - Add history and per-service endpoints
3. `services/dashboard/lib/ResourceMonitor.js` - Add getResourceHistory method
4. `services/dashboard/public/scripts/dashboard.js` - Add chart rendering logic
5. `services/dashboard/public/scripts/modules/ui-manager.js` - Add per-service rendering
6. `services/dashboard/public/dashboard.css` - Add styling for charts and cards

## Expected User Experience

1. User clicks "Monitoring: Off" button → changes to "Monitoring: On"
2. Two new sections appear below resource cards:
   - **Per-Service Resource Usage**: Grid of cards showing each container's resource usage
   - **Resource Trends (Last Hour)**: Two line charts showing CPU and memory trends
3. Charts update automatically every 30 seconds
4. User can see resource patterns and identify which services are consuming resources
5. User clicks "Monitoring: On" → changes to "Monitoring: Off", sections disappear

## Estimated Effort

- Chart.js integration: 1-2 hours
- Backend API endpoints: 1 hour
- Chart rendering logic: 2-3 hours
- Per-service display: 1-2 hours
- CSS styling: 1 hour
- Testing and refinement: 2 hours

**Total: 8-11 hours**

## Priority

**Medium** - The monitoring toggle works and shows/hides sections. This enhancement adds the visual data display that makes the feature fully functional and useful for users.

## Dependencies

- Chart.js library (or alternative charting library)
- Existing ResourceMonitor infrastructure (already in place)
- Historical data collection (already working)

## Notes

- Consider adding duration selector (1h, 6h, 24h) for trend charts
- Could add export functionality to download historical data as CSV
- Consider adding threshold lines on charts to show warning/critical levels
- May want to add zoom/pan functionality for longer time ranges
