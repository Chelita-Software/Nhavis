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
    <div className="h-screen flex flex-col p-4 lg:p-6 overflow-hidden">
      <div className="max-w-[1100px] lg:max-w-[1400px] xl:max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="flex flex-1 min-h-0 bg-bg-primary border border-border-tertiary rounded-lg overflow-hidden">
          <Sidebar user={{ name: user.name, role: user.role }} />
          <main className="flex-1 p-4 bg-bg-secondary overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
