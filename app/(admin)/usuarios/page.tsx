import { requireRole } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { CreateUserForm } from "./CreateUserForm";
import { formatMoney } from "@/lib/format";

export default async function UsersPage() {
  await requireRole(["admin"]);
  const users = await readAll("users");
  return (
    <>
      <PageHeader
        title="Usuarios del sistema"
        sub={`${users.filter((u) => u.active).length} activos`}
      />

      <Card className="mb-3 p-3">
        <Table>
          <THead>
            <TH>Usuario</TH>
            <TH>Correo</TH>
            <TH>Rol</TH>
            <TH>Sueldo/día</TH>
            <TH>Estado</TH>
          </THead>
          <tbody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD>
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} role={u.role} size="sm" />
                    <span>{u.name}</span>
                  </div>
                </TD>
                <TD className="text-text-secondary">{u.email}</TD>
                <TD>
                  <Badge variant={u.role}>
                    {u.role === "admin"
                      ? "Admin"
                      : u.role === "supervisor"
                        ? "Supervisor"
                        : "Mecánico"}
                  </Badge>
                </TD>
                <TD>{u.dailyRate ? formatMoney(u.dailyRate) : "—"}</TD>
                <TD>
                  <span
                    className={
                      "text-[11px] " +
                      (u.active ? "text-text-success" : "text-text-tertiary")
                    }
                  >
                    {u.active ? "● Activo" : "○ Inactivo"}
                  </span>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <CreateUserForm />
    </>
  );
}
