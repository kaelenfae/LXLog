import { THEME_CLASSES } from '../constants';

// Default custom theme colors (same as in SettingsModal)
const DEFAULT_CUSTOM_COLORS = {
  '--bg-app': '#1a1a2e',
  '--bg-panel': '#16213e',
  '--bg-card': '#0f3460',
  '--accent-primary': '#e94560',
  '--text-primary': '#f4f4f5',
  '--text-secondary': '#a1a1aa',
};

function applyTheme(theme, customColors) {
  // Remove any existing theme classes and custom CSS vars
  document.documentElement.classList.remove(...THEME_CLASSES);
  Object.keys(DEFAULT_CUSTOM_COLORS).forEach(key => {
    document.documentElement.style.removeProperty(key);
  });
  document.documentElement.style.removeProperty('--accent-hover');
  document.documentElement.style.removeProperty('--accent-text');
  document.documentElement.style.removeProperty('--bg-hover');
  document.documentElement.style.removeProperty('--border-subtle');
  document.documentElement.style.removeProperty('--border-default');

  if (theme === 'custom') {
    // Apply custom CSS variables
    Object.entries(customColors || DEFAULT_CUSTOM_COLORS).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    // Derived vars
    const accent = customColors?.['--accent-primary'] || DEFAULT_CUSTOM_COLORS['--accent-primary'];
    document.documentElement.style.setProperty('--accent-hover', accent);
    document.documentElement.style.setProperty('--accent-text', '#ffffff');
    document.documentElement.style.setProperty('--bg-hover', customColors?.['--bg-card'] || DEFAULT_CUSTOM_COLORS['--bg-card']);
    document.documentElement.style.setProperty('--border-subtle', customColors?.['--bg-card'] || DEFAULT_CUSTOM_COLORS['--bg-card']);
    const textSecondary = customColors?.['--text-secondary'] || DEFAULT_CUSTOM_COLORS['--text-secondary'];
    document.documentElement.style.setProperty('--border-default', `color-mix(in srgb, ${textSecondary} 27%, transparent)`);
  } else if (theme && theme !== 'dark') {
    document.documentElement.classList.add(theme);
  }
}

function initTheme() {
  const storedTheme = localStorage.getItem('theme') || 'dark';
  let customTheme = {};
  if (storedTheme === 'custom') {
    try {
      customTheme = JSON.parse(localStorage.getItem('customTheme')) || DEFAULT_CUSTOM_COLORS;
    } catch {
      customTheme = DEFAULT_CUSTOM_COLORS;
    }
  }
  applyTheme(storedTheme, customTheme);
}

// Initial load
initTheme();

// Re‑apply when settings are saved (SettingsModal dispatches 'settingsChanged')
window.addEventListener('settingsChanged', () => {
  initTheme();
});

export { initTheme, applyTheme };
