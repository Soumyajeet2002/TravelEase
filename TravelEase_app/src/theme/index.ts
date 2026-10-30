
export const theme = {
  colors: {
    background: "#000000",
    surface: "#111111",
    surfaceElevated: "#1A1A1A",
    textPrimary: "#FFFFFF",
    textSecondary: "#D0D0D0",
    textMuted: "#8A8A8A",
    border: "#333333",
    primary: "#FFFFFF",
    onPrimary: "#000000",
    danger: "#FF453A",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    pill: 999,
  },

  typography: {
    small: 12,
    body: 14,
    subtitle: 16,
    title: 24,
    heading: 30,
  },
} as const;


export type AppTheme = typeof theme;
