import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/providers/app-provider";
import { themeInitScript } from "@/lib/theme";

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
      <body suppressHydrationWarning className="app-canvas font-sans">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
