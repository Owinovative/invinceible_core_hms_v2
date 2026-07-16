import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/providers/app-provider";
import { themeInitScript } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Invinceible Core HMS",
    template: "%s · Invinceible Core HMS",
  },
  description:
    "Enterprise hospital management platform — clinical, billing, pharmacy, laboratory, and inpatient workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetBrainsMono.variable} app-canvas font-sans`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
