import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "WordDaily | Master Your Vocabulary",
  description: "Spaced-repetition vocabulary learning app.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WordDaily",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-inter antialiased`}>
        <div className="flex flex-col min-height-screen max-w-md mx-auto relative px-4 pb-24 pt-8">
          <header className="mb-8">
            <h1 className="text-3xl font-outfit font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              WordDaily
            </h1>
          </header>

          <main className="flex-1 w-full">
            {children}
          </main>

          <Navigation />
        </div>
      </body>
    </html>
  );
}
