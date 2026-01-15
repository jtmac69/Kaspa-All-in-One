/**
 * Icon Helper Module for Kaspa All-in-One
 * Provides utilities for creating and managing Lucide icons
 * 
 * Usage:
 *   import { createIcon, Icons } from './icons.js';
 *   const icon = createIcon('zap', { size: 'sm', class: 'icon-kaspa-blue' });
 */

/**
 * Icon name mappings to Lucide icon names
 */
export const Icons = {
    // Header
    zap: 'zap',
    wand: 'wand-2',
    settings: 'settings',
    update: 'arrow-up-circle',
    config: 'sliders',
    
    // Network
    globe: 'globe',
    activity: 'activity',
    box: 'box',
    refresh: 'refresh-cw',
    cpu: 'cpu',
    trending: 'trending-up',
    coins: 'coins',
    chevron: 'chevron-right',
    
    // Node
    server: 'server',
    warning: 'alert-triangle',
    
    // Service actions
    play: 'play',
    stop: 'square',
    restart: 'rotate-cw',
    logs: 'file-text',
    
    // Quick actions
    layout: 'layout-grid',
    download: 'download',
    backup: 'database',
    
    // Resources
    circle: 'circle',
    search: 'search',
    emergency: 'alert-octagon',
    
    // Footer
    bug: 'bug',
    lightbulb: 'lightbulb',
    coffee: 'coffee',
    
    // Modals
    close: 'x',
    error: 'x-circle',
    success: 'check-circle',
    info: 'info',
    
    // Context actions
    hammer: 'hammer',
    database: 'database',
    
    // Additional common icons
    check: 'check',
    plus: 'plus',
    minus: 'minus',
    edit: 'edit',
    trash: 'trash-2',
    eye: 'eye',
    eyeOff: 'eye-off',
    link: 'link',
    externalLink: 'external-link',
    copy: 'copy',
    clipboard: 'clipboard',
    folder: 'folder',
    file: 'file',
    upload: 'upload',
    arrowLeft: 'arrow-left',
    arrowRight: 'arrow-right',
    arrowUp: 'arrow-up',
    arrowDown: 'arrow-down',
    chevronLeft: 'chevron-left',
    chevronRight: 'chevron-right',
    chevronUp: 'chevron-up',
    chevronDown: 'chevron-down',
    menu: 'menu',
    moreVertical: 'more-vertical',
    moreHorizontal: 'more-horizontal',
    loader: 'loader',
    lock: 'lock',
    unlock: 'unlock',
    user: 'user',
    users: 'users',
    mail: 'mail',
    bell: 'bell',
    calendar: 'calendar',
    clock: 'clock',
    home: 'home',
    package: 'package',
    shield: 'shield',
    terminal: 'terminal',
    code: 'code',
    git: 'git-branch',
    github: 'github',
    heart: 'heart',
    star: 'star',
    bookmark: 'bookmark',
    filter: 'filter',
    sort: 'arrow-up-down',
    maximize: 'maximize',
    minimize: 'minimize',
    power: 'power',
    wifi: 'wifi',
    wifiOff: 'wifi-off',
    volume: 'volume-2',
    volumeOff: 'volume-x'
};

/**
 * Create a Lucide icon element
 * 
 * @param {string} iconName - Name of the icon (from Icons object or Lucide name)
 * @param {Object} options - Icon options
 * @param {string} options.size - Icon size: 'xs', 'sm', 'md', 'lg', 'xl' (default: 'sm')
 * @param {string} options.class - Additional CSS classes
 * @param {string} options.color - Color class: 'kaspa-blue', 'kaspa-purple', 'success', etc.
 * @param {boolean} options.rotating - Whether icon should rotate
 * @param {boolean} options.pulse - Whether icon should pulse
 * @param {string} options.ariaLabel - Accessibility label
 * @param {Object} options.attrs - Additional HTML attributes
 * @returns {SVGElement} SVG icon element
 */
