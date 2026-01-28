import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VERA | AI Content Intelligence Platform",
  description: "AI-powered content research, trend monitoring, and creative generation platform by InnovareAI",
  keywords: ["AI", "content", "research", "trends", "marketing", "automation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
