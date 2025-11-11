import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { NavigationProvider } from "@/lib/context/navigation-context";
import { Header } from "@/components/navigation/header";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { MobileDrawer } from "@/components/navigation/mobile-drawer";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OHiSee Control of Non-Conforming Products",
  description: "BRCGS-certified non-conformance and maintenance management system for Kangopak (Pty) Ltd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${inter.variable} antialiased`}
      >
        <NavigationProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex flex-1">
              <DesktopSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Breadcrumbs />
                <main className="flex-1 overflow-auto pb-16 lg:pb-0">
                  {children}
                </main>
              </div>
            </div>
            <MobileBottomNav />
            <MobileDrawer />
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}