export function createIcon(iconName, options = {}) {
    const {
        size = 'sm',
        class: className = '',
        color = '',
        rotating = false,
        pulse = false,
        ariaLabel = '',
        attrs = {}
    } = options;
    
    // Get Lucide icon name
    const lucideName = Icons[iconName] || iconName;
    
    // Build class list
    const classes = [
        'lucide',
        `lucide-${lucideName}`,
        `icon-${size}`,
        color ? `icon-${color}` : '',
        rotating ? 'icon-rotating' : '',
        pulse ? 'icon-pulse' : '',
        className
    ].filter(Boolean).join(' ');
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', classes);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    // Add aria-label if provided
    if (ariaLabel) {
        svg.setAttribute('aria-label', ariaLabel);
        svg.setAttribute('role', 'img');
    } else {
        svg.setAttribute('aria-hidden', 'true');
    }
    
    // Add custom attributes
    Object.entries(attrs).forEach(([key, value]) => {
        svg.setAttribute(key, value);
    });
    
    // Add icon paths based on icon name
    const paths = getIconPaths(lucideName);
    paths.forEach(pathData => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', pathData.type || 'path');
        Object.entries(pathData).forEach(([key, value]) => {
            if (key !== 'type') {
                path.setAttribute(key, value);
            }
        });
        svg.appendChild(path);
    });
    
    return svg;
}

/**
 * Create an icon button with tooltip
 * 
 * @param {string} iconName - Name of the icon
 * @param {Object} options - Button options
 * @param {string} options.tooltip - Tooltip text
 * @param {string} options.class - Additional CSS classes
 * @param {Function} options.onClick - Click handler
 * @param {Object} options.iconOptions - Options passed to createIcon
 * @param {Object} options.attrs - Additional button attributes
 * @returns {HTMLButtonElement} Button element with icon
 */
export function createIconButton(iconName, options = {}) {
    const {
        tooltip = '',
        class: className = '',
        onClick = null,
        iconOptions = {},
        attrs = {}
    } = options;
    
    const button = document.createElement('button');
    button.className = `btn-icon-only icon-tooltip ${className}`.trim();
    
    if (tooltip) {
        button.setAttribute('data-tooltip', tooltip);
        button.setAttribute('title', tooltip);
        button.setAttribute('aria-label', tooltip);
    }
    
    // Add custom attributes
    Object.entries(attrs).forEach(([key, value]) => {
        button.setAttribute(key, value);
    });
    
    // Add icon
    const icon = createIcon(iconName, iconOptions);
    button.appendChild(icon);
    
    // Add click handler
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    
    return button;
}

/**
 * Replace emoji icons in an element with Lucide icons
 * 
 * @param {HTMLElement} element - Element to process
 * @param {Object} emojiMap - Map of emoji to icon names
 */
export function replaceEmojiIcons(element, emojiMap = {}) {
    const defaultMap = {
        '⚡': 'zap',
        '🧙‍♂️': 'wand',
        '⚙️': 'settings',
        '⬆️': 'update',
        '🌐': 'globe',
        '📊': 'activity',
        '🧊': 'box',
        '🔄': 'refresh',
        '💪': 'cpu',
        '💰': 'coins',
        '🖥️': 'server',
        '⚠️': 'warning',
        '▶️': 'play',
        '⏹️': 'stop',
        '📋': 'logs',
        '💾': 'backup',
        '🔴': 'circle',
        '🔍': 'search',
        '🚨': 'emergency',
        '🐛': 'bug',
        '💡': 'lightbulb',
        '☕': 'coffee',
        '✕': 'close',
        '❌': 'error',
        '⛏️': 'hammer',
        '▶': 'chevron'
    };
    
    const map = { ...defaultMap, ...emojiMap };
    
    // Process text nodes
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const nodesToReplace = [];
    let node;
    
    while (node = walker.nextNode()) {
        const text = node.textContent;
        for (const [emoji, iconName] of Object.entries(map)) {
            if (text.includes(emoji)) {
                nodesToReplace.push({ node, emoji, iconName });
            }
        }
    }
    
    // Replace emojis with icons
    nodesToReplace.forEach(({ node, emoji, iconName }) => {
        const parts = node.textContent.split(emoji);
        const parent = node.parentNode;
        
        parts.forEach((part, index) => {
            if (part) {
                parent.insertBefore(document.createTextNode(part), node);
            }
            if (index < parts.length - 1) {
                const icon = createIcon(iconName, { size: 'sm', class: 'icon-inline' });
                parent.insertBefore(icon, node);
            }
        });
        
        parent.removeChild(node);
    });
}

