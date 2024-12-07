import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user exists in our database
  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  });

  if (!user) {
    redirect("/sign-in");
  }

  return <DashboardClient>{children}</DashboardClient>;
} 