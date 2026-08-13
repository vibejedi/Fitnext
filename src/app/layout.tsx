import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitNext — Your AI Fitness Coach, forged by the gods",
  description:
    "A gamified AI fitness coach. Pick your god, set your goal, and train. Workouts, macros, recovery — all in one chat.",
  // iOS home-screen install: standalone, marble status bar, proper title
  appleWebApp: {
    capable: true,
    title: "FitNext",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ec",
  width: "device-width",
  initialScale: 1,
  // draw under the iPhone notch/home indicator; safe-area insets handle the rest
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col text-ink">
        {children}
      </body>
    </html>
  );
}
