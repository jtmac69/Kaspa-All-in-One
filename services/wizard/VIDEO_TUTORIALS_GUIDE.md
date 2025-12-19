# Video Tutorials and Visual Guides

## Overview

This document provides comprehensive video tutorial scripts, storyboards, and visual guide specifications for the Kaspa All-in-One installation wizard. These resources help non-technical users successfully install and configure the system.

## Video Tutorial Structure

### 1. Installation Overview Video (8-10 minutes)

**Target Audience**: First-time users, non-technical users
**Goal**: Provide confidence and understanding of the installation process

#### Script Outline

**[0:00-0:30] Introduction**
- Welcome message
- What is Kaspa All-in-One?
- What you'll learn in this video

**[0:30-2:00] Before You Start**
- System requirements overview
- What is Docker and why we need it
- Time expectations (setup, download, sync)

**[2:00-4:00] Installation Process**
- Opening the wizard
- System check walkthrough
- Profile selection guidance
- Configuration basics

**[4:00-6:00] Common Issues**
- Docker not installed
- Port conflicts
- Insufficient resources
- How to get help

**[6:00-8:00] Post-Installation**
- Verification steps
- Accessing the dashboard
- Next steps and resources

**[8:00-8:30] Conclusion**
- Summary of key points
- Where to get help
- Community resources


#### Detailed Script

```
[SCENE 1: Title Screen with Kaspa Logo]
NARRATOR: "Welcome to the Kaspa All-in-One installation guide. In the next 8 minutes, 
you'll learn everything you need to get your Kaspa node up and running."

[SCENE 2: Animation showing blockchain network]
NARRATOR: "Kaspa All-in-One is a complete package that lets you run your own Kaspa 
blockchain node, along with applications like messaging, social media, and mining tools. 
Think of it as your personal gateway to the Kaspa network."

[SCENE 3: Split screen showing different user types]
NARRATOR: "Whether you're a developer testing applications, a miner looking to connect 
to the network, or just curious about blockchain technology, this system has you covered."

[SCENE 4: System requirements checklist]
NARRATOR: "Before we begin, let's talk about what you'll need. Your computer should have 
at least 4 gigabytes of RAM, 100 gigabytes of free disk space, and a stable internet 
connection. Don't worry if you're not sure - the wizard will check this for you."

[SCENE 5: Docker logo and explanation]
NARRATOR: "You'll also need Docker installed. Docker is like a virtual container that 
keeps all the Kaspa software organized and separate from your other programs. If you 
don't have it yet, the wizard will show you exactly how to install it for your operating 
system."

[SCENE 6: Timeline showing installation phases]
NARRATOR: "The installation has three main phases. First, setup takes about 5 minutes. 
Then, downloading the software takes 10 to 30 minutes depending on your internet speed. 
Finally, the blockchain needs to sync, which can take several hours to a few days. But 
don't worry - you can use your computer normally while this happens in the background."

[SCENE 7: Browser opening wizard interface]
NARRATOR: "Let's start the installation. Open your web browser and navigate to the 
wizard URL. You'll see a welcome screen with a friendly checklist."

[SCENE 8: System check screen with green checkmarks]
NARRATOR: "The first step is the system check. The wizard automatically detects your 
operating system, checks if Docker is installed, and verifies you have enough resources. 
Green checkmarks mean you're good to go. If you see any red X marks, click on them for 
detailed help."

[SCENE 9: Profile selection cards]
NARRATOR: "Next, choose your profile. Think of profiles as different packages of 
features. The 'Core' profile is perfect for beginners - it gives you just the essential 
Kaspa node and dashboard. The 'Production' profile adds user-facing applications like 
messaging and social media. The 'Explorer' profile includes powerful indexing tools for 
developers."

[SCENE 10: Resource requirements comparison]
NARRATOR: "Each profile shows you exactly what resources it needs. The wizard will 
recommend the best option for your computer. If you're not sure, click 'Help Me Choose' 
for a quick quiz that finds the perfect match."

[SCENE 11: Configuration screen]
NARRATOR: "The configuration step lets you customize settings. For most users, the 
default values work great. Advanced users can adjust ports, memory limits, and other 
options. The wizard explains each setting in plain language."

[SCENE 12: Review screen]
NARRATOR: "Before installation begins, review your choices. You'll see a summary of your 
selected profile, configuration, and estimated resource usage. If everything looks good, 
click 'Start Installation'."

[SCENE 13: Installation progress with phases]
NARRATOR: "During installation, you'll see real-time progress. The wizard shows you 
exactly what's happening at each step - downloading images, starting services, and 
verifying everything works. This is normal and can take 15 to 30 minutes."

[SCENE 14: Common error scenarios]
NARRATOR: "If something goes wrong, don't panic. The wizard detects common issues and 
offers automatic fixes. Port conflicts? It suggests alternative ports. Permission errors? 
It guides you through the fix. Out of memory? It recommends a lighter profile or using a 
remote node."

[SCENE 15: Help dialog]
NARRATOR: "If you need more help, click the 'Get Help' button. You can search common 
issues, generate a diagnostic report to share with support, or visit the community forum 
where experienced users can assist you."

[SCENE 16: Success screen with confetti]
NARRATOR: "Success! When installation completes, you'll see a celebration screen. Take a 
moment to enjoy - you've just set up your own blockchain infrastructure!"

[SCENE 17: Post-installation tour]
NARRATOR: "The wizard offers an interactive tour of your new system. You'll learn how to 
access the dashboard, check service status, and perform common tasks. This tour is 
optional but highly recommended for first-time users."

[SCENE 18: Dashboard overview]
NARRATOR: "The dashboard is your control center. Here you can see all your services, 
check their health, view logs, and manage configurations. Everything is designed to be 
intuitive and user-friendly."

[SCENE 19: Verification checklist]
NARRATOR: "The wizard automatically verifies that all services are running correctly. 
Green checkmarks mean everything is working. If you see any warnings, click them for 
troubleshooting steps."

[SCENE 20: Next steps screen]
NARRATOR: "Now that you're up and running, what's next? The wizard provides links to 
documentation, video tutorials for specific features, and community resources. You can 
also explore the applications included in your profile."

[SCENE 21: Community resources]
NARRATOR: "Remember, you're not alone. The Kaspa community is friendly and helpful. Join 
the Discord server at https://discord.com/invite/ssB46MXzRU, visit the forums, or check out the GitHub repository for updates and 
discussions."

[SCENE 22: Closing screen with key takeaways]
NARRATOR: "Let's recap. You've learned how to check system requirements, choose the 
right profile, configure your installation, and verify everything works. You've also 
learned where to get help if you need it."

[SCENE 23: Thank you screen]
NARRATOR: "Thank you for choosing Kaspa All-in-One. Welcome to the Kaspa network, and 
happy exploring!"

[END SCREEN: Kaspa logo, links to resources]
```


