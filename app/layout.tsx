import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

// Still used for key fingerprints and the ciphertext demo on the landing page.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whisperbox-messenger.vercel.app/"),

  title: {
    default: "WhisperBox — Private, End-to-End Encrypted Messaging",
    template: "%s · WhisperBox",
  },

  description:
    "WhisperBox is a private, end-to-end encrypted messaging platform. Your messages are encrypted on your device and never readable by the server.",

  applicationName: "WhisperBox",

  keywords: [
    "WhisperBox",
    "private messaging",
    "secure messaging",
    "encrypted messaging",
    "end-to-end encryption",
    "private chat",
    "secure chat",
  ],

  authors: [
    {
      name: "Ukanna Raymond",
    },
  ],

  creator: "Ukanna Raymond",
  publisher: "Ukanna Raymond",

  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    siteName: "WhisperBox",
    title: "WhisperBox — Private, End-to-End Encrypted Messaging",
    description:
      "Private conversations with end-to-end encryption. Your messages are encrypted on your device before they are sent.",
    url: "https://your-domain.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WhisperBox — Private, End-to-End Encrypted Messaging",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "WhisperBox — Private, End-to-End Encrypted Messaging",
    description: "Private conversations with end-to-end encryption.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the chat screens extend under the notch / home indicator; the app shell
  // pads itself with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f2f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2c32" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground sr-only rounded-md border px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
        >
          Skip to main content
        </a>
        <AppProviders>
          <div id="main-content" className="flex min-h-full flex-1 flex-col">
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
