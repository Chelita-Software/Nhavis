import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { findById, readAll } from "@/lib/db";
import { canSeeCosts } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { MetricCard, MetricsGrid } from "@/components/ui/Metric";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ServiceRow } from "@/components/orders/ServiceRow";
import {
  workOrderStatusLabel,
  workOrderStatusVariant,
  canSubmitOrder,
} from "@/lib/order-helpers";
import { formatDate, formatMoney } from "@/lib/format";
import { OrderActions } from "./OrderActions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["admin", "supervisor"]);
  const order = await findById("workOrders", id);
  if (!order) notFound();

  const [unit, services, parts, photos, users] = await Promise.all([
    findById("units", order.unitId),
    readAll("workOrderServices"),
    readAll("workOrderParts"),
    readAll("workOrderPhotos"),
    readAll("users"),
  ]);

  const ownServices = services.filter((s) => s.workOrderId === order.id);
  const svcIds = new Set(ownServices.map((s) => s.id));
  const ownParts = parts.filter((p) => svcIds.has(p.workOrderServiceId));
  const ownPhotos = photos.filter((p) => p.workOrderId === order.id);
  const assignee = users.find((u) => u.id === order.assigneeId);
  const supervisorSigner = users.find(
    (u) => u.id === order.supervisorSignedBy,
  );
  const adminSigner = users.find((u) => u.id === order.adminSignedBy);

  const showCosts = canSeeCosts(user);

  // Cost breakdowns (only meaningful for admin)
  const partsCost = ownParts.reduce(
    (acc, p) =>
      acc +
      (p.status === "authorized" || p.status === "waiting_purchase"
        ? p.totalCost ?? 0
        : 0),
    0,
  );

  const pendingPartsCount = ownParts.filter(
    (p) => p.status === "requested",
  ).length;

  return (
    <>
      <PageHeader
        title={`${order.folio} · ${unit?.unitNumber ?? "—"}`}
        sub={
          <>
            {unit ? `${unit.brand} ${unit.model} · ` : ""}
            Asignado a {assignee?.name ?? "—"} ·{" "}
            <Badge variant={workOrderStatusVariant(order.status)}>
              {workOrderStatusLabel(order.status)}
            </Badge>
          </>
        }
        actions={
          <Link href="/ordenes">
            <Button>← Lista</Button>
          </Link>
        }
      />

      {showCosts && (
        <div className="bg-[#EDE9FE] border border-[#C4B5FD] rounded-md px-3 py-2 mb-3 text-xs text-[#4C1D95] flex items-center gap-2">
          👁 <strong>Vista Admin</strong> — Costos visibles únicamente para
          administradores.
        </div>
      )}

      {pendingPartsCount > 0 && (
        <Banner tone="danger">
          <strong>{pendingPartsCount}</strong> refacciones esperando
          vinculación.{" "}
          <Link href={`/ordenes/${order.id}/refacciones`} className="underline">
            Ir a vincular
          </Link>
        </Banner>
      )}

      <Card className="mb-3 p-3">
        <SectionLabel>Información de la orden</SectionLabel>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <Field label="Motivo de entrada" value={order.reason || "—"} />
          <Field
            label="Programada para"
            value={formatDate(order.scheduledFor, true)}
          />
          <Field label="Llegó al taller" value={formatDate(order.arrivedAt, true)} />
          <Field label="Apertura" value={formatDate(order.openedAt, true)} />
          {order.submittedAt && (
            <Field label="Solicitud cierre" value={formatDate(order.submittedAt, true)} />
          )}
          {order.closedAt && (
            <Field label="Cerrada" value={formatDate(order.closedAt, true)} />
          )}
        </div>
      </Card>

      {showCosts && (
        <MetricsGrid cols={3}>
          <MetricCard
            label="Refacciones (vinculadas)"
            value={formatMoney(partsCost)}
            sub={`${ownParts.filter((p) => p.linkedItemId).length} líneas`}
            valueClass="text-[18px]"
          />
          <MetricCard
            label="Refacciones por vincular"
            value={pendingPartsCount}
            sub="Acción pendiente"
            valueClass="text-[18px]"
          />
          <MetricCard
            label="Total estimado"
            value={formatMoney(partsCost)}
            sub={order.status === "closed" ? "Cerrada" : "En proceso"}
            highlight
            valueClass="text-[18px] text-[#4C1D95]"
          />
        </MetricsGrid>
      )}

      <SectionLabel>Servicios</SectionLabel>

      {ownServices.length === 0 ? (
        <div className="card-base p-5 text-center text-text-secondary text-xs">
          Sin servicios todavía. El mecánico puede agregarlos al iniciar la
          inspección.
        </div>
      ) : (
        ownServices.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            parts={ownParts.filter((p) => p.workOrderServiceId === s.id)}
            showCosts={showCosts}
          />
        ))
      )}

      {ownPhotos.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Fotos ({ownPhotos.length})</SectionLabel>
          <div className="flex gap-2 flex-wrap">
            {ownPhotos.map((p) => (
              <div
                key={p.id}
                className="bg-bg-primary border border-border-tertiary rounded-md p-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl}
                  alt={p.caption}
                  className="w-24 h-20 object-cover rounded"
                />
                <div className="text-[10px] text-text-tertiary mt-1 max-w-[96px] truncate">
                  {p.caption || p.stage}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="mt-4">
        <SectionLabel>Firmas y cierre</SectionLabel>
        <div className="grid grid-cols-2 gap-3 text-[11px] mb-3">
          <SignBox
            label="Supervisor (revisión)"
            signedAt={order.supervisorSignedAt}
            signer={supervisorSigner?.name}
          />
          <SignBox
            label="Admin (aprobación final)"
            signedAt={order.adminSignedAt}
            signer={adminSigner?.name}
          />
        </div>
        <OrderActions
          orderId={order.id}
          orderStatus={order.status}
          canSupervisorSign={
            order.status === "pending_approval" &&
            (user.role === "supervisor" || user.role === "admin")
          }
          canAdminSign={
            (order.status === "pending_admin_approval" ||
              order.status === "pending_approval") &&
            user.role === "admin"
          }
          canSubmit={
            order.status === "in_progress" && canSubmitOrder(ownServices)
          }
        />
      </Card>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider">
        {label}
      </div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}

function SignBox({
  label,
  signedAt,
  signer,
}: {
  label: string;
  signedAt: string | null;
  signer?: string;
}) {
  const signed = !!signedAt;
  return (
    <div
      className={
        "rounded-md p-3 text-center " +
        (signed
          ? "border border-[#22C55E] bg-[#F0FDF4] text-[#15803D]"
          : "border border-dashed border-border-secondary bg-bg-secondary text-text-tertiary")
      }
    >
      <div className="text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xs font-medium">
        {signed ? `${signer ?? "—"}` : "Sin firmar"}
      </div>
      {signedAt && (
        <div className="text-[10px] mt-0.5">{formatDate(signedAt, true)}</div>
      )}
    </div>
  );
}
