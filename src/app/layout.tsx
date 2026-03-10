import type { Metadata } from "next";
import { Wix_Madefor_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const wixMadeforDisplay = Wix_Madefor_Display({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fragmento",
  description: "Design tokens that scale with your team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${wixMadeforDisplay.variable} ${geistMono.variable} antialiased font-sans`}
      >
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