### 2. Docker Installation Videos (3-5 minutes each)

#### 2a. Docker Installation for macOS

**Script Outline**

```
[SCENE 1: macOS desktop]
NARRATOR: "Installing Docker on macOS is straightforward. Let's walk through it step by 
step."

[SCENE 2: Browser opening docker.com]
NARRATOR: "First, open your web browser and go to docker.com. Click on 'Get Docker' and 
select 'Docker Desktop for Mac'."

[SCENE 3: Download page with Apple Silicon vs Intel]
NARRATOR: "Choose the right version for your Mac. If you have an M1, M2, or M3 chip, 
select 'Apple Silicon'. If you have an older Intel Mac, select 'Intel Chip'. Not sure? 
Click the Apple menu, select 'About This Mac', and look at the 'Chip' or 'Processor' 
line."

[SCENE 4: Download progress]
NARRATOR: "The download is about 500 megabytes and takes a few minutes depending on your 
internet speed."

[SCENE 5: Opening the DMG file]
NARRATOR: "Once downloaded, open the DMG file from your Downloads folder. You'll see the 
Docker icon and an Applications folder."

[SCENE 6: Drag and drop animation]
NARRATOR: "Drag the Docker icon into the Applications folder. This installs Docker on 
your Mac."

[SCENE 7: Opening Docker from Applications]
NARRATOR: "Open your Applications folder and double-click Docker. You might see a 
security warning asking if you're sure you want to open it. Click 'Open'."

[SCENE 8: Docker starting up]
NARRATOR: "Docker takes a minute to start up the first time. You'll see a whale icon in 
your menu bar. When it stops animating, Docker is ready."

[SCENE 9: Terminal window]
NARRATOR: "Let's verify Docker is working. Open Terminal from your Applications, 
Utilities folder, or by pressing Command-Space and typing 'Terminal'."

[SCENE 10: Running docker --version]
NARRATOR: "Type 'docker --version' and press Enter. You should see the Docker version 
number. If you do, congratulations - Docker is installed!"

[SCENE 11: Common issues]
NARRATOR: "If you see 'command not found', try restarting your Terminal or your Mac. If 
Docker won't start, make sure you have macOS 11 or later."

[SCENE 12: Next steps]
NARRATOR: "Now you're ready to return to the Kaspa wizard and continue with 
installation. Docker will start automatically whenever you need it."
```

#### 2b. Docker Installation for Windows with WSL2

**Script Outline**

```
[SCENE 1: Windows desktop]
NARRATOR: "Installing Docker on Windows requires Windows Subsystem for Linux, or WSL2. 
Don't worry - we'll guide you through every step."

[SCENE 2: Windows version check]
NARRATOR: "First, make sure you have Windows 10 version 2004 or later, or Windows 11. 
Press Windows key + R, type 'winver', and press Enter to check your version."

[SCENE 3: Opening PowerShell as Administrator]
NARRATOR: "Right-click the Start button and select 'Windows PowerShell (Admin)' or 
'Terminal (Admin)'. Click 'Yes' when asked if you want to allow changes."

[SCENE 4: Installing WSL2]
NARRATOR: "Type 'wsl --install' and press Enter. This installs Windows Subsystem for 
Linux. It takes about 10 minutes and requires a restart."

[SCENE 5: Restart prompt]
NARRATOR: "When prompted, restart your computer. After restarting, WSL2 will finish 
setting up automatically."

[SCENE 6: Ubuntu setup]
NARRATOR: "You'll see an Ubuntu window asking you to create a username and password. 
Choose something you'll remember - you'll need this password for administrative tasks."

[SCENE 7: Browser opening docker.com]
NARRATOR: "Now let's install Docker. Open your web browser and go to docker.com. Click 
'Get Docker' and select 'Docker Desktop for Windows'."

[SCENE 8: Download and install]
NARRATOR: "Download the installer and run it. The installation takes about 5 minutes. 
Make sure 'Use WSL 2 instead of Hyper-V' is checked."

[SCENE 9: Docker starting]
NARRATOR: "After installation, Docker Desktop starts automatically. You'll see a whale 
icon in your system tray. When it stops animating, Docker is ready."

[SCENE 10: Opening PowerShell to verify]
NARRATOR: "Let's verify everything works. Open PowerShell again and type 'docker 
--version'. You should see the Docker version number."

[SCENE 11: WSL integration check]
NARRATOR: "Right-click the Docker icon in your system tray and select 'Settings'. Go to 
'Resources', then 'WSL Integration'. Make sure your Ubuntu distribution is enabled."

[SCENE 12: Common issues]
NARRATOR: "If Docker won't start, make sure virtualization is enabled in your BIOS. 
Restart your computer and press F2, F10, or Delete during startup to access BIOS 
settings. Look for 'Virtualization Technology' or 'VT-x' and enable it."

[SCENE 13: Next steps]
NARRATOR: "You're all set! Return to the Kaspa wizard to continue installation. Docker 
will run in the background whenever you need it."
```

#### 2c. Docker Installation for Linux

**Script Outline**

