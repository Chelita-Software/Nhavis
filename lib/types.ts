export type Role = "admin" | "supervisor" | "mecanico";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  dailyRate: number;
  active: boolean;
  createdAt: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  brand: string;
  model: string;
  year: number;
  plates: string;
  status: "active" | "in_workshop" | "inactive";
  notes?: string;
}

export type ServiceCategory =
  | "reparacion"
  | "rutina"
  | "limpieza"
  | "fumigacion"
  | "otro";

export type PartCategory =
  | "llantas"
  | "frenos"
  | "aceites"
  | "filtros"
  | "luces"
  | "suspension"
  | "otros";

export interface DefaultPart {
  description: string;
  qty: number;
  partCategory: PartCategory;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: ServiceCategory;
  defaultParts: DefaultPart[];
  active: boolean;
}

export interface InventoryItem {
  id: string;
  sku: string;
  description: string;
  unitOfMeasure: string;
  unitCost: number;
  stockCurrent: number;
  stockMinimum: number;
  active: boolean;
}

export type InventoryMovementType = "ingreso" | "egreso";

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  unitCostSnapshot: number;
  purchaseOrderId: string | null;
  workOrderPartId: string | null;
  authorizedBy: string | null;
  notes: string;
  createdAt: string;
}

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrderItem {
  itemId: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  folio: string;
  supplier: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  linkedWorkOrderPartId: string | null;
  createdBy: string;
  createdAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
  notes: string;
}

export type WorkOrderStatus =
  | "scheduled"
  | "in_progress"
  | "pending_approval"
  | "pending_admin_approval"
  | "closed"
  | "cancelled";

export type Priority = "normal" | "alta" | "urgente";

export interface WorkOrder {
  id: string;
  folio: string;
  unitId: string;
  assigneeId: string;
  assigneeRole: "mecanico" | "supervisor";
  createdBy: string;
  status: WorkOrderStatus;
  priority: Priority;
  reason: string;
  scheduledFor: string;
  arrivedAt: string | null;
  openedAt: string;
  submittedAt: string | null;
  supervisorSignedAt: string | null;
  supervisorSignedBy: string | null;
  adminSignedAt: string | null;
  adminSignedBy: string | null;
  closedAt: string | null;
  generalNotes: string;
}

export type ServiceStatus = "pending" | "working" | "waiting_parts" | "done";

export interface WorkOrderService {
  id: string;
  workOrderId: string;
  serviceCatalogId: string | null;
  name: string;
  category: ServiceCategory;
  description: string;
  status: ServiceStatus;
  startTime: string | null;
  endTime: string | null;
  notes: string;
  createdAt: string;
}

export type PartStatus =
  | "requested"
  | "authorized"
  | "waiting_purchase"
  | "rejected";

export interface WorkOrderPart {
  id: string;
  workOrderServiceId: string;
  description: string;
  partCategory: PartCategory;
  quantity: number;
  mechanicNote: string;
  status: PartStatus;

  linkedItemId: string | null;
  linkedAt: string | null;
  linkedBy: string | null;

  unitCostSnapshot: number | null;
  totalCost: number | null;

  purchaseOrderId: string | null;
  authorizedBy: string | null;
  authorizedAt: string | null;
  rejectionReason: string | null;

  createdAt: string;
  createdBy: string;
}

export type PhotoStage = "initial" | "service_done" | "general";

export interface WorkOrderPhoto {
  id: string;
  workOrderId: string;
  workOrderServiceId: string | null;
  stage: PhotoStage;
  uploadedBy: string;
  photoUrl: string;
  caption: string;
  createdAt: string;
}
