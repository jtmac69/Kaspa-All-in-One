# Video Tutorials Quick Reference

## Available Videos

### 1. Installation Overview (8-10 min)
**ID**: `installation-overview`
**When to Watch**: Before starting installation
**Covers**:
- System requirements
- Installation process overview
- Time expectations
- Common issues
- Post-installation steps

**Watch if you**:
- Are new to Kaspa All-in-One
- Want to understand the full process
- Need to know time requirements

### 2. Docker Installation for macOS (3-5 min)
**ID**: `docker-macos`
**When to Watch**: When Docker check fails on macOS
**Covers**:
- Downloading Docker Desktop
- Apple Silicon vs Intel selection
- Installation process
- Verification steps
- Troubleshooting

**Watch if you**:
- Need to install Docker on macOS
- Have M1/M2/M3 or Intel Mac
- See "Docker not installed" error

### 3. Docker Installation for Windows (3-5 min)
**ID**: `docker-windows`
**When to Watch**: When Docker check fails on Windows
**Covers**:
- WSL2 installation
- Docker Desktop installation
- Virtualization setup
- Verification steps
- Troubleshooting

**Watch if you**:
- Need to install Docker on Windows
- Need to set up WSL2
- See "Docker not installed" error

### 4. Docker Installation for Linux (3-5 min)
**ID**: `docker-linux`
**When to Watch**: When Docker check fails on Linux
**Covers**:
- Ubuntu/Debian installation
- Fedora/CentOS installation
- Service setup
- User permissions
- Verification steps

**Watch if you**:
- Need to install Docker on Linux
- See "Docker not installed" error
- Have permission issues

### 5. Profile Selection Guide (5-7 min)
**ID**: `profile-selection`
**When to Watch**: At profile selection step
**Covers**:
- All 6 profiles explained
- Resource requirements
- Compatibility ratings
- "Help Me Choose" quiz
- Remote node option

**Watch if you**:
- Don't know which profile to choose
- Want to understand profile differences
- Need resource requirement details

### 6. Post-Installation Tour (6-8 min)
**ID**: `post-installation-tour`
**When to Watch**: After installation completes
**Covers**:
- Dashboard overview
- Service management
- Resource monitoring
- Application access
- Updates and maintenance

**Watch if you**:
- Installation just completed
- Want to learn dashboard features
- Need to know next steps

## How to Use Videos

### Playing a Video
```javascript
// In wizard JavaScript
playVideo('installation-overview');
```

### Checking if Watched
```javascript
// Check if user watched a video
if (videoProgressTracker.hasViewed('installation-overview')) {
    // User has watched this video
}
```

### Getting Recommendations
```javascript
// Get personalized video recommendations
const recommendations = videoProgressTracker.getRecommendations();
```

## Video Player Controls

### Keyboard Shortcuts
- **Space**: Play/Pause
- **F**: Fullscreen
- **Escape**: Close player
- **T**: Toggle transcript
- **S**: Change speed

### Mouse Controls
- **Click timestamp**: Jump to that point in video
- **Click related video**: Play that video
- **Click outside modal**: Close player

## Integration Points

### Welcome Step
```html
<button class="watch-video-btn" onclick="playVideo('installation-overview')">
    Watch Installation Overview
</button>
```

### System Check Step (Docker Not Found)
```javascript
// Show OS-specific Docker video
const os = detectOS();
if (os === 'darwin') {
    showVideoButton('docker-macos');
} else if (os === 'win32') {
    showVideoButton('docker-windows');
} else if (os === 'linux') {
    showVideoButton('docker-linux');
}
```

### Profile Selection Step
```html
<button class="watch-video-btn" onclick="playVideo('profile-selection')">
    Watch Profile Selection Guide
</button>
```

### Complete Step
```html
<button class="watch-video-btn" onclick="playVideo('post-installation-tour')">
    Watch Post-Installation Tour
</button>
```

## Progress Tracking

### View Progress
```javascript
// Get completion percentage
const percentage = videoProgressTracker.getCompletionPercentage();
// Returns: 0-100

// Get viewed count
const viewed = videoProgressTracker.progress.viewed.length;
const total = Object.keys(videoTutorials).length;
```

### Reset Progress
```javascript
// Reset all video progress
videoProgressTracker.reset();
```

## Customization

### Adding New Videos
```javascript
// Add to videoTutorials object
videoTutorials['new-video-id'] = {
    title: 'New Video Title',
    videoId: 'YOUTUBE_VIDEO_ID',
    duration: '5:30',
    transcript: `
[0:00] Introduction...
[0:30] Main content...
    `,
    related: ['related-video-1', 'related-video-2']
};
```

### Styling Video Buttons
```css
/* Primary video button */
.watch-video-btn {
    background: linear-gradient(135deg, #49D49D 0%, #70C7BA 100%);
}

/* Secondary video button */
.watch-video-btn.secondary {
    background: transparent;
    border: 2px solid #49D49D;
    color: #49D49D;
}

/* Compact video button */
.watch-video-btn.compact {
    padding: 8px 16px;
    font-size: 0.9rem;
}

/* Viewed video button */
.watch-video-btn.viewed {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}
```

## Troubleshooting

### Video Won't Play
1. Check internet connection
2. Verify YouTube video ID is correct
3. Check browser console for errors
4. Try different browser

### Transcript Not Showing
1. Verify transcript is in correct format
2. Check for syntax errors in transcript
3. Ensure transcript section is not hidden by CSS

### Progress Not Saving
1. Check localStorage is enabled
2. Verify browser allows localStorage
3. Check for JavaScript errors
4. Try clearing browser cache

### Videos Not Recommended
1. Verify videoProgressTracker is initialized
2. Check recommendation algorithm logic
3. Ensure video IDs match in related arrays

## Best Practices

### For Users
1. **Watch in order**: Start with Installation Overview
2. **Use transcripts**: Read along for better understanding
3. **Pause and practice**: Pause video to try steps yourself
4. **Rewatch as needed**: Videos are always available

### For Developers
1. **Keep scripts updated**: Update when wizard changes
2. **Test on all browsers**: Ensure compatibility
3. **Monitor analytics**: Track which videos help most
4. **Gather feedback**: Ask users about video quality

## Analytics

### Tracked Metrics
- Video views (total and unique)
- Completion rate (% who watch to end)
- Rewatch rate (users watching again)
- Help effectiveness (fewer errors after watching)
- Most popular videos
- Drop-off points (where users stop watching)

### Accessing Analytics
```javascript
// Get video statistics
const stats = {
    totalViews: videoProgressTracker.progress.viewed.length,
    totalWatchTime: videoProgressTracker.progress.totalWatchTime,
    completionRate: videoProgressTracker.getCompletionPercentage(),
    lastViewed: videoProgressTracker.progress.lastViewed
};
```

## Support

### Getting Help
- **Documentation**: See VIDEO_TUTORIALS_GUIDE.md for full details
- **Integration**: See WIZARD_VIDEO_INTEGRATION.md for integration examples
- **Issues**: Report video issues on GitHub
- **Feedback**: Share video feedback in community forum

### Updating Videos
1. Update script in VIDEO_TUTORIALS_GUIDE.md
2. Record new video
3. Upload to YouTube
4. Update video ID in videoTutorials object
5. Test in wizard
6. Deploy update

---

**Last Updated**: November 20, 2025
**Version**: 1.0.0
**Status**: Ready for video production