```
[SCENE 1: Linux desktop with terminal]
NARRATOR: "Installing Docker on Linux is quick and easy using the command line. We'll 
cover Ubuntu, Debian, Fedora, and CentOS."

[SCENE 2: Opening terminal]
NARRATOR: "Open your terminal. You can usually find it in your applications menu or 
press Ctrl+Alt+T."

[SCENE 3: Ubuntu/Debian installation]
NARRATOR: "For Ubuntu or Debian, first update your package list. Type 'sudo apt update' 
and press Enter. Enter your password when prompted."

[SCENE 4: Installing prerequisites]
NARRATOR: "Install prerequisites with 'sudo apt install apt-transport-https ca-
certificates curl software-properties-common'. This ensures secure downloads."

[SCENE 5: Adding Docker repository]
NARRATOR: "Add Docker's official GPG key with 'curl -fsSL https://download.docker.com/
linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.
gpg'."

[SCENE 6: Installing Docker]
NARRATOR: "Add the Docker repository and install with 'sudo apt update' followed by 
'sudo apt install docker-ce docker-ce-cli containerd.io'."

[SCENE 7: Fedora/CentOS installation]
NARRATOR: "For Fedora or CentOS, use 'sudo dnf install dnf-plugins-core' then 'sudo dnf 
config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo' and 
finally 'sudo dnf install docker-ce docker-ce-cli containerd.io'."

[SCENE 8: Starting Docker service]
NARRATOR: "Start Docker with 'sudo systemctl start docker' and enable it to start on 
boot with 'sudo systemctl enable docker'."

[SCENE 9: Adding user to docker group]
NARRATOR: "To use Docker without sudo, add your user to the docker group with 'sudo 
usermod -aG docker $USER'. Log out and log back in for this to take effect."

[SCENE 10: Verifying installation]
NARRATOR: "Verify Docker is working with 'docker --version'. You should see the version 
number."

[SCENE 11: Testing Docker]
NARRATOR: "Test Docker with 'docker run hello-world'. If you see a welcome message, 
Docker is working correctly!"

[SCENE 12: Common issues]
NARRATOR: "If you see permission errors, make sure you logged out and back in after 
adding yourself to the docker group. If Docker won't start, check the service status 
with 'sudo systemctl status docker'."

[SCENE 13: Next steps]
NARRATOR: "Perfect! You're ready to return to the Kaspa wizard and continue with 
installation."
```


### 3. Profile Selection Guide Video (5-7 minutes)

**Script Outline**

```
[SCENE 1: Profile selection screen]
NARRATOR: "Choosing the right profile is key to a successful installation. Let's explore 
each option and find the perfect fit for you."

[SCENE 2: Overview of all profiles]
NARRATOR: "Kaspa All-in-One offers six profiles: Core, Production, Explorer, Archive, 
Mining, and Development. Each profile includes different services and has different 
resource requirements."

[SCENE 3: Core profile card highlighted]
NARRATOR: "The Core profile is perfect for beginners. It includes just the essentials: a 
Kaspa node and a dashboard to monitor it. This is the lightest option, requiring only 4 
gigabytes of RAM and 100 gigabytes of disk space. Choose Core if you want to support the 
Kaspa network or learn about blockchain technology without extra complexity."

[SCENE 4: Production profile card highlighted]
NARRATOR: "The Production profile adds user-facing applications. You get everything in 
Core, plus Kasia messaging, K-Social platform, and the mining stratum bridge. This 
requires 8 gigabytes of RAM and 200 gigabytes of disk space. Choose Production if you 
want to use Kaspa applications or mine Kaspa."

[SCENE 5: Explorer profile card highlighted]
NARRATOR: "The Explorer profile is for developers and data enthusiasts. It includes 
powerful indexing services that process and store blockchain data in a searchable 
database. This requires 16 gigabytes of RAM and 500 gigabytes of disk space. Choose 
Explorer if you're building applications that need to query blockchain data or if you 
want detailed analytics."

[SCENE 6: Archive profile card highlighted]
NARRATOR: "The Archive profile is for long-term data retention. It includes everything 
in Explorer plus a separate archive database that stores historical data indefinitely. 
This requires 32 gigabytes of RAM and 1 terabyte of disk space. Choose Archive if you 
need complete blockchain history or are running a public block explorer."

[SCENE 7: Mining profile card highlighted]
NARRATOR: "The Mining profile is optimized for miners. It includes the Kaspa node with 
mining-specific optimizations and the stratum bridge for connecting mining software. This 
requires 8 gigabytes of RAM and 150 gigabytes of disk space. Choose Mining if your 
primary goal is to mine Kaspa."

[SCENE 8: Development profile card highlighted]
NARRATOR: "The Development profile includes tools for developers. You get everything in 
Core plus Portainer for container management and pgAdmin for database administration. 
This requires 8 gigabytes of RAM and 150 gigabytes of disk space. Choose Development if 
you're contributing to Kaspa projects or testing new features."

[SCENE 9: Resource comparison chart]
NARRATOR: "Let's compare resource requirements. Core is the lightest at 4 gigabytes RAM. 
Production and Mining need 8 gigabytes. Explorer needs 16 gigabytes. Archive needs 32 
gigabytes. The wizard checks your system and recommends compatible profiles."

[SCENE 10: Compatibility ratings]
NARRATOR: "The wizard shows compatibility ratings for each profile. 'Optimal' means your 
system exceeds requirements and will run smoothly. 'Recommended' means you meet 
requirements and should have a good experience. 'Possible' means you meet minimum 
requirements but might experience slowness. 'Not Recommended' means your system doesn't 
meet requirements."

[SCENE 11: Help Me Choose quiz]
NARRATOR: "Not sure which profile to choose? Click 'Help Me Choose' for a quick quiz. 
Answer three simple questions about your goals, and the wizard recommends the best 
profile for you."

[SCENE 12: Quiz question 1 - Primary goal]
NARRATOR: "Question 1: What's your primary goal? Are you learning about blockchain, 
using Kaspa applications, developing software, mining Kaspa, or running a public service? 
Your answer helps narrow down the options."

[SCENE 13: Quiz question 2 - Technical experience]
NARRATOR: "Question 2: What's your technical experience level? Beginner, intermediate, 
or advanced? This helps determine if you need development tools or can handle more 
complex setups."

[SCENE 14: Quiz question 3 - Resource availability]
NARRATOR: "Question 3: What resources does your computer have? The quiz checks your RAM, 
disk space, and CPU to ensure the recommended profile will run well."

[SCENE 15: Quiz results]
NARRATOR: "Based on your answers, the wizard recommends a profile and explains why it's 
a good fit. You can accept the recommendation or choose a different profile if you 
prefer."

[SCENE 16: Remote node option]
NARRATOR: "If your computer doesn't meet requirements for any profile, the wizard offers 
a remote node option. Instead of running the Kaspa node locally, you connect to a public 
node. This dramatically reduces resource requirements while still letting you use Kaspa 
applications."

[SCENE 17: Combining profiles]
NARRATOR: "Advanced users can combine multiple profiles. For example, you might run Core 
and Development together, or Production and Explorer. The wizard calculates combined 
resource requirements and warns you if your system can't handle it."

[SCENE 18: Changing profiles later]
NARRATOR: "Don't worry about making the wrong choice. You can change profiles later 
through the dashboard or by running the wizard again in reconfiguration mode. Your data 
and settings are preserved."

[SCENE 19: Summary and next steps]
NARRATOR: "To summarize: Core for beginners, Production for applications, Explorer for 
developers, Archive for data retention, Mining for miners, and Development for 
contributors. Choose based on your goals and resources, and use the quiz if you need 
help deciding."

[SCENE 20: Closing]
NARRATOR: "Now that you understand the profiles, you're ready to make an informed choice 
and continue with installation. Good luck!"
```


