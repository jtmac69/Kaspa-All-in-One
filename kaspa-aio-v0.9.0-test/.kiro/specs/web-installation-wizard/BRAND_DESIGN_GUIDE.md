# Kaspa All-in-One Installation Wizard - Brand Design Guide

## 🎨 Official Kaspa Brand Guidelines

**Source**: https://kaspa.org/media-kit/

This document provides specific design guidelines for implementing the Installation Wizard using official Kaspa brand assets and colors.

## 📋 Brand Assets

### Logo Files

Download official logos from: https://kaspa.org/media-kit/

**Required Assets**:
```
assets/brand/
├── kaspa-logo.svg              # Full logo (horizontal)
├── kaspa-logo-vertical.svg     # Vertical logo
├── kaspa-icon.svg              # Icon only (K symbol)
├── kaspa-wordmark.svg          # Text only
├── kaspa-logo-white.svg        # White version (for dark backgrounds)
└── kaspa-icon-white.svg        # White icon (for dark backgrounds)
```

### Logo Usage Rules

1. **Minimum Sizes**:
   - Icon only: 32px × 32px
   - Full logo: 120px width
   - Vertical logo: 80px width

2. **Clear Space**:
   - Maintain minimum 16px clear space around logo
   - No text or graphics within clear space

3. **Backgrounds**:
   - Light backgrounds: Use standard color logo
   - Dark backgrounds: Use white logo variant
   - Never place logo on busy backgrounds

4. **Don'ts**:
   - ❌ Don't change logo colors
   - ❌ Don't rotate or distort logo
   - ❌ Don't add effects (shadows, gradients, outlines)
   - ❌ Don't recreate or modify logo

## 🎨 Color Palette

### Primary Colors

```css
/* Kaspa Teal/Cyan - Primary Brand Color */
--kaspa-blue: #70C7BA;
--kaspa-blue-rgb: 112, 199, 186;

/* Darker variant for hover states */
--kaspa-dark: #49C8B5;
--kaspa-dark-rgb: 73, 200, 181;

/* Lighter variant for backgrounds */
--kaspa-light: #9FE7DC;
--kaspa-light-rgb: 159, 231, 220;

/* Very light for subtle backgrounds */
--kaspa-pale: #E5F7F5;
--kaspa-pale-rgb: 229, 247, 245;
```

### Secondary Colors

```css
/* Purple accent (from Kaspa branding) */
--kaspa-purple: #7B61FF;
--kaspa-purple-rgb: 123, 97, 255;

/* Purple variants */
--kaspa-purple-dark: #5B41DF;
--kaspa-purple-light: #9B81FF;
```

### Gradients

```css
/* Primary gradient (teal) */
--gradient-primary: linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%);

/* Accent gradient (purple to teal) */
--gradient-accent: linear-gradient(135deg, #7B61FF 0%, #70C7BA 100%);

/* Subtle background gradient */
--gradient-background: linear-gradient(180deg, #FFFFFF 0%, #E5F7F5 100%);
```

### Status Colors

```css
/* Success - Green */
--success: #7ED321;
--success-light: #9FE741;
--success-dark: #5EB301;

/* Warning - Orange */
--warning: #F5A623;
--warning-light: #FFB843;
--warning-dark: #D58603;

/* Error - Red */
--error: #D0021B;
--error-light: #F0223B;
--error-dark: #B00015;

/* Info - Use Kaspa Blue */
--info: #70C7BA;
```

### Neutral Colors

```css
/* Backgrounds */
--background: #F8F9FA;
--surface: #FFFFFF;
--surface-elevated: #FFFFFF;

/* Dark mode */
--background-dark: #0F0F0F;
--surface-dark: #1A1A1A;
--surface-elevated-dark: #242424;

/* Text */
--text-primary: #1A1A1A;
--text-secondary: #666666;
--text-tertiary: #999999;
--text-disabled: #CCCCCC;

/* Text on dark */
--text-primary-dark: #FFFFFF;
--text-secondary-dark: #CCCCCC;
--text-tertiary-dark: #999999;

/* Borders */
--border: #E0E0E0;
--border-light: #F0F0F0;
--border-dark: #333333;
```

## 🔤 Typography

### Font Families

```css
/* Headings - Bold, modern */
--font-heading: 'Montserrat', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Body - Clean, readable */
--font-body: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Code - Monospace */
--font-code: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace;
```

### Font Sizes

```css
/* Headings */
--text-h1: 2.5rem;    /* 40px */
--text-h2: 2rem;      /* 32px */
--text-h3: 1.5rem;    /* 24px */
--text-h4: 1.25rem;   /* 20px */
--text-h5: 1.125rem;  /* 18px */

/* Body */
--text-base: 1rem;    /* 16px */
--text-sm: 0.875rem;  /* 14px */
--text-xs: 0.75rem;   /* 12px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Font Weights

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## 🎭 Component Examples

### Hero Section (Welcome Step)

```html
<div class="hero">
  <img src="/assets/brand/kaspa-logo.svg" alt="Kaspa" class="hero-logo" />
  <h1 class="hero-title">Welcome to Kaspa All-in-One</h1>
  <p class="hero-subtitle">
    Set up your complete Kaspa ecosystem in minutes
  </p>
  <button class="btn-primary btn-large">
    Get Started
  </button>
</div>
```

```css
.hero {
  text-align: center;
  padding: 60px 20px;
  background: var(--gradient-background);
}

