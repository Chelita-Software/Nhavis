import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // mecánicos viven aquí; admin/supervisor pueden visitar (verán el shell)
  return (
    <div className="min-h-screen flex flex-col bg-bg-tertiary max-w-[640px] mx-auto">
      {children}
    </div>
  );
}