/**
 * Get SVG path data for icon
 * This is a simplified version - in production, you'd load from Lucide's icon data
 * 
 * @param {string} iconName - Lucide icon name
 * @returns {Array} Array of path data objects
 */
function getIconPaths(iconName) {
    // Icon path definitions (subset of most common icons)
    const iconPaths = {
        'zap': [{ d: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z' }],
        'wand-2': [
            { d: 'M21.64 3.64l-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72z' },
            { d: 'm14 7 3 3' },
            { d: 'M5 6v4' },
            { d: 'M19 14v4' },
            { d: 'M10 2v2' },
            { d: 'M7 8H3' },
            { d: 'M21 16h-4' },
            { d: 'M11 3H9' }
        ],
        'settings': [
            { type: 'circle', cx: '12', cy: '12', r: '3' },
            { d: 'M12 1v6m0 6v6' },
            { d: 'm15.4 17.4 4.2 4.2' },
            { d: 'm4.4 4.4 4.2 4.2' },
            { d: 'M1 12h6m6 0h6' },
            { d: 'm4.4 19.6 4.2-4.2' },
            { d: 'm19.6 4.4-4.2 4.2' }
        ],
        'arrow-up-circle': [
            { type: 'circle', cx: '12', cy: '12', r: '10' },
            { d: 'm16 12-4-4-4 4' },
            { d: 'M12 16V8' }
        ],
        'sliders': [
            { d: 'M4 21v-7' },
            { d: 'M4 10V3' },
            { d: 'M12 21v-9' },
            { d: 'M12 8V3' },
            { d: 'M20 21v-5' },
            { d: 'M20 12V3' },
            { d: 'M1 14h6' },
            { d: 'M9 8h6' },
            { d: 'M17 16h6' }
        ],
        'globe': [
            { type: 'circle', cx: '12', cy: '12', r: '10' },
            { d: 'M2 12h20' },
            { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }
        ],
        'activity': [
            { d: 'M22 12h-4l-3 9L9 3l-3 9H2' }
        ],
        'box': [
            { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
            { d: 'M3.27 6.96 12 12.01l8.73-5.05' },
            { d: 'M12 22.08V12' }
        ],
        'refresh-cw': [
            { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' },
            { d: 'M21 3v5h-5' },
            { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' },
            { d: 'M3 21v-5h5' }
        ],
        'cpu': [
            { type: 'rect', x: '4', y: '4', width: '16', height: '16', rx: '2' },
            { type: 'rect', x: '9', y: '9', width: '6', height: '6' },
            { d: 'M15 2v2' },
            { d: 'M15 20v2' },
            { d: 'M2 15h2' },
            { d: 'M2 9h2' },
            { d: 'M20 15h2' },
            { d: 'M20 9h2' },
            { d: 'M9 2v2' },
            { d: 'M9 20v2' }
        ],
        'trending-up': [
            { d: 'm22 7-8.5 8.5-5-5L2 17' },
            { d: 'M16 7h6v6' }
        ],
        'coins': [
            { type: 'circle', cx: '8', cy: '8', r: '6' },
            { d: 'M18.09 10.37A6 6 0 1 1 10.34 18' },
            { d: 'M7 6h1v4' },
            { d: 'm16.71 13.88.7.71-2.82 2.82' }
        ],
        'chevron-right': [
            { d: 'm9 18 6-6-6-6' }
        ],
        'server': [
            { type: 'rect', width: '20', height: '8', x: '2', y: '2', rx: '2', ry: '2' },
            { type: 'rect', width: '20', height: '8', x: '2', y: '14', rx: '2', ry: '2' },
            { d: 'M6 6h.01' },
            { d: 'M6 18h.01' }
        ],
        'alert-triangle': [
            { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' },
            { d: 'M12 9v4' },
            { d: 'M12 17h.01' }
        ],
        'play': [
            { d: 'm5 3 14 9-14 9V3z' }
        ],
        'square': [
            { type: 'rect', width: '18', height: '18', x: '3', y: '3', rx: '2' }
        ],
        'rotate-cw': [
            { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' },
            { d: 'M21 3v5h-5' }
        ],
        'file-text': [
            { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' },
            { d: 'M14 2v6h6' },
            { d: 'M16 13H8' },
            { d: 'M16 17H8' },
            { d: 'M10 9H8' }
        ],
        'layout-grid': [
            { type: 'rect', width: '7', height: '7', x: '3', y: '3', rx: '1' },
            { type: 'rect', width: '7', height: '7', x: '14', y: '3', rx: '1' },
            { type: 'rect', width: '7', height: '7', x: '14', y: '14', rx: '1' },
            { type: 'rect', width: '7', height: '7', x: '3', y: '14', rx: '1' }
        ],
        'download': [
            { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
            { d: 'M7 10l5 5 5-5' },
            { d: 'M12 15V3' }
        ],
        'database': [
            { type: 'ellipse', cx: '12', cy: '5', rx: '9', ry: '3' },
            { d: 'M3 5v14a9 3 0 0 0 18 0V5' },
            { d: 'M3 12a9 3 0 0 0 18 0' }
        ],
        'circle': [
            { type: 'circle', cx: '12', cy: '12', r: '10' }
        ],
        'search': [
            { type: 'circle', cx: '11', cy: '11', r: '8' },
            { d: 'm21 21-4.3-4.3' }
        ],
        'alert-octagon': [
            { d: 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z' },
            { d: 'M12 8v4' },
            { d: 'M12 16h.01' }
        ],
        'bug': [
            { d: 'm8 2 1.88 1.88' },
            { d: 'M14.12 3.88 16 2' },
            { d: 'M9 7.13v-1a3.003 3.003 0 1 1 6 0v1' },
            { d: 'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6' },
            { d: 'M12 20v-9' },
            { d: 'M6.53 9C4.6 8.8 3 7.1 3 5' },
            { d: 'M6 13H2' },
            { d: 'M3 21c0-2.1 1.7-3.9 3.8-4' },
            { d: 'M20.97 5c0 2.1-1.6 3.8-3.5 4' },
            { d: 'M22 13h-4' },
            { d: 'M17.2 17c2.1.1 3.8 1.9 3.8 4' }
        ],
        'lightbulb': [
            { d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' },
            { d: 'M9 18h6' },
            { d: 'M10 22h4' }
        ],
        'coffee': [
            { d: 'M17 8h1a4 4 0 1 1 0 8h-1' },
            { d: 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z' },
            { d: 'M6 2v2' },
            { d: 'M10 2v2' },
            { d: 'M14 2v2' }
        ],
        'x': [
            { d: 'M18 6 6 18' },
            { d: 'm6 6 12 12' }
        ],
        'x-circle': [
            { type: 'circle', cx: '12', cy: '12', r: '10' },
            { d: 'm15 9-6 6' },
            { d: 'm9 9 6 6' }
        ],
        'check-circle': [
            { type: 'circle', cx: '12', cy: '12', r: '10' },
            { d: 'm9 12 2 2 4-4' }
        ],
        'hammer': [
            { d: 'm15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9' },
            { d: 'M17.64 15 22 10.64' },
            { d: 'm20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91' }
        ],
        'loader': [
            { d: 'M21 12a9 9 0 1 1-6.219-8.56' }
        ],
        'info': [
            { type: 'circle', cx: '12', cy: '12', r: '10' },
            { d: 'M12 16v-4' },
            { d: 'M12 8h.01' }
        ],
        'check': [
            { d: 'M20 6 9 17l-5-5' }
        ]
    };
    
    return iconPaths[iconName] || [{ d: 'M12 2v20M2 12h20' }]; // Default to plus icon
}

/**
 * Initialize icon system
 * Replaces all emoji icons on page load
 */
export function initIcons() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            replaceEmojiIcons(document.body);
        });
    } else {
        replaceEmojiIcons(document.body);
    }
}

// Export for use in modules
export default {
    Icons,
    createIcon,
    createIconButton,
    replaceEmojiIcons,
    initIcons
};
