# Video Integration Example - Practical Implementation

## Quick Start: Adding Videos to Wizard

This document shows exactly how to add the video tutorial system to the existing wizard.

## Step 1: Add Video Player HTML

Add this code before the closing `</body>` tag in `index.html`:

```html
<!-- Video Player Modal -->
<div id="videoPlayerModal" class="modal video-modal" style="display: none;">
    <div class="modal-content video-modal-content">
        <div class="modal-header">
            <h2 id="videoTitle">Video Tutorial</h2>
            <button class="close-button" onclick="closeVideoPlayer()">&times;</button>
        </div>
        <div class="modal-body video-modal-body">
            <!-- Video Container -->
            <div class="video-container">
                <div id="videoPlaceholder" class="video-placeholder">
                    <div class="video-placeholder-content">
                        <svg class="video-icon" viewBox="0 0 24 24" width="80" height="80">
                            <path fill="#49D49D" d="M8 5v14l11-7z"/>
                        </svg>
                        <p>Video will be embedded here</p>
                        <p class="video-note">Videos are hosted on YouTube for optimal streaming</p>
                    </div>
                </div>
                <iframe id="videoPlayer" 
                        class="video-iframe" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        style="display: none;">
                </iframe>
            </div>
            
            <!-- Video Controls -->
            <div class="video-controls">
                <button class="video-control-btn" onclick="toggleTranscript()">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
                    </svg>
                    Show Transcript
                </button>
            </div>
            
            <!-- Transcript Section -->
            <div id="transcriptSection" class="transcript-section" style="display: none;">
                <h3>Video Transcript</h3>
                <div id="transcriptContent" class="transcript-content"></div>
            </div>
            
            <!-- Related Videos -->
            <div class="related-videos">
                <h3>Related Videos</h3>
                <div id="relatedVideosList" class="related-videos-list"></div>
            </div>
        </div>
    </div>
</div>
```

## Step 2: Add Video Player CSS

Add this to `wizard.css`:

```css
/* Video Modal */
.video-modal {
    display: none;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
}

.video-modal-content {
    background-color: var(--bg-primary);
    margin: 2% auto;
    width: 90%;
    max-width: 1200px;
    border-radius: 12px;
}

.video-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 */
    background-color: #000;
    border-radius: 8px 8px 0 0;
}

.video-iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.video-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

.video-placeholder-content {
    text-align: center;
    color: #888;
}

.watch-video-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #49D49D 0%, #70C7BA 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.watch-video-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(73, 212, 157, 0.4);
}

.watch-video-btn svg {
    width: 20px;
    height: 20px;
    fill: white;
}
```

## Step 3: Add Video Player JavaScript

Add this to `wizard.js`:

```javascript
// Video Tutorial Database
const videoTutorials = {
    'installation-overview': {
        title: 'Installation Overview',
        videoId: 'PLACEHOLDER', // Replace with YouTube ID
        duration: '8:30',
        transcript: 'Welcome to Kaspa All-in-One...',
        related: ['docker-macos', 'profile-selection']
    },
    'docker-macos': {
        title: 'Docker Installation for macOS',
        videoId: 'PLACEHOLDER',
        duration: '4:15',
        transcript: 'Installing Docker on macOS...',
        related: ['installation-overview']
    },
    'profile-selection': {
        title: 'Profile Selection Guide',
        videoId: 'PLACEHOLDER',
        duration: '6:30',
        transcript: 'Choosing the right profile...',
        related: ['installation-overview']
    }
};

// Play video
function playVideo(videoId) {
    const video = videoTutorials[videoId];
    if (!video) return;
    
    document.getElementById('videoTitle').textContent = video.title;
    document.getElementById('transcriptContent').textContent = video.transcript;
    document.getElementById('videoPlayerModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Track view
    const viewed = JSON.parse(localStorage.getItem('viewedVideos') || '[]');
    if (!viewed.includes(videoId)) {
        viewed.push(videoId);
        localStorage.setItem('viewedVideos', JSON.stringify(viewed));
    }
}

// Close video player
function closeVideoPlayer() {
    document.getElementById('videoPlayerModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Toggle transcript
function toggleTranscript() {
    const section = document.getElementById('transcriptSection');
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
}

// Close on outside click
window.onclick = function(event) {
    const modal = document.getElementById('videoPlayerModal');
    if (event.target === modal) {
        closeVideoPlayer();
    }
};
```

## Step 4: Add Video Buttons to Wizard Steps

### Welcome Step

```html
<div class="step-content" id="step-welcome">
    <h1>Welcome to Kaspa All-in-One</h1>
    <p>Let's get your Kaspa node up and running.</p>
    
    <!-- Add this video button -->
    <button class="watch-video-btn" onclick="playVideo('installation-overview')">
        <svg viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
        </svg>
        Watch Installation Overview (8 min)
    </button>
    
    <button class="btn-primary" onclick="nextStep()">Get Started</button>
</div>
```

### System Check Step (when Docker not found)

