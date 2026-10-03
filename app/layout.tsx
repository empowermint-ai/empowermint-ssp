import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";
import InstallPromptCapture from "./install-prompt-capture";
import ToastProvider from "@/components/i18n/ToastProvider";
import LanguageProvider from "@/components/i18n/LanguageProvider";
import LanguageSync from "@/components/i18n/LanguageSync";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "empower",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link
          rel="preload"
          href="/fonts/InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
            <LanguageProvider>
              <ServiceWorkerRegister />
              <InstallPromptCapture />
              <LanguageSync />
              {children}
            </LanguageProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
      {process.env.NODE_ENV === "production" && (
        <GoogleAnalytics gaId="G-NKGQK1RGCW" />
      )}
    </html>
  );
}