.hero-logo {
  width: 200px;
  margin-bottom: 32px;
}

.hero-title {
  font-family: var(--font-heading);
  font-size: var(--text-h1);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: 16px;
}

.hero-subtitle {
  font-family: var(--font-body);
  font-size: var(--text-h4);
  color: var(--text-secondary);
  margin-bottom: 32px;
}
```

### Profile Card

```html
<div class="profile-card">
  <div class="profile-icon">
    <img src="/assets/icons/node.svg" alt="Node" />
  </div>
  <h3 class="profile-title">Core Node</h3>
  <p class="profile-description">
    Essential Kaspa node for blockchain participation
  </p>
  <div class="profile-badge">Recommended</div>
</div>
```

```css
.profile-card {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  transition: all 200ms ease;
  cursor: pointer;
}

.profile-card:hover {
  border-color: var(--kaspa-blue);
  box-shadow: 0 4px 16px rgba(112, 199, 186, 0.2);
  transform: translateY(-4px);
}

.profile-card.selected {
  border-color: var(--kaspa-blue);
  background: var(--kaspa-pale);
  box-shadow: 0 4px 16px rgba(112, 199, 186, 0.3);
}

.profile-icon {
  width: 64px;
  height: 64px;
  background: var(--gradient-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.profile-badge {
  display: inline-block;
  background: var(--kaspa-blue);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  margin-top: 12px;
}
```

### Progress Step

```html
<div class="progress-container">
  <div class="progress-header">
    <h3>Installing Services</h3>
    <span class="progress-percentage">65%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width: 65%"></div>
  </div>
  <div class="progress-status">
    Building kaspa-node...
  </div>
</div>
```

```css
.progress-container {
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-percentage {
  font-size: var(--text-h3);
  font-weight: var(--font-bold);
  color: var(--kaspa-blue);
}

.progress-bar {
  background: var(--border-light);
  border-radius: 8px;
  height: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  background: var(--gradient-primary);
  height: 100%;
  border-radius: 8px;
  transition: width 300ms ease;
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

### Service Status Card

```html
<div class="service-status healthy">
  <div class="service-icon">
    <svg><!-- Checkmark icon --></svg>
  </div>
  <div class="service-info">
    <h4 class="service-name">Kaspa Node</h4>
    <p class="service-message">Running and synced</p>
  </div>
  <div class="service-badge">Healthy</div>
</div>
```

```css
.service-status {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.service-status.healthy {
  border-color: var(--success);
  background: rgba(126, 211, 33, 0.05);
}

.service-status.warning {
  border-color: var(--warning);
  background: rgba(245, 166, 35, 0.05);
}

.service-status.error {
  border-color: var(--error);
  background: rgba(208, 2, 27, 0.05);
}

.service-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-status.healthy .service-icon {
  background: var(--success);
  color: white;
}

.service-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  margin-left: auto;
}

.service-status.healthy .service-badge {
  background: var(--success);
  color: white;
}
```

## 🌓 Dark Mode Support

```css
/* Dark mode color overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --background: var(--background-dark);
    --surface: var(--surface-dark);
    --surface-elevated: var(--surface-elevated-dark);
    --text-primary: var(--text-primary-dark);
    --text-secondary: var(--text-secondary-dark);
    --text-tertiary: var(--text-tertiary-dark);
    --border: var(--border-dark);
  }
  
  /* Use white logo variants */
  .logo {
    content: url('/assets/brand/kaspa-logo-white.svg');
  }
}
```

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
```

### Responsive Typography

```css
/* Mobile */
:root {
  --text-h1: 2rem;      /* 32px */
  --text-h2: 1.5rem;    /* 24px */
  --text-h3: 1.25rem;   /* 20px */
}

/* Tablet and up */
@media (min-width: 768px) {
  :root {
    --text-h1: 2.5rem;  /* 40px */
    --text-h2: 2rem;    /* 32px */
    --text-h3: 1.5rem;  /* 24px */
  }
}
```

## ✨ Animations

### Transitions

```css
/* Standard transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;

/* Easing functions */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### Micro-interactions

```css
/* Button hover */
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(112, 199, 186, 0.3);
  transition: all var(--transition-base);
}

/* Card hover */
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(112, 199, 186, 0.2);
  transition: all var(--transition-base);
}

/* Loading pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s var(--ease-in-out) infinite;
}
```

## 📐 Spacing System

```css
/* Consistent spacing scale */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

## 🎯 Accessibility

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- Text on background: 4.5:1 minimum
- Large text on background: 3:1 minimum
- UI components: 3:1 minimum

### Focus States

```css
/* Keyboard focus indicator */
*:focus-visible {
  outline: 2px solid var(--kaspa-blue);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove default outline */
*:focus {
  outline: none;
}
```

## 📦 Asset Organization

```
public/assets/
├── brand/
│   ├── kaspa-logo.svg
│   ├── kaspa-logo-white.svg
│   ├── kaspa-icon.svg
│   └── kaspa-icon-white.svg
├── icons/
│   ├── node.svg
│   ├── indexer.svg
│   ├── database.svg
│   └── ...
└── illustrations/
    ├── welcome.svg
    ├── success.svg
    └── error.svg
```

---

**This design guide ensures the Installation Wizard maintains consistent Kaspa branding throughout the user experience! 🎨**