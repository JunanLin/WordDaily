import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import TimezoneUpdater from "@/components/TimezoneUpdater";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "WordDaily | Master Your Vocabulary",
  description: "Spaced-repetition vocabulary learning app.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
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

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', user.id)
      .single();
    userProfile = data;
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${outfit.variable} font-inter antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <div className="flex flex-col min-height-screen max-w-md mx-auto relative px-4 pb-24 pt-8">
            <header className="mb-8">
              <h1 className="text-3xl font-outfit font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                WordDaily
              </h1>
            </header>

            <main className="flex-1 w-full">
              {children}
            </main>

            {user && (
              <>
                <Navigation />
                <TimezoneUpdater initialTimezone={userProfile?.timezone || null} />
              </>
            )}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
