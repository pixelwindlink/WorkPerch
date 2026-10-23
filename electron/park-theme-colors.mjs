export const DEFAULT_PARK_THEME = Object.freeze({
  accent: "#dfff4f",
});

export function sanitizeCssHexColor(value, fallback = DEFAULT_PARK_THEME.accent) {
  const candidate = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(candidate)) return candidate;
  return fallback;
}

export function normalizeParkTheme(theme) {
  return {
    accent: sanitizeCssHexColor(theme?.accent),
  };
}

export async function readPerchThemeColors(browserWindow) {
  if (!browserWindow || browserWindow.isDestroyed()) return { ...DEFAULT_PARK_THEME };
  try {
    const theme = await browserWindow.webContents.executeJavaScript(`(() => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      return { accent };
    })()`);
    return normalizeParkTheme(theme);
  } catch {
    return { ...DEFAULT_PARK_THEME };
  }
}
