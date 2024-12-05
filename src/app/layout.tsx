import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ThemeRegistry from '@/components/ThemeRegistry';

const inter = Inter({ subsets: ["latin"] });

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
