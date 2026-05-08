import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  InventoryItem,
  InventoryMovement,
  PurchaseOrder,
  ServiceCatalogItem,
  Unit,
  User,
  WorkOrder,
  WorkOrderPart,
  WorkOrderPhoto,
  WorkOrderService,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

const FILES = {
  users: "users.json",
  units: "units.json",
  serviceCatalog: "service-catalog.json",
  inventoryItems: "inventory-items.json",
  inventoryMovements: "inventory-movements.json",
  purchaseOrders: "purchase-orders.json",
  workOrders: "work-orders.json",
  workOrderServices: "work-order-services.json",
  workOrderParts: "work-order-parts.json",
  workOrderPhotos: "work-order-photos.json",
} as const;

type FileKey = keyof typeof FILES;

interface CollectionMap {
  users: User;
  units: Unit;
  serviceCatalog: ServiceCatalogItem;
  inventoryItems: InventoryItem;
  inventoryMovements: InventoryMovement;
  purchaseOrders: PurchaseOrder;
  workOrders: WorkOrder;
  workOrderServices: WorkOrderService;
  workOrderParts: WorkOrderPart;
  workOrderPhotos: WorkOrderPhoto;
}

const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((res) => (release = res));
  locks.set(
    file,
    prev.then(() => next),
  );
  try {
    await prev;
    return await fn();
  } finally {
    release!();
    if (locks.get(file) === next) locks.delete(file);
  }
}

async function readRaw<T>(file: string): Promise<T[]> {
  const full = path.join(DATA_DIR, file);
  try {
    const txt = await fs.readFile(full, "utf8");
    return JSON.parse(txt) as T[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeRaw<T>(file: string, data: T[]): Promise<void> {
  const full = path.join(DATA_DIR, file);
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${full}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, full);
}

export async function readAll<K extends FileKey>(key: K): Promise<CollectionMap[K][]> {
  return readRaw<CollectionMap[K]>(FILES[key]);
}

export async function writeAll<K extends FileKey>(
  key: K,
  data: CollectionMap[K][],
): Promise<void> {
  await withLock(FILES[key], () => writeRaw(FILES[key], data));
}

export async function findById<K extends FileKey>(
  key: K,
  id: string,
): Promise<CollectionMap[K] | null> {
  const all = (await readAll(key)) as Array<CollectionMap[K] & { id: string }>;
  return all.find((r) => r.id === id) ?? null;
}

export async function insert<K extends FileKey>(
  key: K,
  record: CollectionMap[K],
): Promise<CollectionMap[K]> {
  await withLock(FILES[key], async () => {
    const all = await readRaw<CollectionMap[K]>(FILES[key]);
    all.push(record);
    await writeRaw(FILES[key], all);
  });
  return record;
}

export async function patchById<K extends FileKey>(
  key: K,
  id: string,
  patch: Partial<CollectionMap[K]>,
): Promise<CollectionMap[K] | null> {
  return withLock(FILES[key], async () => {
    const all = (await readRaw<CollectionMap[K]>(FILES[key])) as Array<
      CollectionMap[K] & { id: string }
    >;
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const merged = { ...all[idx], ...patch } as CollectionMap[K];
    all[idx] = merged as CollectionMap[K] & { id: string };
    await writeRaw(FILES[key], all);
    return merged;
  });
}

export async function removeById<K extends FileKey>(
  key: K,
  id: string,
): Promise<boolean> {
  return withLock(FILES[key], async () => {
    const all = (await readRaw<CollectionMap[K]>(FILES[key])) as Array<
      CollectionMap[K] & { id: string }
    >;
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    all.splice(idx, 1);
    await writeRaw(FILES[key], all);
    return true;
  });
}

/** Run a transactional update over a collection while holding its lock. */
export async function transact<K extends FileKey, T>(
  key: K,
  fn: (records: CollectionMap[K][]) => Promise<{ records: CollectionMap[K][]; result: T }>,
): Promise<T> {
  return withLock(FILES[key], async () => {
    const all = await readRaw<CollectionMap[K]>(FILES[key]);
    const { records, result } = await fn(all);
    await writeRaw(FILES[key], records);
    return result;
  });
}
