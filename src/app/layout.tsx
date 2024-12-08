"use client";

import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ThemeRegistry from '@/components/ThemeRegistry';
import { useEffect } from 'react';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize WebSocket connections
    fetch('/api/init').catch(console.error);
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </ClerkProvider>
      </body>
    </html>
  );
}
