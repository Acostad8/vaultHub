import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/providers/confirm-dialog";

// Manrope: neo-grotesque geometrica moderna, ligeramente redondeada.
// Legibilidad alta y personalidad neutra apta para producto profesional.
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Mono para chunks de codigo (payload, secret TOTP, etc).
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaultHub",
  description: "Zero-knowledge password manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Saltar al contenido
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
