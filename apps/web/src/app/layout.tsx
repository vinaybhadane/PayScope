import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./workspace.css";
import "./refinement.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { ExperienceBoundary } from "@/components/workspace/ExperienceBoundary";
import { WorkspaceMotion } from "@/components/ui/WorkspaceMotion";
import { DemoWorkspaceBootstrap } from "@/components/workspace/DemoWorkspaceBootstrap";
import { publicPages, publicSite } from "@/lib/public-site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicSite),
  ...publicPages["/"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <DemoWorkspaceBootstrap />
          <WorkspaceMotion />
          <ExperienceBoundary>{children}</ExperienceBoundary>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
