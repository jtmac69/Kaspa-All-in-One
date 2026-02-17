/**
 * Theme Manager — Shared between Wizard and Dashboard
 * Manages light/dark/system theme preference with localStorage persistence.
 *
 * Usage:
 *   import { themeManager } from '/shared/scripts/theme-manager.js';
 *   themeManager.init();
 */

const STORAGE_KEY = 'kaspa-aio-theme';
const MODES = ['system', 'light', 'dark'];

class ThemeManager {
    constructor() {
        this._listeners = [];
        this._mediaQuery = null;
    }

    /**
     * Initialize theme manager — apply stored preference and listen for OS changes.
     * Safe to call multiple times (idempotent).
     */
    init() {
        this.apply();
        this._wireToggleButton();
        this._listenForOSChanges();
    }

    /** Returns 'system' | 'light' | 'dark' */
    getPreference() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return MODES.includes(stored) ? stored : 'system';
    }

    /** Returns resolved 'light' | 'dark' */
    getEffectiveTheme() {
        const pref = this.getPreference();
        if (pref === 'light' || pref === 'dark') return pref;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /** Cycle: system → light → dark → system */
    cycle() {
        const current = this.getPreference();
        const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
        localStorage.setItem(STORAGE_KEY, next);
        this.apply();
        this._notify();
    }

    /** Apply theme to the document */
    apply() {
        const pref = this.getPreference();
        const effective = this.getEffectiveTheme();
        const root = document.documentElement;

        root.setAttribute('data-theme', effective);
        root.setAttribute('data-theme-preference', pref);

        this._updatePictureSources(effective);
    }

    /** Subscribe to theme changes */
    onChange(callback) {
        this._listeners.push(callback);
    }

    // --- Private ---

    _notify() {
        const detail = { preference: this.getPreference(), effective: this.getEffectiveTheme() };
        this._listeners.forEach(fn => fn(detail));
    }

    _wireToggleButton() {
        const btn = document.getElementById('theme-toggle');
        if (btn && !btn.dataset.themeWired) {
            btn.dataset.themeWired = 'true';
            btn.addEventListener('click', () => this.cycle());
        }
    }

    _listenForOSChanges() {
        if (this._mediaQuery) return; // already listening
        this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this._mediaQuery.addEventListener('change', () => {
            if (this.getPreference() === 'system') {
                this.apply();
                this._notify();
            }
        });
    }

    /**
     * Update <picture> elements that use data-theme-srcset-* attributes.
     * Also handles legacy <source media="(prefers-color-scheme: dark)"> elements.
     */
    _updatePictureSources(effective) {
        // Handle data-theme-srcset-* pattern
        document.querySelectorAll('source[data-theme-srcset-dark]').forEach(source => {
            const dark = source.getAttribute('data-theme-srcset-dark');
            const light = source.getAttribute('data-theme-srcset-light');
            source.srcset = effective === 'dark' ? dark : light;
        });

        // Handle legacy <source media="(prefers-color-scheme: dark)"> by overriding media
        document.querySelectorAll('source[media="(prefers-color-scheme: dark)"]').forEach(source => {
            // Replace media query with one that matches based on data-theme
            source.media = effective === 'dark' ? 'all' : 'not all';
        });
    }
}

export const themeManager = new ThemeManager();
