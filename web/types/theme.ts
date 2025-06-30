export type ThemeMode = "light" | "dark";

export interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

export interface AppThemeProviderProps {
  children: React.ReactNode;
}