### 4. Post-Installation Tour Video (6-8 minutes)

**Script Outline**

```
[SCENE 1: Success screen]
NARRATOR: "Congratulations! Your Kaspa All-in-One installation is complete. Let's take a 
tour of your new system and learn how to use it effectively."

[SCENE 2: Dashboard overview]
NARRATOR: "The dashboard is your control center. Open your web browser and navigate to 
localhost:3001. You'll see the Kaspa All-in-One dashboard with a clean, intuitive 
interface."

[SCENE 3: Service status section]
NARRATOR: "At the top, you'll see the service status section. Each service shows a green 
checkmark if it's running, a yellow warning if there's an issue, or a red X if it's 
stopped. Click any service to see detailed information."

[SCENE 4: Kaspa node details]
NARRATOR: "Let's look at the Kaspa node. Click on it to see sync status, connected 
peers, and current block height. The sync progress bar shows how much of the blockchain 
has been downloaded. This can take several hours to a few days for the initial sync."

[SCENE 5: Resource monitoring]
NARRATOR: "The resource monitoring section shows CPU usage, memory usage, and disk 
space. These update in real-time so you can see how your system is performing. If any 
resource is running low, you'll see a warning with recommendations."

[SCENE 6: Service logs]
NARRATOR: "The logs section lets you view output from any service. Select a service from 
the dropdown and you'll see its recent log messages. This is helpful for troubleshooting 
or understanding what a service is doing."

[SCENE 7: Configuration management]
NARRATOR: "The configuration tab lets you view and edit your settings. You can change 
ports, adjust memory limits, or modify other options. The dashboard validates your 
changes and warns you if something might cause problems."

[SCENE 8: Service controls]
NARRATOR: "Each service has control buttons: start, stop, and restart. Use these to 
manage services individually. For example, if a service is misbehaving, you can restart 
it without affecting other services."

[SCENE 9: Profile management]
NARRATOR: "The profiles section shows which profiles are currently active. You can 
enable or disable profiles here. When you change profiles, the dashboard automatically 
starts or stops the relevant services."

[SCENE 10: Verification checklist]
NARRATOR: "The verification checklist shows the health of your installation. Green 
checkmarks mean everything is working correctly. If you see warnings, click them for 
troubleshooting steps and solutions."

[SCENE 11: Accessing applications]
NARRATOR: "If you installed the Production profile, you can access applications from the 
dashboard. Click 'Open Kasia' to use the messaging app, or 'Open K-Social' for the 
social platform. These open in new tabs."

[SCENE 12: Kasia messaging app]
NARRATOR: "Kasia lets you send messages on the Kaspa blockchain. Create an account, and 
you can send encrypted messages to other Kaspa users. Your messages are stored on the 
blockchain, making them permanent and censorship-resistant."

[SCENE 13: K-Social platform]
NARRATOR: "K-Social is a decentralized social media platform built on Kaspa. Post 
updates, follow other users, and interact with content. Everything is stored on the 
blockchain, giving you true ownership of your data."

[SCENE 14: Mining setup]
NARRATOR: "If you installed the Mining profile, you can connect mining software to your 
node. The dashboard shows your stratum bridge address and port. Configure your mining 
software to connect to this address, and you're ready to mine."

[SCENE 15: Explorer tools]
NARRATOR: "If you installed the Explorer profile, you have access to powerful indexing 
tools. The dashboard shows indexer status, database size, and query performance. You can 
also access pgAdmin to run custom database queries."

[SCENE 16: Development tools]
NARRATOR: "If you installed the Development profile, you have Portainer for container 
management. Click 'Open Portainer' to see all your Docker containers, images, and 
volumes. This is useful for debugging or advanced configuration."

[SCENE 17: Updates and maintenance]
NARRATOR: "The dashboard checks for updates automatically. When new versions are 
available, you'll see an update notification. Click it to view the changelog and install 
updates with one click. The dashboard backs up your configuration before updating, so you 
can rollback if needed."

[SCENE 18: Backup and restore]
NARRATOR: "The backup section lets you create backups of your configuration and data. 
Schedule automatic backups or create manual backups before making changes. You can 
restore from any backup with one click."

[SCENE 19: Help and documentation]
NARRATOR: "The help section provides access to documentation, video tutorials, and 
community resources. You can also generate diagnostic reports to share with support if 
you encounter issues."

[SCENE 20: Common tasks]
NARRATOR: "Let's review some common tasks. To restart a service, click its restart 
button. To view logs, select the service and click 'View Logs'. To change configuration, 
go to the Configuration tab, make your changes, and click 'Apply'. To update services, 
click the update notification and follow the prompts."

[SCENE 21: Troubleshooting]
NARRATOR: "If something isn't working, start with the verification checklist. It 
identifies common issues and provides solutions. If that doesn't help, check the service 
logs for error messages. You can also generate a diagnostic report and ask for help in 
the community forum."

[SCENE 22: Next steps]
NARRATOR: "Now that you know how to use the dashboard, explore the features included in 
your profile. Try the applications, check out the documentation, and join the community. 
The Kaspa ecosystem is growing rapidly, and you're now part of it!"

[SCENE 23: Closing]
NARRATOR: "Thank you for watching this tour. Enjoy your Kaspa All-in-One system, and 
welcome to the Kaspa network!"
```


## Video Player Component Implementation

### HTML Structure

