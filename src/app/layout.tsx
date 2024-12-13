"use client";

import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ThemeRegistry from '@/components/ThemeRegistry';
import { useEffect } from 'react';
import { initializeServices } from '@/lib/init';

const inter = Inter({ subsets: ["latin"] });

// Initialize services when server starts
if (process.env.NODE_ENV === 'production') {
  initializeServices().catch(console.error);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