```javascript
// In your system check function
function checkDocker() {
    fetch('/api/system-check/docker')
        .then(res => res.json())
        .then(data => {
            if (!data.installed) {
                // Show Docker installation video based on OS
                const os = data.os;
                const videoId = os === 'darwin' ? 'docker-macos' : 
                               os === 'win32' ? 'docker-windows' : 
                               'docker-linux';
                
                showDockerVideoButton(videoId);
            }
        });
}

function showDockerVideoButton(videoId) {
    const video = videoTutorials[videoId];
    const container = document.getElementById('dockerCheckResult');
    container.innerHTML += `
        <button class="watch-video-btn" onclick="playVideo('${videoId}')">
            <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
            </svg>
            ${video.title} (${video.duration})
        </button>
    `;
}
```

### Profile Selection Step

```html
<div class="step-content" id="step-profiles">
    <h2>Choose Your Profile</h2>
    <p>Select the profile that matches your needs.</p>
    
    <!-- Add this video button -->
    <button class="watch-video-btn secondary" onclick="playVideo('profile-selection')">
        <svg viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
        </svg>
        Watch Profile Selection Guide (6 min)
    </button>
    
    <!-- Profile cards here -->
</div>
```

## Step 5: Test the Integration

1. **Open wizard in browser**
   ```bash
   cd services/wizard/frontend/public
   python3 -m http.server 3000
   ```

2. **Navigate to http://localhost:3000**

3. **Test video buttons**
   - Click "Watch Installation Overview"
   - Verify modal opens
   - Verify placeholder shows
   - Click close button
   - Verify modal closes

4. **Test progress tracking**
   - Open browser console
   - Type: `localStorage.getItem('viewedVideos')`
   - Should show array of viewed video IDs

## Step 6: Replace Placeholders with Real Videos

Once videos are uploaded to YouTube:

```javascript
const videoTutorials = {
    'installation-overview': {
        title: 'Installation Overview',
        videoId: 'dQw4w9WgXcQ', // Replace with real YouTube ID
        duration: '8:30',
        transcript: '...',
        related: ['docker-macos', 'profile-selection']
    },
    // ... update all videos
};

// Update playVideo function to load YouTube video
function playVideo(videoId) {
    const video = videoTutorials[videoId];
    if (!video) return;
    
    // Load YouTube video
    const iframe = document.getElementById('videoPlayer');
    iframe.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
    iframe.style.display = 'block';
    
    // Hide placeholder
    document.getElementById('videoPlaceholder').style.display = 'none';
    
    // ... rest of function
}
```

## Complete Example: Welcome Step with Video

Here's a complete example of the Welcome step with video integration:

```html
<!-- Welcome Step -->
<div class="step-content active" id="step-welcome">
    <div class="welcome-header">
        <img src="/assets/brand/logos/svg/kaspa-logo-light.svg" 
             alt="Kaspa Logo" 
             class="welcome-logo">
        <h1>Welcome to Kaspa All-in-One</h1>
    </div>
    
    <div class="welcome-body">
        <p class="welcome-intro">
            Let's get your Kaspa blockchain node up and running in just a few simple steps.
        </p>
        
        <div class="welcome-features">
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span>Easy installation with guided wizard</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span>Multiple profiles for different use cases</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span>Automatic configuration and setup</span>
            </div>
        </div>
        
        <!-- Video Section -->
        <div class="welcome-video-section">
            <h3>New to Kaspa?</h3>
            <p>Watch this quick overview to understand the installation process.</p>
            
            <button class="watch-video-btn" onclick="playVideo('installation-overview')">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="white" d="M8 5v14l11-7z"/>
                </svg>
                Watch Installation Overview (8 min)
            </button>
            
            <p class="video-note">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                Optional but recommended for first-time users
            </p>
        </div>
    </div>
    
    <div class="welcome-actions">
        <button class="btn-primary" onclick="nextStep()">
            Get Started
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="white" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
        </button>
    </div>
</div>
```

## Troubleshooting

### Video Modal Not Showing
- Check that `videoPlayerModal` element exists
- Verify `display: none` is set initially
- Check JavaScript console for errors

### Video Not Playing
- Verify YouTube video ID is correct
- Check iframe `src` attribute
- Ensure YouTube embed is allowed (no ad blockers)

### Progress Not Saving
- Check localStorage is enabled in browser
- Verify no JavaScript errors
- Check browser console: `localStorage.getItem('viewedVideos')`

## Next Steps

1. ✅ Add video player HTML to wizard
2. ✅ Add video player CSS
3. ✅ Add video player JavaScript
4. ✅ Add video buttons to wizard steps
5. ✅ Test integration locally
6. 📋 Record and upload videos to YouTube
7. 📋 Replace placeholder video IDs
8. 📋 Test with real videos
9. 📋 Deploy to production

---

**Status**: Ready for video production
**Estimated Time**: 2-3 weeks for video production
**Next Action**: Record videos and upload to YouTube