```html
<!-- Video Player Modal -->
<div id="videoPlayerModal" class="modal video-modal">
    <div class="modal-content video-modal-content">
        <div class="modal-header">
            <h2 id="videoTitle">Video Tutorial</h2>
            <button class="close-button" onclick="closeVideoPlayer()">&times;</button>
        </div>
        <div class="modal-body video-modal-body">
            <!-- Video Player -->
            <div class="video-container">
                <div id="videoPlaceholder" class="video-placeholder">
                    <div class="video-placeholder-content">
                        <svg class="video-icon" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <p>Video will be embedded here</p>
                        <p class="video-note">Videos are hosted on YouTube for optimal streaming</p>
                    </div>
                </div>
                <iframe id="videoPlayer" 
                        class="video-iframe" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            </div>
            
            <!-- Video Controls -->
            <div class="video-controls">
                <button class="video-control-btn" onclick="toggleTranscript()">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
                    </svg>
                    Show Transcript
                </button>
                <button class="video-control-btn" onclick="toggleSpeed()">
                    <svg viewBox="0 0 24 24">
                        <path d="M13 8V2H7v6H2l8 8 8-8h-5zM7 22h10v-2H7v2z"/>
                    </svg>
                    Speed: 1x
                </button>
                <button class="video-control-btn" onclick="toggleFullscreen()">
                    <svg viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                    Fullscreen
                </button>
            </div>
            
            <!-- Transcript Section -->
            <div id="transcriptSection" class="transcript-section" style="display: none;">
                <h3>Video Transcript</h3>
                <div id="transcriptContent" class="transcript-content">
                    <!-- Transcript will be loaded here -->
                </div>
            </div>
            
            <!-- Related Videos -->
            <div class="related-videos">
                <h3>Related Videos</h3>
                <div id="relatedVideosList" class="related-videos-list">
                    <!-- Related videos will be populated here -->
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Watch Video Buttons (placed throughout wizard) -->
<button class="watch-video-btn" onclick="playVideo('installation-overview')">
    <svg class="video-icon" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
    </svg>
    Watch Installation Overview
</button>

<button class="watch-video-btn" onclick="playVideo('docker-macos')">
    <svg class="video-icon" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
    </svg>
    Watch Docker Installation (macOS)
</button>

<button class="watch-video-btn" onclick="playVideo('profile-selection')">
    <svg class="video-icon" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
    </svg>
    Watch Profile Selection Guide
</button>
```

### CSS Styling

```css
/* Video Modal Styles */
.video-modal {
    display: none;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    animation: fadeIn 0.3s ease;
}

.video-modal-content {
    background-color: var(--bg-primary);
    margin: 2% auto;
    width: 90%;
    max-width: 1200px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: slideDown 0.3s ease;
}

.video-modal-body {
    padding: 0;
}

/* Video Container */
.video-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    background-color: #000;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
}

.video-iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
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

.video-icon {
    width: 80px;
    height: 80px;
    fill: #49D49D;
    margin-bottom: 20px;
    opacity: 0.8;
}

.video-note {
    font-size: 0.9rem;
    margin-top: 10px;
    color: #666;
}

/* Video Controls */
.video-controls {
    display: flex;
    gap: 10px;
    padding: 15px 20px;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
}

.video-control-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.video-control-btn:hover {
    background-color: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
}

.video-control-btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
}

/* Transcript Section */
.transcript-section {
    padding: 20px;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    max-height: 400px;
    overflow-y: auto;
}

.transcript-section h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.transcript-content {
    line-height: 1.8;
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.transcript-timestamp {
    display: inline-block;
    color: var(--accent-color);
    font-weight: 600;
    margin-right: 10px;
    cursor: pointer;
    text-decoration: none;
}

.transcript-timestamp:hover {
    text-decoration: underline;
}

/* Related Videos */
.related-videos {
    padding: 20px;
    background-color: var(--bg-primary);
    border-top: 1px solid var(--border-color);
}

.related-videos h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.related-videos-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
}

.related-video-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.related-video-card:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(73, 212, 157, 0.2);
}

.related-video-thumbnail {
    width: 100%;
    aspect-ratio: 16/9;
    background-color: #1a1a1a;
    border-radius: 6px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.related-video-thumbnail svg {
    width: 40px;
    height: 40px;
    fill: #49D49D;
    opacity: 0.6;
}

.related-video-title {
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: 5px;
    font-weight: 500;
}

.related-video-duration {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

/* Watch Video Button */
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
    box-shadow: 0 4px 12px rgba(73, 212, 157, 0.3);
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

/* Dark Mode Adjustments */
body.dark-mode .video-placeholder {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
}

body.dark-mode .video-control-btn {
    background-color: #1a1a1a;
    border-color: #333;
}

body.dark-mode .video-control-btn:hover {
    background-color: #49D49D;
    border-color: #49D49D;
}

/* Responsive Design */
@media (max-width: 768px) {
    .video-modal-content {
        width: 95%;
        margin: 5% auto;
    }
    
    .video-controls {
        flex-wrap: wrap;
    }
    
    .video-control-btn {
        flex: 1 1 calc(50% - 5px);
        min-width: 120px;
    }
    
    .related-videos-list {
        grid-template-columns: 1fr;
    }
}

/* Animations */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes slideDown {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
```


### JavaScript Implementation

```javascript
// Video Tutorial System
const videoTutorials = {
    'installation-overview': {
        title: 'Installation Overview',
        // YouTube video ID would go here
        videoId: 'PLACEHOLDER_VIDEO_ID',
        duration: '8:30',
        transcript: `
[0:00] Welcome to the Kaspa All-in-One installation guide...
[0:30] Before you start, let's talk about system requirements...
[2:00] The installation process has three main phases...
        `,
        related: ['docker-macos', 'docker-windows', 'profile-selection']
    },
    'docker-macos': {
        title: 'Docker Installation for macOS',
        videoId: 'PLACEHOLDER_VIDEO_ID',
        duration: '4:15',
        transcript: `
[0:00] Installing Docker on macOS is straightforward...
[0:30] First, open your web browser and go to docker.com...
[1:00] Choose the right version for your Mac...
        `,
        related: ['installation-overview', 'docker-windows', 'docker-linux']
    },
    'docker-windows': {
        title: 'Docker Installation for Windows with WSL2',
        videoId: 'PLACEHOLDER_VIDEO_ID',
        duration: '5:30',
        transcript: `
[0:00] Installing Docker on Windows requires WSL2...
[0:30] First, make sure you have Windows 10 version 2004 or later...
[1:00] Right-click the Start button and select PowerShell (Admin)...
        `,
        related: ['installation-overview', 'docker-macos', 'docker-linux']
    },
    'docker-linux': {
        title: 'Docker Installation for Linux',
        videoId: 'PLACEHOLDER_VIDEO_ID',
        duration: '4:45',
        transcript: `
