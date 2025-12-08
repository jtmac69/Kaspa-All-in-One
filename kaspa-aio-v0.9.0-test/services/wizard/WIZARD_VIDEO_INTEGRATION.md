# Wizard Video Integration Guide

## Overview

This document describes how to integrate video tutorials into the Kaspa All-in-One installation wizard. The integration includes video player components, "Watch Video" buttons throughout the wizard, and automatic video recommendations based on user context.

## Integration Points

### 1. Welcome Step

Add video button after the welcome message:

```html
<div class="welcome-content">
    <h1>Welcome to Kaspa All-in-One</h1>
    <p>Let's get your Kaspa node up and running in just a few steps.</p>
    
    <!-- Video Button -->
    <button class="watch-video-btn" onclick="playVideo('installation-overview')">
        <svg class="video-icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
        </svg>
        Watch Installation Overview (8 min)
    </button>
    
    <p class="video-description">
        New to Kaspa? Watch this quick overview to understand the installation process.
    </p>
</div>
```

### 2. System Check Step

Add Docker installation videos when Docker is not detected:

```html
<div class="system-check-item" id="dockerCheck">
    <div class="check-icon">✗</div>
    <div class="check-content">
        <h3>Docker Not Installed</h3>
        <p>Docker is required to run Kaspa All-in-One.</p>
        
        <!-- OS-specific video buttons -->
        <div class="video-buttons" id="dockerVideoButtons">
            <!-- Populated dynamically based on detected OS -->
        </div>
    </div>
</div>

<script>
// Show appropriate Docker installation video based on OS
function showDockerVideos(os) {
    const container = document.getElementById('dockerVideoButtons');
    const videos = {
        'darwin': {
            id: 'docker-macos',
            title: 'Watch Docker Installation for macOS',
            duration: '4 min'
        },
        'win32': {
            id: 'docker-windows',
            title: 'Watch Docker Installation for Windows',
            duration: '5 min'
        },
        'linux': {
            id: 'docker-linux',
            title: 'Watch Docker Installation for Linux',
            duration: '4 min'
        }
    };
    
    const video = videos[os];
    if (video) {
        container.innerHTML = `
            <button class="watch-video-btn" onclick="playVideo('${video.id}')">
                <svg class="video-icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                ${video.title} (${video.duration})
            </button>
        `;
    }
}
</script>
```

### 3. Profile Selection Step

Add profile selection guide video:

```html
<div class="profile-selection-header">
    <h2>Choose Your Profile</h2>
    <p>Select the profile that best matches your needs and resources.</p>
    
    <!-- Video Button -->
    <button class="watch-video-btn secondary" onclick="playVideo('profile-selection')">
        <svg class="video-icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
        </svg>
        Watch Profile Selection Guide (6 min)
    </button>
</div>
```

### 4. Complete Step

Add post-installation tour video:

```html
<div class="success-content">
    <div class="success-icon">✓</div>
    <h1>Installation Complete!</h1>
    <p>Your Kaspa node is up and running.</p>
    
    <!-- Video Button -->
    <button class="watch-video-btn" onclick="playVideo('post-installation-tour')">
        <svg class="video-icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
        </svg>
        Watch Post-Installation Tour (7 min)
    </button>
    
    <p class="video-description">
        Learn how to use the dashboard and manage your services.
    </p>
</div>
```


## Video Progress Tracking

Track which videos users have watched to provide personalized recommendations:

```javascript
/**
 * Video Progress Tracker
 */
class VideoProgressTracker {
    constructor() {
        this.storageKey = 'kaspa-video-progress';
        this.progress = this.loadProgress();
    }
    
    /**
     * Load progress from localStorage
     */
    loadProgress() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : {
            viewed: [],
            lastViewed: null,
            totalWatchTime: 0
        };
    }
    
    /**
     * Save progress to localStorage
     */
    saveProgress() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    }
    
    /**
     * Mark a video as viewed
     * @param {string} videoId - The ID of the video
     */
    markViewed(videoId) {
        if (!this.progress.viewed.includes(videoId)) {
            this.progress.viewed.push(videoId);
            this.progress.lastViewed = videoId;
            
            // Add video duration to total watch time
            const video = videoTutorials[videoId];
            if (video && video.duration) {
                const [minutes, seconds] = video.duration.split(':').map(Number);
                this.progress.totalWatchTime += (minutes * 60) + (seconds || 0);
            }
            
            this.saveProgress();
            this.updateUI();
        }
    }
    
    /**
     * Check if a video has been viewed
     * @param {string} videoId - The ID of the video
     * @returns {boolean}
     */
    hasViewed(videoId) {
        return this.progress.viewed.includes(videoId);
    }
    
    /**
     * Get completion percentage
     * @returns {number} Percentage of videos watched
     */
    getCompletionPercentage() {
        const total = Object.keys(videoTutorials).length;
        const viewed = this.progress.viewed.length;
        return Math.round((viewed / total) * 100);
    }
    
    /**
     * Get recommended videos based on viewing history
     * @returns {string[]} Array of recommended video IDs
     */
    getRecommendations() {
        const allVideos = Object.keys(videoTutorials);
        const unwatched = allVideos.filter(id => !this.hasViewed(id));
        
        // If user watched installation overview, recommend Docker videos
        if (this.hasViewed('installation-overview') && !this.hasViewed('docker-macos')) {
            return ['docker-macos', 'docker-windows', 'docker-linux'];
        }
        
        // If user watched Docker videos, recommend profile selection
        if (this.hasViewed('docker-macos') || this.hasViewed('docker-windows') || this.hasViewed('docker-linux')) {
            if (!this.hasViewed('profile-selection')) {
                return ['profile-selection'];
            }
        }
        
        // If user watched profile selection, recommend post-installation tour
        if (this.hasViewed('profile-selection') && !this.hasViewed('post-installation-tour')) {
            return ['post-installation-tour'];
        }
        
        // Default: return unwatched videos
        return unwatched.slice(0, 3);
    }
    
    /**
     * Update UI to show video progress
     */
    updateUI() {
        const percentage = this.getCompletionPercentage();
        const progressBar = document.getElementById('videoProgressBar');
        const progressText = document.getElementById('videoProgressText');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${this.progress.viewed.length} of ${Object.keys(videoTutorials).length} videos watched`;
        }
        
        // Update video buttons to show viewed status
        this.progress.viewed.forEach(videoId => {
            const button = document.querySelector(`[onclick="playVideo('${videoId}')"]`);
            if (button && !button.classList.contains('viewed')) {
                button.classList.add('viewed');
                button.innerHTML = `
                    <svg class="video-icon" viewBox="0 0 24 24">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                    ${button.textContent.trim()}
                `;
            }
        });
    }
    
    /**
     * Reset all progress
     */
    reset() {
        this.progress = {
            viewed: [],
            lastViewed: null,
            totalWatchTime: 0
        };
        this.saveProgress();
        this.updateUI();
    }
}

