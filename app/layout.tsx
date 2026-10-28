import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { AppChrome } from "@/components/app-chrome";
import { ServiceWorkerRegister } from "@/components/service-worker";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MyCoWorker",
    template: "%s · MyCoWorker",
  },
  description: "I handle the chats. You close the deals.",
  applicationName: "MyCoWorker",
  authors: [{ name: "OKEREX" }],
  appleWebApp: {
    capable: true,
    title: "MyCoWorker",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full bg-stage font-sans text-ink">
        <Suspense fallback={<div className="mx-auto h-dvh w-full max-w-[430px] bg-white" />}>
          <AppChrome>{children}</AppChrome>
        </Suspense>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