[0:00] Installing Docker on Linux is quick and easy...
[0:30] Open your terminal...
[1:00] For Ubuntu or Debian, first update your package list...
        `,
        related: ['installation-overview', 'docker-macos', 'docker-windows']
    },
    'profile-selection': {
        title: 'Profile Selection Guide',
        videoId: 'PLACEHOLDER_VIDEO_ID',
        duration: '6:30',
        transcript: `
[0:00] Choosing the right profile is key to success...
[0:30] Kaspa All-in-One offers six profiles...
[1:00] The Core profile is perfect for beginners...
        `,
        related: ['installation-overview', 'post-installation-tour']
    },
    'post-installation-tour': {
        title: 'Post-Installation Tour',
        videoId: 'PLACEHOLDER_VIDEO_ID',
        duration: '7:45',
        transcript: `
[0:00] Congratulations! Your installation is complete...
[0:30] The dashboard is your control center...
[1:00] At the top, you'll see the service status section...
        `,
        related: ['profile-selection', 'dashboard-features']
    }
};

// Current video state
let currentVideo = null;
let currentSpeed = 1.0;
let transcriptVisible = false;

/**
 * Play a video tutorial
 * @param {string} videoId - The ID of the video to play
 */
function playVideo(videoId) {
    const video = videoTutorials[videoId];
    if (!video) {
        console.error('Video not found:', videoId);
        return;
    }
    
    currentVideo = videoId;
    
    // Update modal title
    document.getElementById('videoTitle').textContent = video.title;
    
    // Load video (placeholder for now - would use YouTube embed)
    const videoPlayer = document.getElementById('videoPlayer');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    
    // In production, this would load the actual YouTube video
    // videoPlayer.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
    // videoPlaceholder.style.display = 'none';
    // videoPlayer.style.display = 'block';
    
    // For now, show placeholder
    videoPlaceholder.style.display = 'flex';
    videoPlayer.style.display = 'none';
    
    // Load transcript
    document.getElementById('transcriptContent').innerHTML = formatTranscript(video.transcript);
    
    // Load related videos
    loadRelatedVideos(video.related);
    
    // Show modal
    document.getElementById('videoPlayerModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Track video view
    trackVideoView(videoId);
}

/**
 * Close the video player
 */
function closeVideoPlayer() {
    const modal = document.getElementById('videoPlayerModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Stop video playback
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = '';
    
    // Reset state
    currentVideo = null;
    transcriptVisible = false;
    document.getElementById('transcriptSection').style.display = 'none';
}

/**
 * Toggle transcript visibility
 */
function toggleTranscript() {
    const transcriptSection = document.getElementById('transcriptSection');
    const button = event.target.closest('.video-control-btn');
    
    transcriptVisible = !transcriptVisible;
    
    if (transcriptVisible) {
        transcriptSection.style.display = 'block';
        button.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
            </svg>
            Hide Transcript
        `;
    } else {
        transcriptSection.style.display = 'none';
        button.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
            </svg>
            Show Transcript
        `;
    }
}

/**
 * Toggle playback speed
 */
function toggleSpeed() {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    currentSpeed = speeds[nextIndex];
    
    const button = event.target.closest('.video-control-btn');
    button.innerHTML = `
        <svg viewBox="0 0 24 24">
            <path d="M13 8V2H7v6H2l8 8 8-8h-5zM7 22h10v-2H7v2z"/>
        </svg>
        Speed: ${currentSpeed}x
    `;
    
    // In production, this would change the YouTube player speed
    // player.setPlaybackRate(currentSpeed);
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');
    
    if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * Format transcript with clickable timestamps
 * @param {string} transcript - Raw transcript text
 * @returns {string} Formatted HTML
 */
function formatTranscript(transcript) {
    const lines = transcript.trim().split('\n');
    return lines.map(line => {
        const match = line.match(/\[(\d+:\d+)\]\s*(.+)/);
        if (match) {
            const [, timestamp, text] = match;
            return `
                <p>
                    <a href="#" class="transcript-timestamp" onclick="seekToTimestamp('${timestamp}'); return false;">
                        ${timestamp}
                    </a>
                    ${text}
                </p>
            `;
        }
        return `<p>${line}</p>`;
    }).join('');
}

/**
 * Seek to a specific timestamp in the video
 * @param {string} timestamp - Timestamp in format "MM:SS"
 */
function seekToTimestamp(timestamp) {
    const [minutes, seconds] = timestamp.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;
    
    // In production, this would seek the YouTube player
    // player.seekTo(totalSeconds, true);
    
    console.log('Seeking to', totalSeconds, 'seconds');
}

/**
 * Load related videos
 * @param {string[]} relatedIds - Array of related video IDs
 */
function loadRelatedVideos(relatedIds) {
    const container = document.getElementById('relatedVideosList');
    container.innerHTML = '';
    
    relatedIds.forEach(videoId => {
        const video = videoTutorials[videoId];
        if (!video) return;
        
        const card = document.createElement('div');
        card.className = 'related-video-card';
        card.onclick = () => playVideo(videoId);
        card.innerHTML = `
            <div class="related-video-thumbnail">
                <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
            <div class="related-video-title">${video.title}</div>
            <div class="related-video-duration">${video.duration}</div>
        `;
        container.appendChild(card);
    });
}

/**
 * Track video view for analytics
 * @param {string} videoId - The ID of the video being viewed
 */
function trackVideoView(videoId) {
    // In production, this would send analytics data
    console.log('Video viewed:', videoId);
    
    // Could also update user progress
    const viewedVideos = JSON.parse(localStorage.getItem('viewedVideos') || '[]');
    if (!viewedVideos.includes(videoId)) {
        viewedVideos.push(videoId);
        localStorage.setItem('viewedVideos', JSON.stringify(viewedVideos));
    }
}

/**
 * Check if user has viewed a video
 * @param {string} videoId - The ID of the video to check
 * @returns {boolean} True if video has been viewed
 */
function hasViewedVideo(videoId) {
    const viewedVideos = JSON.parse(localStorage.getItem('viewedVideos') || '[]');
    return viewedVideos.includes(videoId);
}

/**
 * Get video viewing progress
 * @returns {object} Object with total videos and viewed count
 */
function getVideoProgress() {
    const totalVideos = Object.keys(videoTutorials).length;
    const viewedVideos = JSON.parse(localStorage.getItem('viewedVideos') || '[]');
    return {
        total: totalVideos,
        viewed: viewedVideos.length,
        percentage: Math.round((viewedVideos.length / totalVideos) * 100)
    };
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('videoPlayerModal');
    if (event.target === modal) {
        closeVideoPlayer();
    }
};

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('videoPlayerModal');
        if (modal.style.display === 'block') {
            closeVideoPlayer();
        }
    }
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        playVideo,
        closeVideoPlayer,
        hasViewedVideo,
        getVideoProgress
    };
}
```


## Visual Guides

### 1. Installation Process Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│                    START INSTALLATION                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: WELCOME & OVERVIEW                      │
│  • Introduction to Kaspa All-in-One                          │
│  • What to expect during installation                        │
│  • Estimated time requirements                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 2: SYSTEM CHECK                            │
│  ✓ Operating System Detection                                │
│  ✓ Docker Installation Check                                 │
│  ✓ Resource Availability (RAM, Disk, CPU)                    │
│  ✓ Port Availability Check                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─── [FAIL] ──► Install Docker Guide
                       │                      │
                       │                      ▼
                       │              ┌──────────────┐
                       │              │ macOS Guide  │
                       │              │ Windows Guide│
                       │              │ Linux Guide  │
                       │              └──────┬───────┘
                       │                     │
                       │◄────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 3: PROFILE SELECTION                       │
│  • Core (4GB RAM, 100GB Disk)                                │
│  • Production (8GB RAM, 200GB Disk)                          │
│  • Explorer (16GB RAM, 500GB Disk)                           │
│  • Archive (32GB RAM, 1TB Disk)                              │
│  • Mining (8GB RAM, 150GB Disk)                              │
│  • Development (8GB RAM, 150GB Disk)                         │
│                                                              │
│  [Help Me Choose] ──► Quick Quiz                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 4: CONFIGURATION                           │
│  • Network Settings (Ports, External IP)                     │
│  • Resource Limits (Memory, CPU)                             │
│  • Storage Paths                                             │
│  • Advanced Options (Optional)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 5: REVIEW & CONFIRM                        │
│  • Selected Profile Summary                                  │
│  • Configuration Summary                                     │
│  • Resource Usage Estimate                                   │
│  • Time Estimate                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 6: INSTALLATION                            │
│  Phase 1: Preparation (1-2 min)                              │
│    • Creating configuration files                            │
│    • Setting up directories                                  │
│                                                              │
│  Phase 2: Downloading (10-30 min)                            │
│    • Pulling Docker images                                   │
│    • Downloading dependencies                                │
│                                                              │
│  Phase 3: Building (5-15 min)                                │
│    • Building custom images                                  │
│    • Configuring services                                    │
│                                                              │
│  Phase 4: Starting (2-5 min)                                 │
│    • Starting services                                       │
│    • Initializing databases                                  │
│                                                              │
│  Phase 5: Verifying (1-2 min)                                │
│    • Health checks                                           │
│    • Connectivity tests                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─── [ERROR] ──► Auto-Remediation
                       │                      │
                       │                      ▼
                       │              ┌──────────────┐
                       │              │ Port Conflict│
                       │              │ Permission   │
                       │              │ Resources    │
                       │              └──────┬───────┘
                       │                     │
                       │◄────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 7: COMPLETE                                │
│  ✓ Installation Successful                                   │
│  ✓ All Services Running                                      │
│  • Interactive Tour (Optional)                               │
│  • Getting Started Guide                                     │
│  • Access Dashboard                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    INSTALLATION COMPLETE                     │
│              Your Kaspa Node is Running!                     │
└─────────────────────────────────────────────────────────────┘
```

### 2. Profile Comparison Chart

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        PROFILE COMPARISON                                   │
├──────────┬─────────┬────────────┬──────────┬─────────┬────────┬───────────┤
│ Feature  │  Core   │ Production │ Explorer │ Archive │ Mining │Development│
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ RAM      │  4 GB   │   8 GB     │  16 GB   │  32 GB  │  8 GB  │   8 GB    │
│ Disk     │ 100 GB  │  200 GB    │ 500 GB   │  1 TB   │ 150 GB │  150 GB   │
│ CPU      │ 2 cores │  4 cores   │  4 cores │ 8 cores │ 4 cores│  2 cores  │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Services │         │            │          │         │        │           │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Kaspa    │    ✓    │     ✓      │    ✓     │    ✓    │   ✓    │     ✓     │
│ Node     │         │            │          │         │        │           │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Dashboard│    ✓    │     ✓      │    ✓     │    ✓    │   ✓    │     ✓     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Nginx    │    ✓    │     ✓      │    ✓     │    ✓    │   ✓    │     ✓     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Kasia    │    ✗    │     ✓      │    ✗     │    ✗    │   ✗    │     ✗     │
│ App      │         │            │          │         │        │           │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ K-Social │    ✗    │     ✓      │    ✗     │    ✗    │   ✗    │     ✗     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Indexers │    ✗    │     ✗      │    ✓     │    ✓    │   ✗    │     ✗     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Database │    ✗    │     ✗      │    ✓     │    ✓    │   ✗    │     ✗     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Stratum  │    ✗    │     ✓      │    ✗     │    ✗    │   ✓    │     ✗     │
│ Bridge   │         │            │          │         │        │           │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Portainer│    ✗    │     ✗      │    ✗     │    ✗    │   ✗    │     ✓     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ pgAdmin  │    ✗    │     ✗      │    ✗     │    ✗    │   ✗    │     ✓     │
├──────────┼─────────┼────────────┼──────────┼─────────┼────────┼───────────┤
│ Best For │ Beginne │ App Users  │ Develope │ Archive │ Miners │ Contribut │
│          │ rs      │ & Miners   │ rs       │ Nodes   │        │ ors       │
└──────────┴─────────┴────────────┴──────────┴─────────┴────────┴───────────┘
```

### 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Browser    │  │   Kasia App  │  │  K-Social    │              │
│  │  (Dashboard) │  │  (Messaging) │  │  (Social)    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NGINX REVERSE PROXY                          │
│  • SSL Termination                                                   │
│  • Load Balancing                                                    │
│  • Security Headers                                                  │
└─────────┬───────────────────────────────────────────────────────────┘
          │
          ├──────────────────┬──────────────────┬──────────────────┐
          ▼                  ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Dashboard     │  │   Kasia App     │  │   K-Social      │  │   Stratum       │
│   (Node.js)     │  │   (React)       │  │   (Node.js)     │  │   Bridge (Go)   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │                    │
         │                    ▼                    ▼                    │
         │           ┌─────────────────┐  ┌─────────────────┐          │
         │           │ Kasia Indexer   │  │  K-Indexer      │          │
         │           │   (Rust)        │  │  (Node.js)      │          │
         │           └────────┬────────┘  └────────┬────────┘          │
         │                    │                    │                    │
         │                    │                    ▼                    │
         │                    │           ┌─────────────────┐          │
         │                    │           │  TimescaleDB    │          │
         │                    │           │  (PostgreSQL)   │          │
         │                    │           └─────────────────┘          │
         │                    │                                         │
         └────────────────────┴─────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         KASPA NODE                                   │
│  • Blockchain Synchronization                                        │
│  • P2P Network Communication                                         │
│  • RPC API Server                                                    │
│  • UTXO Index                                                        │
└─────────┬───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      KASPA NETWORK                                   │
│  • Peer-to-Peer Network                                              │
│  • Blockchain Data                                                   │
│  • Transaction Pool                                                  │
└─────────────────────────────────────────────────────────────────────┘
```


### 4. Troubleshooting Decision Tree

```
                    ┌─────────────────────┐
                    │  Installation Issue │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
    ┌───────────────────────┐     ┌───────────────────────┐
    │ Docker Not Installed  │     │  Installation Failed  │
    └───────────┬───────────┘     └───────────┬───────────┘
                │                             │
                ▼                             │
    ┌───────────────────────┐                 │
    │ What OS are you using?│                 │
    └───────────┬───────────┘                 │
                │                             │
    ┌───────────┼───────────┐                 │
    │           │           │                 │
    ▼           ▼           ▼                 │
┌───────┐  ┌─────────┐  ┌───────┐            │
│ macOS │  │ Windows │  │ Linux │            │
└───┬───┘  └────┬────┘  └───┬───┘            │
    │           │           │                 │
    ▼           ▼           ▼                 │
[Docker    [Docker     [Docker               │
 Desktop]   Desktop]    Engine]              │
            [WSL2]                            │
                                              │
                    ┌─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ Port Conflict │       │ Out of Memory │
└───────┬───────┘       └───────┬───────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ Check ports:  │       │ Check RAM:    │
│ 16110, 16111  │       │ Available vs  │
│ 3001, 5432    │       │ Required      │
└───────┬───────┘       └───────┬───────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ Kill process  │       │ Choose lighter│
│ or change     │       │ profile or    │
│ port          │       │ remote node   │
└───────────────┘       └───────────────┘
```

### 5. Resource Requirements Visual Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESOURCE REQUIREMENTS                         │
└─────────────────────────────────────────────────────────────────┘

RAM (Memory)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Core        ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  4 GB
Production  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  8 GB
Explorer    ████████████████░░░░░░░░░░░░░░░░░░ 16 GB
Archive     ████████████████████████████████░░ 32 GB
Mining      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  8 GB
Development ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  8 GB

Disk Space
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Core        ██████████░░░░░░░░░░░░░░░░░░░░░░░░ 100 GB
Production  ████████████████████░░░░░░░░░░░░░░ 200 GB
Explorer    ██████████████████████████████████ 500 GB
Archive     ██████████████████████████████████ 1 TB
Mining      ███████████████░░░░░░░░░░░░░░░░░░░ 150 GB
Development ███████████████░░░░░░░░░░░░░░░░░░░ 150 GB

CPU Cores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Core        ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 cores
Production  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  4 cores
Explorer    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  4 cores
Archive     ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  8 cores
Mining      ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  4 cores
Development ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 cores

┌─────────────────────────────────────────────────────────────────┐
│                    COMPATIBILITY RATINGS                         │
└─────────────────────────────────────────────────────────────────┘

Your System: 16 GB RAM, 500 GB Disk, 4 CPU Cores

Core        ✓✓✓ OPTIMAL     - Exceeds requirements significantly
Production  ✓✓✓ OPTIMAL     - Exceeds requirements significantly
Explorer    ✓✓  RECOMMENDED - Meets all requirements
Archive     ✗   NOT RECOMMENDED - Insufficient RAM (need 32 GB)
Mining      ✓✓✓ OPTIMAL     - Exceeds requirements significantly
Development ✓✓✓ OPTIMAL     - Exceeds requirements significantly

Legend:
✓✓✓ OPTIMAL         - System exceeds requirements, excellent performance
✓✓  RECOMMENDED     - System meets requirements, good performance
✓   POSSIBLE        - System meets minimum, may experience slowness
✗   NOT RECOMMENDED - System below minimum, not recommended
```

### 6. Installation Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    INSTALLATION TIMELINE                         │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Preparation (1-2 minutes)
├─ 0:00 - Creating configuration files
├─ 0:30 - Setting up directories
├─ 1:00 - Validating settings
└─ 1:30 - Ready to download

Phase 2: Downloading (10-30 minutes)
├─ 2:00 - Pulling Kaspa node image (largest, ~2 GB)
├─ 5:00 - Pulling dashboard image (~200 MB)
├─ 7:00 - Pulling nginx image (~50 MB)
├─ 8:00 - Pulling application images (if selected)
└─ 15:00 - All images downloaded

Phase 3: Building (5-15 minutes)
├─ 15:00 - Building custom images
├─ 18:00 - Configuring services
├─ 20:00 - Setting up networks
└─ 22:00 - Build complete

Phase 4: Starting (2-5 minutes)
├─ 22:00 - Starting Kaspa node
├─ 23:00 - Starting database (if needed)
├─ 24:00 - Starting indexers (if needed)
├─ 25:00 - Starting applications
└─ 26:00 - All services started

Phase 5: Verifying (1-2 minutes)
├─ 26:00 - Running health checks
├─ 26:30 - Testing connectivity
├─ 27:00 - Validating configuration
└─ 27:30 - Installation complete!

Total Time: ~30 minutes (varies by internet speed and profile)

Note: Blockchain sync happens in the background and can take
several hours to days depending on network conditions.
```

