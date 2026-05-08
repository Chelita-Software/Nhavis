import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/shell/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "mecanico") redirect("/mis-ordenes");

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex bg-bg-primary border border-border-tertiary rounded-lg overflow-hidden min-h-[560px]">
          <Sidebar user={{ name: user.name, role: user.role }} />
          <main className="flex-1 p-4 bg-bg-secondary overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
