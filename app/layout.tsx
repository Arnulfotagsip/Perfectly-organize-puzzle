import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import Script from "next/script";
import { SettingsSync } from "@/components/ui/SettingsSync";
import { SAVE_KEY } from "@/lib/persistence/progress";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perfectly Organized",
  description: "Arrange. Organize. Feel Good. A cozy organization puzzle game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf5ec",
};

// Applies the saved theme/motion before first paint so there's no flash of the default theme.
const bootstrap = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})||"{}").settings||{};var d=document.documentElement;if(s.theme)d.dataset.theme=s.theme;if(s.motion)d.dataset.motion=s.motion;}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="cream" data-motion="system" className={`${nunito.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="po-theme" strategy="beforeInteractive">
          {bootstrap}
        </Script>
        <SettingsSync />
        {children}
      </body>
    </html>
  );
}
