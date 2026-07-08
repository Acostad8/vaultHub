"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

// Wrapper del provider de next-themes. Se monta una vez en RootLayout.
// attribute="class" -> toggla la clase `.dark` en <html>, que coincide con
// el @custom-variant dark de app/globals.css.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