// Initialize tracker
const videoProgressTracker = new VideoProgressTracker();

// Update playVideo function to track progress
const originalPlayVideo = playVideo;
playVideo = function(videoId) {
    originalPlayVideo(videoId);
    videoProgressTracker.markViewed(videoId);
};
```

## Video Progress Widget

Add a progress widget to show video completion:

```html
<div class="video-progress-widget">
    <div class="widget-header">
        <h3>Video Tutorials</h3>
        <span class="progress-percentage" id="videoProgressPercentage">0%</span>
    </div>
    <div class="progress-bar-container">
        <div class="progress-bar" id="videoProgressBar" style="width: 0%"></div>
    </div>
    <p class="progress-text" id="videoProgressText">0 of 6 videos watched</p>
    
    <div class="recommended-videos">
        <h4>Recommended for You</h4>
        <div id="recommendedVideos">
            <!-- Populated dynamically -->
        </div>
    </div>
</div>

<style>
.video-progress-widget {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
}

.widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.widget-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.progress-percentage {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--accent-color);
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    background-color: var(--bg-primary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #49D49D 0%, #70C7BA 100%);
    transition: width 0.5s ease;
}

.progress-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 20px 0;
}

.recommended-videos h4 {
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0 0 10px 0;
}

.watch-video-btn.viewed {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.watch-video-btn.viewed svg {
    fill: white;
}
</style>

<script>
// Update recommended videos
function updateRecommendedVideos() {
    const container = document.getElementById('recommendedVideos');
    const recommendations = videoProgressTracker.getRecommendations();
    
    if (recommendations.length === 0) {
        container.innerHTML = '<p class="no-recommendations">You\'ve watched all videos! 🎉</p>';
        return;
    }
    
    container.innerHTML = recommendations.map(videoId => {
        const video = videoTutorials[videoId];
        return `
            <button class="watch-video-btn secondary" onclick="playVideo('${videoId}')">
                <svg class="video-icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                ${video.title} (${video.duration})
            </button>
        `;
    }).join('');
}

// Update on page load
document.addEventListener('DOMContentLoaded', function() {
    videoProgressTracker.updateUI();
    updateRecommendedVideos();
    
    // Update progress percentage
    const percentage = videoProgressTracker.getCompletionPercentage();
    document.getElementById('videoProgressPercentage').textContent = `${percentage}%`;
});
</script>
```

## Contextual Video Suggestions

Show relevant videos based on user's current step:

```javascript
/**
 * Show contextual video suggestions
 * @param {string} currentStep - The current wizard step
 */
function showContextualVideos(currentStep) {
    const suggestions = {
        'welcome': ['installation-overview'],
        'system-check': ['docker-macos', 'docker-windows', 'docker-linux'],
        'profiles': ['profile-selection'],
        'configure': ['installation-overview'],
        'review': ['installation-overview'],
        'install': ['installation-overview'],
        'complete': ['post-installation-tour']
    };
    
    const videoIds = suggestions[currentStep] || [];
    const container = document.getElementById('contextualVideos');
    
    if (!container || videoIds.length === 0) return;
    
    // Filter out already watched videos
    const unwatched = videoIds.filter(id => !videoProgressTracker.hasViewed(id));
    
    if (unwatched.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    container.innerHTML = `
        <div class="contextual-video-banner">
            <div class="banner-icon">
                <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
            <div class="banner-content">
                <h4>Need Help?</h4>
                <p>Watch a quick video tutorial for this step.</p>
            </div>
            <div class="banner-actions">
                ${unwatched.map(videoId => {
                    const video = videoTutorials[videoId];
                    return `
                        <button class="watch-video-btn compact" onclick="playVideo('${videoId}')">
                            Watch ${video.title}
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Call this function when changing steps
function changeStep(newStep) {
    // ... existing step change logic ...
    showContextualVideos(newStep);
}
```

