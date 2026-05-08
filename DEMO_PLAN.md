# NHAVIS — Demo Plan: Orden de Reparación

> Stack: **Next.js 15 (App Router) + TypeScript + React + Tailwind CSS** with **JSON files as mock storage**. Single-process demo, no real DB, no real auth.

---

## 1. Resumen del análisis de `Grupo NHAVIS/`

Documentos revisados:

- [NHAVIS_Contexto_Proyecto_v1.docx](../../Downloads/Grupo%20NHAVIS/NHAVIS_Contexto_Proyecto_v1.docx) — narrativo del proyecto.
- [NHAVIS_Arquitectura_Tecnica_v1.docx](../../Downloads/Grupo%20NHAVIS/NHAVIS_Arquitectura_Tecnica_v1.docx) — esquema de BD (13 tablas).
- [NHAVIS_Mockup_M0_Roles.html](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M0_Roles.html) — mockups de Login y Roles.
- [NHAVIS_Mockup_M4_Ordenes.html](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — 9 pantallas de Órdenes (referencia visual principal).
- [ScanerdeChecklist/](../../Downloads/Grupo%20NHAVIS/ScanerdeChecklist/) — formulario físico digitalizable.

### 1.1 Módulos del sistema real (resumen)

| Módulo | Nombre | Para el demo |
|---|---|---|
| M0 | Personal y Roles | **SÍ** (simplificado) |
| M1 | Unidades (ECOs / NSLs) | **SÍ** (un solo tipo "Unidad/Truck") |
| M2 | Almacén / Inventario | **SÍ** (control de stock + compras) |
| M3 | Catálogo de Servicios | **SÍ** |
| M4 | **Órdenes de Reparación** | **SÍ — NÚCLEO DEL DEMO** |
| M5 | Reportes / Dashboard | Mini-dashboard básico |

### 1.2 Roles del sistema real → simplificación para el demo

El sistema real tiene 4 roles. Para el demo **se simplifican a 3 perfiles**, alineados con el brief ("admins/supervisors crean órdenes, se asigna a mecánico o supervisor"):

| Rol real | Demo | Qué hace en el demo |
|---|---|---|
| Super Admin / Gerente | **Admin** (escritorio) | Crea órdenes, ABM de usuarios/unidades/catálogos, autoriza piezas, **aprueba cierre**, gestiona stock y compras, **ve costos**. |
| Supervisor | **Supervisor** (escritorio) | Crea órdenes, **puede ser asignado a una orden**, valida el trabajo del mecánico, **firma revisión** previa al cierre. **No ve costos**. |
| Mecánico | **Mecánico** (móvil) | Recibe órdenes asignadas, ejecuta flujo paso a paso, sube fotos, agrega servicios/refacciones, cierra servicios y solicita cierre de orden. **No ve costos**. |

> **Asignación de la orden**: el campo `assigneeId` puede apuntar a un usuario con rol `mecanico` **o** `supervisor`. Si el asignado es un supervisor, también puede recorrer el wizard mobile, pero típicamente trabajará desde escritorio. Esto cubre literalmente el brief: *"is asigned either to a mechanic or a supervisor"*.

> **Login real solo con email** (sin password). En `/login` el usuario captura su correo; el servidor lo busca en `users.json`, valida que esté `active` y emite una cookie de sesión httpOnly firmada con el `userId`. La cookie es lo que `getCurrentUser()` lee en cada request. `/logout` la borra. No hay switcher de perfil — para cambiar de rol se hace logout + login con otro email semilla. Esto mantiene el demo realista (rutas protegidas, redirección a `/login`, layouts dependientes del rol del usuario actual) sin la complejidad de password/recovery.

### 1.3 Decisiones de simplificación para el demo

- **Unidades unificadas**: una sola entidad `Unit` (Truck) con `unitNumber`, marca, modelo, año, placas. Sin distinguir ECO/NSL.
- **Login real solo con email** (sin password). Pantalla `/login` minimalista alineada con el mockup M0 (`#s-login`), pero con un solo campo `email` y botón "Entrar". Sesión via cookie httpOnly firmada (HMAC con un secreto en `.env.local`). Middleware de Next.js redirige a `/login` cualquier ruta si no hay sesión; redirige a la home apropiada (admin o mobile) según el rol del usuario logueado.
- **Sin firmas dibujadas**: el "firmado" es un botón con timestamp + nombre del usuario actual de la sesión. Hay **dos firmas en cierre**: Supervisor (revisión) y Admin (aprobación final).
- **Sin checklist primordial bloqueante por ahora**: en su lugar, el flujo del mecánico es un **wizard de pasos** (ver §3.2). El checklist físico digitalizado queda como referencia visual pero **no es parte del MVP del demo** (se puede agregar después como una sub-pantalla del wizard).
- **Costos visibles solo para Admin** (regla del sistema real preservada). Supervisor y Mecánico no ven ningún precio.
- **Orden creada antes de la llegada**: la orden nace en estado `scheduled`. Cuando el mecánico (o el admin) marca *"Unidad llegó al taller"* en el hub mobile, transiciona a `in_progress` y se desbloquea el wizard. Esto refleja el brief: *"An order is created prior to the truck arrives"*.
- **Refacciones abstractas (clave del demo)**: el mecánico **NO** elige SKUs ni ve stock ni precios. Pide refacciones en lenguaje libre — descripción + cantidad — agrupadas por servicio. El **aprobador (Admin / Supervisor)** es quien después **vincula** cada refacción abstracta a un `inventory_item` real del catálogo. Ese paso de vinculación es donde se materializan stock, precios y la decisión de "descontar de almacén" o "crear OC". Detalle completo en §1.5.
- **Sin almacenamiento real de fotos**: las fotos se guardan como `data:` URLs en el JSON o se copia el archivo a `public/uploads/` con nombre generado. Suficiente para mostrar miniaturas y previsualización.
- **Persistencia**: archivos JSON dentro de `/data/*.json`, mutados desde rutas de API server-side.

### 1.5 Modelo de "Refacciones abstractas" → vinculación por aprobador

> **Por qué**: el mecánico está en el taller con guantes, prisa y un teléfono. Pedirle que navegue un catálogo de SKUs y revise stock es fricción innecesaria. La separación **abstracto vs catálogo** se mapea naturalmente a los roles: el mecánico sabe qué pieza necesita en lenguaje humano; el aprobador sabe qué hay en almacén y qué precio tiene.

**Lado del Mecánico (mobile):**
- En la sub-pantalla *Refacciones* de un servicio, el mecánico ve y edita una lista de refacciones abstractas:
  - `description` (texto libre, ej. "Llanta 295/75R22.5", "Kit balatas traseras", "Aceite 15W40")
  - `category` opcional (chip: Llantas / Frenos / Aceites / Filtros / Otros)
  - `quantity`
  - `notes` opcional (justificación)
- Las refacciones precargadas desde el catálogo de servicios son **plantillas abstractas** (descripción + cantidad sugerida), no apuntan a SKUs.
- El mecánico **agrega**, **edita cantidades** ("agregar más llantas") y **elimina** entradas.
- Estado visible para el mecánico por refacción: `Solicitada` → `Aprobada` (lista para usar) / `Esperando compra` / `Rechazada`. Nada más.
- **Nunca** ve precios, SKUs, niveles de stock ni decide si hay que comprar.

**Lado del Aprobador (escritorio):**
- Bandeja **"Refacciones por vincular"** (Admin y Supervisor): lista todas las solicitudes en estado `requested`.
- Por cada solicitud el aprobador:
  1. **Vincula** un `inventory_item` (selector con búsqueda por descripción/SKU). Sugerencias automáticas por coincidencia de texto si la `description` matchea con algún ítem.
  2. Decide acción:
     - **Autorizar desde stock** → descuenta inventario, registra movimiento, fija `unitCostSnapshot` con el precio actual del ítem.
     - **Generar Orden de Compra** → crea OC vinculada a esta refacción (proveedor, precio, cantidad). Servicio cambia a `waiting_parts`. Al recibir la OC → la refacción pasa a `authorized` automáticamente.
     - **Rechazar** con motivo.
- Solo Admin **ve costos** del work-order. Supervisor puede vincular y generar OCs pero no ve precios.

**Ventajas para el demo:**
- UX mecánico drásticamente más simple: 1 input de texto + cantidad + categoría.
- El control financiero queda 100% del lado de quien tiene contexto (aprobador con visibilidad de catálogo, stock y proveedores).
- No se mezclan responsabilidades: el mecánico declara la **necesidad técnica**, el aprobador resuelve la **necesidad logística**.

### 1.4 Trazabilidad: brief del usuario → secciones del plan

| Requisito del brief | Cubierto en |
|---|---|
| Módulo principal "Orden de Reparación" que rastrea estados | §3, §4 (`work-orders.json`), §3.3 |
| Orden creada **antes** de que llegue el camión, por admins/supervisores | §1.3 (estado `scheduled`), §3.1 paso 2, §3.3 |
| Lista de servicios fijos del catálogo (Cambio de llantas, Frenos, Fumigación) | §4 (`service-catalog.json`), §7 (semilla 6 servicios) |
| Asignación a **mecánico o supervisor** | §1.2 (3 roles), §4 (`assigneeId` + `assigneeRole`) |
| UI móvil para mecánicos, paso a paso (cambia pantallas) | §3.2 wizard, §5.3 mobile, §2.2 ruta `(mobile)/orden/[id]/flujo/...` |
| Cargar fotos de evidencia inicial (al llegar la unidad) | §3.2 paso 1 *Inicio*, `work-order-photos.json` con `stage: initial` |
| Agregar servicios extra detectados durante inspección | §3.2 paso 2 *Inspección*, también desde el hub |
| Refacciones por servicio, **catálogo prellena pero editable** (ej. agregar más llantas) | §1.5 (abstracto), §3.2 paso 3 *Refacciones*, §4 `service-catalog.defaultParts` (plantillas abstractas) |
| Estado individual por servicio: working / waiting for refactions / done | §3.3 estados de `Servicio` |
| Cerrar servicio con evidencia + cerrar orden cuando todos están completos | §3.2 sub-pantalla *Evidencias*, paso final *Enviar a aprobación* |
| Orden pendiente tras revisión hasta completar todo | Estado `in_progress`; bloqueo "Solicitar cierre" hasta que todos los servicios estén `done` |
| Mecánico → móvil simple | §1.5 (refacciones abstractas), §5.3 reglas mobile (tap targets, bottom action bar, una pantalla por paso) |
| Módulos complementarios: unidades, usuarios | §3.1.9, rutas `unidades/`, `usuarios/` |
| Refacciones en stock + control de stock | §3.1.6, §3.1.7, `inventory-items.json`, alertas bajo mínimo |
| Asignar refacción de stock a un servicio dentro del flujo | §1.5 (vinculación por aprobador) → autoriza desde stock |
| Si no hay stock → crear orden de compra + tracking | §1.5 (aprobador genera OC), §3.1.8, `purchase-orders.json` |
| **Control de precios** entre compras | §4 `purchase-orders.json` (cada OC con precios) + §3.1.7 *Historial de precios por ítem* |
| Compras manuales | §3.1.8 (crear OC sin orden de trabajo asociada) |
| Operaciones manuales de stock fuera del flujo de órdenes | §3.1.9, ruta `almacen/movimientos` |

---

## 2. Arquitectura del demo

### 2.1 Stack y librerías

- **Next.js 15** (App Router, RSC, server actions, route handlers).
- **TypeScript** estricto.
- **Tailwind CSS** — los tokens de color y radios del mockup ya son CSS vars; se trasladan tal cual a `globals.css` y a `tailwind.config.ts`.
- **shadcn/ui** *opcional* para inputs/selects/dialogs accesibles, manteniendo el estilo del mockup.
- **zod** para validación de formularios y de los JSON al leerlos.
- **clsx** + `class-variance-authority` para variantes de badges/buttons.
- **lucide-react** para iconos (reemplaza los caracteres ▦ ◎ ▣ del mockup por íconos limpios, manteniendo el peso visual).

### 2.2 Estructura de carpetas

```
nhavis-demo/
├── app/
│   ├── layout.tsx                    # Layout raíz + SessionProvider
│   ├── page.tsx                      # Redirige según rol del usuario actual (o a /login)
│   ├── login/page.tsx                # Login con un solo campo email
│   ├── logout/route.ts               # GET: borra cookie, redirige a /login
│   ├── middleware.ts                 # Protege rutas, redirige a /login sin sesión
│   ├── (admin)/                      # Layout escritorio (sidebar + main)
│   │   ├── layout.tsx                # Acceso: admin | supervisor
│   │   ├── dashboard/page.tsx
│   │   ├── ordenes/
│   │   │   ├── page.tsx              # Lista (S1 del mockup)
│   │   │   ├── nueva/page.tsx        # Form nueva orden (S2) — admin o supervisor
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Detalle (S6) — costos sólo si admin
│   │   │       ├── refacciones/page.tsx # Vincular + autorizar refacciones (S7 ampliado)
│   │   │       └── cierre/page.tsx   # Firma supervisor → admin (S9)
│   │   ├── refacciones-pendientes/page.tsx # Bandeja global de refacciones por vincular
│   │   ├── unidades/page.tsx
│   │   ├── usuarios/page.tsx         # (M0 Roles) — sólo admin
│   │   ├── catalogo-servicios/page.tsx
│   │   ├── almacen/
│   │   │   ├── page.tsx              # Stock + alertas mínimo
│   │   │   ├── [itemId]/page.tsx     # Detalle ítem + Historial de precios
│   │   │   ├── movimientos/page.tsx  # Movimientos manuales (ingreso/egreso)
│   │   │   └── compras/
│   │   │       ├── page.tsx          # Lista de OC
│   │   │       ├── nueva/page.tsx    # OC manual
│   │   │       └── [id]/page.tsx     # Detalle OC + recibir
│   │   └── reportes/page.tsx
│   ├── (mobile)/                     # Layout mobile-first (sin sidebar)
│   │   ├── layout.tsx                # Acceso: mecánico (y supervisor si está asignado)
│   │   ├── mis-ordenes/page.tsx      # Lista de órdenes asignadas (scheduled + in_progress)
│   │   └── orden/[id]/
│   │       ├── page.tsx              # Hub: marcar llegada + lista de servicios
│   │       └── flujo/                # WIZARD paso a paso
│   │           ├── inicio/page.tsx                # Paso 1: fotos evidencia inicial
│   │           ├── inspeccion/page.tsx            # Paso 2: agregar servicios extra
│   │           ├── servicio/[svcId]/
│   │           │   ├── page.tsx                   # Paso 3: trabajar (resumen + estado)
│   │           │   ├── refacciones/page.tsx       # Sub: editar piezas + OC si no hay stock
│   │           │   └── evidencias/page.tsx        # Sub: fotos de cierre del servicio
│   │           └── enviar/page.tsx                # Paso final: solicitar cierre
│   └── api/
│       ├── auth/login/route.ts                    # POST { email } → setea cookie de sesión
│       ├── auth/me/route.ts                       # GET usuario actual (o 401)
│       ├── orders/route.ts                        # GET list / POST create (scheduled)
│       ├── orders/[id]/route.ts                   # GET / PATCH (estado, asignee, motivo)
│       ├── orders/[id]/arrive/route.ts            # POST: marca llegada → in_progress
│       ├── orders/[id]/submit/route.ts            # POST: in_progress → pending_approval
│       ├── orders/[id]/sign-supervisor/route.ts   # POST: → pending_admin_approval
│       ├── orders/[id]/sign-admin/route.ts        # POST: → closed
│       ├── orders/[id]/services/route.ts          # GET / POST (agregar servicio extra)
│       ├── orders/[id]/services/[svcId]/route.ts  # PATCH (estado, notas) / DELETE
│       ├── orders/[id]/services/[svcId]/close/route.ts # POST: cerrar servicio (requiere foto)
│       ├── orders/[id]/services/[svcId]/parts/route.ts # GET / POST refacción abstracta / PATCH / DELETE (mecánico)
│       ├── orders/[id]/parts/[partId]/link/route.ts      # POST vincular a inventory_item (aprobador)
│       ├── orders/[id]/parts/[partId]/authorize/route.ts # POST autorizar desde stock (aprobador)
│       ├── orders/[id]/parts/[partId]/reject/route.ts    # POST rechazar con motivo
│       ├── orders/[id]/parts/[partId]/purchase/route.ts  # POST generar OC desde la refacción
│       ├── orders/[id]/photos/route.ts            # POST upload (initial | service_done)
│       ├── inventory/route.ts                     # CRUD ítems
│       ├── inventory/[itemId]/price-history/route.ts # GET historial de precios desde OCs
│       ├── inventory/movements/route.ts           # POST manual ingreso/egreso
│       ├── purchase-orders/route.ts               # GET list / POST create (manual o desde flow)
│       ├── purchase-orders/[id]/route.ts          # GET / PATCH
│       ├── purchase-orders/[id]/receive/route.ts  # POST: marca recibida → +stock
│       ├── units/route.ts
│       ├── users/route.ts
│       └── service-catalog/route.ts
├── components/
│   ├── ui/                  # button, badge, card, input, select, dialog…
│   ├── shell/               # Sidebar, MobileHeader, ProfileSwitcher
│   ├── orders/              # OrderCard, ServiceRow, PartRow, StatusBadge
│   ├── wizard/              # StepHeader, StepFooter, ProgressDots
│   └── photos/              # PhotoUploader (file input → base64)
├── lib/
│   ├── db.ts                # readJson<T>(file) / writeJson(file, data) con lock en memoria
│   ├── session.ts           # signSession() / verifySession() (HMAC) + cookie helpers
│   ├── auth.ts              # getCurrentUser() (server-only), loginWithEmail(email), logout()
│   ├── ids.ts               # uuid + folio generator OT-2026-XXXX, OC-2026-XXXX
│   ├── permissions.ts       # canSeeCosts(user), canAuthorizeParts(user), canAssignRole(...)
│   └── schemas/             # zod schemas por entidad
├── data/                    # JSON mock — uno por entidad (ver §4)
│   ├── users.json
│   ├── units.json
│   ├── service-catalog.json
│   ├── inventory-items.json
│   ├── inventory-movements.json
│   ├── purchase-orders.json
│   ├── work-orders.json
│   ├── work-order-services.json
│   ├── work-order-parts.json
│   └── work-order-photos.json
├── public/uploads/          # fotos guardadas (opcional)
├── styles/globals.css       # CSS vars del mockup → root
├── tailwind.config.ts
└── package.json
```

### 2.3 Autenticación (login real, solo email)

**Flujo:**
1. Usuario va a `/login` → ve un solo input `email` y botón "Entrar".
2. Submit → `POST /api/auth/login` con `{ email }`. El handler busca el correo en `users.json` (case-insensitive), valida `active: true`. Si no existe → 401 + mensaje "Correo no registrado o inactivo".
3. Si OK → server firma una cookie httpOnly `nhavis_session` con `{ userId, role, exp }` usando HMAC-SHA256 (`AUTH_SECRET` en `.env.local`). Cookie `Secure` en prod, `Lax`. TTL 7 días.
4. Redirige según rol: `admin`/`supervisor` → `/dashboard`, `mecanico` → `/mis-ordenes`.
5. **Middleware** (`app/middleware.ts`): toda ruta excepto `/login` y `/api/auth/*` requiere cookie válida; sin ella → 302 a `/login?next=<originalPath>`.
6. **Logout**: `GET /logout` borra la cookie y redirige a `/login`.

**Helpers:**
- `getCurrentUser()` (server-only) — lee la cookie, verifica firma, hidrata el usuario desde `users.json` y lo devuelve. Lo usan layouts y route handlers.
- `requireRole(user, allowedRoles)` — lanza si el rol no está permitido (responde 403 a la API o redirect 302 desde una página).
- En cliente, un `<SessionProvider>` expone `useSession()` con `{ user }` para mostrar nombre/rol en el header. Los datos vienen de `/api/auth/me` cacheado.

**Por qué este enfoque:** demo realista (rutas protegidas, redirección, layouts dependientes del rol del usuario actual) sin la complejidad de password hashing, recovery, ni 2FA. El email semilla del que se loguee determina el rol activo — para "cambiar de rol" se hace logout + login con otro correo del set semilla (§7).

### 2.4 Persistencia con JSON

`lib/db.ts` ofrece `readJson` / `writeJson` con un **lock en memoria** (`Map<string, Promise>`) para serializar escrituras dentro del mismo proceso Next dev/prod single-instance. Cada entidad → un archivo. Operaciones tipo:

```ts
// Pseudocódigo
async function update<T>(file, predicate, mutator) {
  const all = await readJson<T[]>(file);
  const idx = all.findIndex(predicate);
  all[idx] = mutator(all[idx]);
  await writeJson(file, all);
}
```

> Para un demo, este enfoque es suficiente. **No** se busca durabilidad ni concurrencia real.

---

## 3. Flujos del demo

### 3.1 Flujo Admin / Supervisor (escritorio)

Replica el mockup [`NHAVIS_Mockup_M4_Ordenes.html`](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) pantallas S1, S2, S6, S7, S9 — con la nueva pantalla de **Vinculación de refacciones** integrada en S7.

1. **Lista de Órdenes (S1)** — métricas, filtros por estado (incluye `scheduled`), search, lista con `OrderCard`. La columna "Asignado a" muestra ícono distinto si es mecánico o supervisor.
2. **Nueva Orden (S2)** *(Admin o Supervisor)* — selecciona unidad, **asigna a un mecánico o a un supervisor** (selector único filtrado por rol), define motivo y prioridad, fecha estimada de llegada. Permite **prellenar** servicios desde el catálogo (ej. Cambio de Llantas, Frenos, Fumigación) que se copian con sus `defaultParts` *abstractos* (descripción + cantidad). La orden nace en estado `scheduled` (la unidad aún no llegó).
3. **Vista detalle (S6)** — para Admin muestra costos consolidados (M.O. + piezas vinculadas + terceros). Para Supervisor muestra todo **menos** precios. Lista servicios con estado individual, badge "N refacciones por vincular", botones a *Vincular refacciones* / *Cierre*.
4. **Vinculación + Autorización de refacciones (S7 ampliado)** *(Admin o Supervisor)* — bandeja con cada refacción abstracta solicitada por el mecánico:
   - Muestra: descripción + categoría + cantidad + justificación del mecánico + servicio + orden.
   - Selector de `inventory_item` con búsqueda y **sugerencia automática** por match de texto. Al elegir el ítem se previsualiza: stock actual, precio unitario actual, costo total estimado.
   - 3 acciones: **(a)** *Autorizar desde stock* (descuenta inventario, fija `unitCostSnapshot`, refacción pasa a `authorized`); **(b)** *Generar OC* (crea Orden de Compra vinculada a la refacción, captura proveedor + precio, refacción pasa a `waiting_purchase`, servicio asociado a `waiting_parts`); **(c)** *Rechazar* con motivo.
   - El **Supervisor** puede ejecutar (a)/(b)/(c) pero no ve precios; el **Admin** sí ve precios al vincular.
5. **Cierre y Firma (S9)** — cuando la orden está en `pending_approval`:
   - **Supervisor firma revisión** (timestamp + nombre). Estado pasa a `pending_admin_approval`.
   - **Admin firma aprobación final**. Estado pasa a `closed`.
   - Si Admin es quien creó+asignó+revisó, puede firmar las dos en su sesión.
6. **Almacén** — listado con alerta de mínimo, historial de movimientos. Cada ítem expone un panel **"Historial de precios"** con todas las OCs pasadas (folio, fecha, cantidad, precio unitario), permitiendo ver variaciones en el tiempo.
7. **Detalle de ítem (`/almacen/[itemId]`)** — info del ítem, stock actual, gráfico/tabla del historial de precios (de OCs recibidas), enlaces a las OCs de origen.
8. **Compras (Purchase Orders)** — crear OC **manual** (sin orden de trabajo) o **desde la vinculación** (paso 4). Captura proveedor, ítems, cantidades y precio unitario. Estado `draft → ordered → received`. Al marcar como `received` se ingresa stock con un `inventory_movement` y queda como nuevo punto del historial de precios del ítem. Si la OC estaba vinculada a una refacción (`linkedWorkOrderPartId`), esa refacción pasa automáticamente a `authorized` y se notifica al mecánico ("listo para usar").
9. **Catálogos / ABM** — Unidades (truck), Usuarios (con su rol), Servicios (con `defaultParts` abstractos), Ítems de inventario.
10. **Operaciones manuales de stock** *(Admin)* — ruta `/almacen/movimientos`: ingreso o egreso libre con motivo (ej. ajuste de inventario, daño, devolución), independiente de cualquier orden. Cubre el brief: *"manual stock operations can also be done apart from orders"*.

### 3.2 Flujo Mecánico (mobile-first wizard)

Cada paso es **una pantalla a la vez**, con header compacto (← volver / progreso N/M / título corto) y un footer fijo con el botón "Continuar". Inputs grandes, tap-targets ≥ 44px. El mecánico **puede pausar y volver** entre servicios — el wizard no es lineal-bloqueante: una vez completado el paso *Inicio*, los servicios pueden trabajarse en cualquier orden.

```
[Mis órdenes (estado scheduled / in_progress)]
   → [Hub de la orden] (marcar llegada → desbloquea wizard)
      → [Wizard]: Inicio → Inspección → Trabajar Servicio (×N) → Enviar
         ↑___________________________(loop por servicio)__________│
```

**Hub de la orden** — pantalla principal del mecánico para una orden. Contiene:
- Cabecera con folio, unidad, motivo de entrada y estado.
- Botón **"📍 Marcar unidad como llegada"** (visible mientras está en `scheduled`). Al pulsarlo: timestamp `arrivedAt`, estado pasa a `in_progress`, se abre el paso *Inicio* del wizard.
- Lista vertical de servicios con badge de estado individual y botón "Trabajar" en cada uno.
- Botones globales: "+ Agregar servicio" (atajo al paso *Inspección*) y "Solicitar cierre" (deshabilitado hasta tener todos los servicios `done`).

**Wizard de pasos** (`/orden/[id]/flujo/...`):

1. **Inicio** — captura **fotos de evidencia inicial** del estado de la unidad al llegar (cámara/upload). Mínimo 1, sin máximo. Caption opcional por foto. Al guardar → vuelta al hub.
2. **Inspección** — el mecánico revisa la unidad y **agrega servicios extra** que no estaban en la orden original (ej. el supervisor sólo había agendado "Cambio de llantas" pero al inspeccionar se ve que también necesita frenos). Selección por categoría → ítem de catálogo → notas. Cada servicio agregado entra con estado `pending` y arrastra sus `defaultParts`. Este paso es accesible desde el hub en cualquier momento durante `in_progress`.
3. **Trabajar Servicio** *(por cada servicio)* — pantalla del servicio con tres sub-vistas:
   - Sub-pantalla **Refacciones (abstractas)**:
     - Muestra las refacciones precargadas desde `service-catalog.defaultParts` como **plantillas de texto** (ej. "Llanta 295/75R22.5 — 4 pza"). No hay SKUs ni precios.
     - El mecánico puede: **editar cantidad** con botones `−` / `+` grandes, **editar descripción** (texto libre), **agregar nueva refacción** (descripción + categoría chip + cantidad + nota opcional) y **eliminar** una sugerida que no aplica. Cubre el brief *"editable like adding more tires"*.
     - Cada refacción muestra su estado simplificado: `Solicitada` (gris) / `Aprobada` (verde, lista para usar) / `Esperando compra` (amarillo) / `Rechazada` (rojo, con motivo).
     - **No hay** vista de stock, no hay botón "generar OC", no hay precios. Esa decisión la toma el aprobador (ver §1.5 y §3.1.4).
   - Sub-pantalla **Estado del servicio**: switch entre `working` / `waiting_parts` / `done`. Cambia automáticamente a `waiting_parts` cuando alguna refacción está en `waiting_purchase`. Vuelve a `working` cuando todas están `authorized` o `rejected`.
   - Sub-pantalla **Evidencias**: fotos de cierre del servicio (mínimo 1 para cerrar). Botón "Cerrar servicio" habilitado solo si: (a) ≥ 1 foto, (b) todas las refacciones están en `authorized` o `rejected` (ninguna `requested` o `waiting_purchase` pendiente). Al cerrar → estado `done`, vuelta al hub.
4. **Repetir paso 3** para cada servicio (en cualquier orden).
5. **Enviar a aprobación** — pantalla de resumen (servicios + totales sin precios + fotos generales). Botón "Solicitar cierre". La orden pasa a `pending_approval`. El mecánico ya no puede modificarla.

### 3.3 Estados (máquinas de estado del demo)

```
Orden:     scheduled                      ── creada por admin/supervisor antes de la llegada
              │  (mecánico/admin marca "llegada")
              ▼
           in_progress                    ── unidad en taller, mecánico trabajando
              │  (todos los servicios en done + "Solicitar cierre")
              ▼
           pending_approval               ── revisión del Supervisor
              │  (Supervisor firma)
              ▼
           pending_admin_approval         ── aprobación final del Admin
              │  (Admin firma)
              ▼
           closed

Servicio:  pending → working ⇄ waiting_parts → done

Refacción (abstracta del mecánico → vinculada por aprobador):
   requested            ── el mecánico pidió "Llanta 295/75R22.5 × 4"
      │
      ├── (aprobador vincula a inventory_item + autoriza desde stock)
      │       → linked + authorized   (stock−, snapshot precio)
      │
      ├── (aprobador vincula a inventory_item + genera OC)
      │       → linked + waiting_purchase   (servicio→waiting_parts)
      │              │  (OC recibida)
      │              ▼
      │           authorized            (auto, snapshot precio = OC)
      │
      └── (aprobador rechaza con motivo)
              → rejected

OC ítem:   draft → ordered → received  (al recibir → +stock, +historial de precio)
```

> Si la orden la asignó+creó el mismo Admin (caso pequeño taller), las dos firmas pueden hacerse en una sola sesión. La doble firma del cierre proviene de la regla del sistema real (Supervisor + Gerente) y se preserva como trazabilidad.

---

## 4. Modelo de datos (JSON mock)

> Cada archivo es un array. Todos usan UUID en `id`. Fechas en ISO. Decimales como `number`.

### `users.json`
```json
[
  { "id": "u1", "name": "Fernando García", "email": "fg@nhavis.demo",
    "role": "admin", "dailyRate": 1200, "active": true },
  { "id": "u2", "name": "Daniel Alva", "email": "da@nhavis.demo",
    "role": "supervisor", "dailyRate": 800, "active": true },
  { "id": "u3", "name": "Luis Martínez", "email": "lm@nhavis.demo",
    "role": "mecanico", "dailyRate": 550, "active": true }
]
```
`role`: `admin` | `supervisor` | `mecanico`.

### `units.json`
```json
[
  { "id": "t1", "unitNumber": "ECO-014", "brand": "Peterbilt",
    "model": "389", "year": 2021, "plates": "LMN-456-B",
    "status": "active", "notes": "" }
]
```

### `service-catalog.json`
```json
[
  { "id": "sc1", "name": "Cambio de llantas", "category": "reparacion",
    "defaultParts": [
      { "description": "Llanta 295/75R22.5", "qty": 4, "partCategory": "llantas" }
    ],
    "active": true },
  { "id": "sc2", "name": "Servicio de frenos", "category": "reparacion",
    "defaultParts": [
      { "description": "Kit balatas traseras", "qty": 1, "partCategory": "frenos" }
    ],
    "active": true },
  { "id": "sc3", "name": "Fumigación de caja", "category": "fumigacion",
    "defaultParts": [], "active": true }
]
```
> `defaultParts` son **plantillas abstractas** (descripción + cantidad + categoría) — NO referencian SKUs. Se copian a `work-order-parts` cuando se agrega el servicio a una orden, y el mecánico las edita libremente. La vinculación a un `inventory_item` real ocurre después, en el lado del aprobador.

### `inventory-items.json`
```json
[
  { "id": "i1", "sku": "SKU-00412", "description": "Llanta 295/75R22.5",
    "unitOfMeasure": "pieza", "unitCost": 4200,
    "stockCurrent": 6, "stockMinimum": 4, "active": true }
]
```
> `unitCost` es el último precio conocido. El historial completo se reconstruye desde `purchase-orders.json` filtrando por `items.itemId` y ordenando por `receivedAt` — esto es lo que muestra el panel "Historial de precios" del ítem (ver §3.1.6).

### `inventory-movements.json`
```json
[
  { "id": "m1", "itemId": "i1", "type": "ingreso", "quantity": 10,
    "unitCostSnapshot": 4200, "purchaseOrderId": "po1",
    "authorizedBy": "u1", "status": "authorized",
    "notes": "Compra inicial", "createdAt": "2026-04-15T10:00:00Z" }
]
```

### `purchase-orders.json`
```json
[
  { "id": "po1", "folio": "OC-2026-0001",
    "supplier": "Llantas del Norte",
    "status": "received",
    "items": [ { "itemId": "i1", "qty": 10, "unitCost": 4200 } ],
    "linkedWorkOrderPartId": null,
    "createdBy": "u1", "createdAt": "...", "receivedAt": "..." }
]
```
`status`: `draft` | `ordered` | `received` | `cancelled`.

> `linkedWorkOrderPartId`: si la OC fue generada desde la vinculación de una refacción (§3.1.4 acción b), apunta a `work-order-parts.id`. Cuando se marca como `received`, se actualiza esa refacción a `authorized`. Si la OC es manual (compra reactiva o reabastecimiento), este campo queda `null`.

### `work-orders.json`
```json
[
  { "id": "wo1", "folio": "OT-2026-0148",
    "unitId": "t1",
    "assigneeId": "u3", "assigneeRole": "mecanico",
    "createdBy": "u2",
    "status": "in_progress",
    "priority": "normal",
    "reason": "Falla de frenos traseros",
    "scheduledFor": "2026-05-08T09:00:00Z",
    "arrivedAt": "2026-05-08T09:15:00Z",
    "openedAt": "2026-05-07T16:00:00Z",
    "submittedAt": null,
    "supervisorSignedAt": null, "supervisorSignedBy": null,
    "adminSignedAt": null, "adminSignedBy": null,
    "closedAt": null,
    "generalNotes": "" }
]
```
- `assigneeId` + `assigneeRole`: el responsable de ejecutar la orden, **mecánico o supervisor** (brief).
- `createdBy`: usuario que creó la orden (admin o supervisor).
- `scheduledFor` / `arrivedAt`: timestamps que diferencian "creada antes" vs "ya llegó".
- Estado: `scheduled` | `in_progress` | `pending_approval` | `pending_admin_approval` | `closed` | `cancelled`.

### `work-order-services.json`
```json
[
  { "id": "wos1", "workOrderId": "wo1", "serviceCatalogId": "sc1",
    "description": "Cambio de 4 llantas eje trasero",
    "status": "working",
    "startTime": "...", "endTime": null,
    "laborHours": 0, "laborCost": 0,
    "isThirdParty": false, "thirdPartyCost": 0,
    "partsCost": 0, "totalCost": 0, "notes": "" }
]
```

### `work-order-parts.json` (refacciones — abstractas hasta vincularse)
```json
[
  { "id": "wop1", "workOrderServiceId": "wos1",
    "description": "Llanta 295/75R22.5",
    "partCategory": "llantas",
    "quantity": 4,
    "mechanicNote": "Desgaste mayor en eje trasero izq.",
    "status": "requested",

    "linkedItemId": null,
    "linkedAt": null,
    "linkedBy": null,
    "unitCostSnapshot": null,
    "totalCost": null,

    "purchaseOrderId": null,
    "authorizedBy": null,
    "authorizedAt": null,
    "rejectionReason": null,
    "createdAt": "...", "createdBy": "u3" }
]
```
- **Lo que escribe el mecánico**: `description`, `partCategory`, `quantity`, `mechanicNote`. Estado inicial `requested`.
- **Lo que escribe el aprobador al vincular**: `linkedItemId`, `linkedAt`, `linkedBy`, `unitCostSnapshot` (= `unitCost` del item al momento, o el de la OC si se compra), `status`, y según la acción:
  - *Autorizar desde stock*: `status=authorized`, `authorizedBy/At` y crea un `inventory_movements` egreso.
  - *Generar OC*: `status=waiting_purchase`, `purchaseOrderId` apunta a la OC. Cuando la OC se recibe, este registro se actualiza a `authorized` con `authorizedAt = receivedAt` y `unitCostSnapshot` se confirma con el precio final de la OC.
  - *Rechazar*: `status=rejected`, `rejectionReason` con texto.
- `totalCost = quantity * unitCostSnapshot`. Solo se calcula tras la vinculación. Antes es `null`. Solo el Admin lo ve.
- Estados: `requested` | `authorized` | `waiting_purchase` | `rejected`.

### `work-order-photos.json`
```json
[
  { "id": "wph1", "workOrderId": "wo1", "workOrderServiceId": null,
    "stage": "initial",
    "uploadedBy": "u-mec1",
    "photoUrl": "/uploads/wo1-initial-1.jpg",
    "caption": "Llegada", "createdAt": "..." }
]
```
`stage`: `initial` | `service_done` | `general`.

---

## 5. UI: preservar el estilo del mockup

**Fuente de verdad visual:**
[`NHAVIS_Mockup_M0_Roles.html`](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M0_Roles.html) y [`NHAVIS_Mockup_M4_Ordenes.html`](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html).

### 5.1 Tokens de diseño (copiar `:root` del mockup tal cual)

```css
:root {
  --color-background-primary: #ffffff;
  --color-background-secondary: #f9fafb;
  --color-background-tertiary: #f3f4f6;
  --color-background-info: #eff6ff;
  --color-background-success: #f0fdf4;
  --color-background-warning: #fffbeb;
  --color-background-danger: #fef2f2;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-text-success: #15803d;
  --color-text-warning: #b45309;
  --color-text-danger: #b91c1c;
  --color-text-info: #1d4ed8;
  --color-border-tertiary: rgba(0,0,0,0.08);
  --color-border-secondary: rgba(0,0,0,0.15);
  --color-border-primary: rgba(0,0,0,0.25);
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
  --color-brand: #1B3A5C;          /* azul NHAVIS para header, primary, sidebar.active */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

Mapearlos a `tailwind.config.ts` como `theme.extend.colors` para usar `bg-brand`, `text-text-primary`, etc.

### 5.2 Componentes a portar (1:1 desde el mockup)

| Componente del mockup | Componente React |
|---|---|
| `.page-header` (azul `#1B3A5C` con logo) | `<AppHeader />` |
| `.app-layout` + `.sidebar` + `.main-area` | `<AdminShell />` |
| `.metric-card` / `.metrics-grid` | `<MetricCard />` |
| `.badge.b-*` (admin/gerente/supervisor/mecanico/open/progress/closed/pending/authorized/rejected/tercero) | `<Badge variant=... />` |
| `.btn`, `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-sm` | `<Button variant size />` |
| `.alert-bar` / `.info-bar` / `.success-bar` | `<Banner tone />` |
| `.order-card` + `.progress-track` (4 dots) | `<OrderCard />` |
| `.service-row` + `.service-costs` | `<ServiceRow />` con costos condicionales |
| `.part-row` | `<PartRow />` |
| `.filter-chip` | `<FilterChip />` |
| `.input-mock` / `.select-mock` / `.textarea-mock` | `<Input />` / `<Select />` / `<Textarea />` |
| `.role-card` / `.perm-grid` (M0) | `<RoleCard />` |
| `.checklist-section` / `.check-item` / `.check-opt` | `<ChecklistSection />` (futuro) |
| `.firma-box` (dashed → solid verde al firmar) | `<SignatureBox />` |
| `.avatar` (iniciales en círculo, color por rol) | `<Avatar />` |

### 5.3 Mobile (Mecánico) — adaptación

El mockup actual está pensado para escritorio. Para la vista mecánico se hace **mobile-first con el mismo lenguaje visual**:

- Sin sidebar. **Header compacto** azul `#1B3A5C` con: ← back, título corto, avatar.
- **Bottom action bar** para CTA principal del paso actual (full-width primary).
- Cards full-width con `border-radius-lg`, padding `16px`.
- Tipografías ligeramente mayores: títulos `16px`, body `14px` (vs 11–12px del escritorio).
- **Tap targets** mínimos `44px` para chips, checkboxes, botones de cantidad.
- **Stepper** horizontal de dots arriba (reusa `.progress-step` con tamaños mayores).
- Inputs de cantidad con `−` / `+` grandes para refacciones.
- Uploader de fotos con `<input type="file" capture="environment" accept="image/*" />` para acceder a cámara.

### 5.4 Reglas visuales preservadas

1. **Azul de marca** `#1B3A5C` solo en header, botones primary, sidebar.active y elementos de identidad.
2. Badges usan paletas suaves (background pastel + texto saturado), nunca colores planos llamativos.
3. Cards con `border 0.5px rgba(0,0,0,0.08)` y `border-radius-lg`.
4. Información financiera (M.O., piezas, totales) **solo aparece** si `canSeeCosts(profile)` es `true`. Bloque highlight lila `#EDE9FE` indica "Vista Gerente".
5. Tipografía sans del sistema (Apple/Segoe/Roboto). Sin webfonts.

---

## 6. Pasos de implementación (orden recomendado)

1. **Bootstrap del proyecto**: `create-next-app` (TS + Tailwind + ESLint), copiar tokens al `globals.css`, crear `<Button>`, `<Badge>`, `<Card>`, `<Input>` que repliquen las clases del mockup.
2. **Mock DB**: `lib/db.ts` con `readJson`/`writeJson` y lock; semillas de los JSON con datos de ejemplo (ver §7).
3. **Auth real con email**:
   - `lib/session.ts` con HMAC sign/verify y helpers de cookie.
   - `lib/auth.ts` con `getCurrentUser()`, `loginWithEmail(email)`, `logout()`.
   - `app/login/page.tsx` con un input email + submit (estilo `#s-login` del mockup M0).
   - `app/api/auth/login/route.ts` y `app/api/auth/me/route.ts`.
   - `app/middleware.ts` que protege todo excepto `/login` y `/api/auth/*`.
   - `lib/permissions.ts` con `canSeeCosts`, `canAuthorizeParts`, etc.
4. **Shells**: `(admin)/layout.tsx` con sidebar + main area (replica `app-layout` del mockup) + `<UserMenu>` con logout. `(mobile)/layout.tsx` con header compacto + avatar/logout, safe-area. Cada layout llama `getCurrentUser()` y redirige si el rol no corresponde a su zona.
5. **Módulo Órdenes — escritorio**:
   - Lista de órdenes (S1).
   - Nueva orden (S2) con selector de servicios prellenados.
   - Detalle vista Gerente (S6) con métricas de costo.
   - Autorizar piezas (S7).
   - Cierre y firma (S9).
6. **Módulo Órdenes — mobile (mecánico)**:
   - Lista "Mis órdenes".
   - Hub de orden con servicios.
   - **Wizard**: inicio → inspección → servicio (refacciones / evidencias) → enviar.
7. **Catálogos / ABM**: Unidades, Usuarios, Catálogo de Servicios.
8. **Almacén**:
   - Listado con alertas bajo mínimo.
   - Movimientos manuales.
   - Generación de OC desde refacción sin stock dentro del flujo del mecánico.
   - Página de OC: listar, marcar como recibida, ajustar precio.
9. **Mini dashboard** (opcional): contadores de órdenes por estado, gasto del mes, alertas de stock.
10. **Pulido**: animaciones suaves entre pasos del wizard, vacíos (empty states), toasts de éxito/error.

---

## 7. Datos semilla sugeridos para el demo

- **4 usuarios** (uno por rol + extra mecánico) — **estos correos son los que se usan para login**:
  - 1 Admin: Fernando García → `fgarcia@nhavis.demo`
  - 1 Supervisor: Daniel Alva → `dalva@nhavis.demo`
  - 2 Mecánicos: Luis Martínez → `lmartinez@nhavis.demo`, Pedro Sánchez → `psanchez@nhavis.demo`
- **5 unidades**: TRK-014 Peterbilt 389, TRK-007 Kenworth T680, TRK-031 Freightliner Cascadia, TRK-008 Volvo VNL, TRK-022 International LT.
- **8 ítems de inventario**: llanta 295/75R22.5, kit balatas delanteras, kit balatas traseras, aceite motor 15W40 (litros), filtro de aire, filtro de aceite, faro LED 4", gasket de puerta.
- **6 servicios** (con `defaultParts` **abstractos**):
  - Cambio de llantas → `[ { description: "Llanta 295/75R22.5", qty: 4, partCategory: "llantas" } ]`.
  - Servicio de frenos → `[ { description: "Kit balatas traseras", qty: 1, partCategory: "frenos" } ]`.
  - Cambio de aceite → `[ { description: "Aceite 15W40", qty: 12, partCategory: "aceites" }, { description: "Filtro de aceite", qty: 1, partCategory: "filtros" } ]`.
  - Fumigación de caja → `[]`.
  - Engrase general → `[]`.
  - Limpieza interior → `[]`.
- **4 órdenes** en distintos estados, demostrando todo el flujo:
  - `OT-2026-0148` TRK-014 — `scheduled`, asignada a **Luis (mecánico)**, sin llegada aún. Servicios prellenados: Cambio de llantas + Frenos (refacciones abstractas).
  - `OT-2026-0147` TRK-031 — `in_progress`, asignada a **Daniel (supervisor)** *(demuestra asignación a supervisor)*, con 1 foto inicial, 1 servicio `working` y **2 refacciones abstractas en `requested`** (esperando vinculación).
  - `OT-2026-0145` TRK-007 — `in_progress`, asignada a Luis, con 1 servicio en `waiting_parts` porque una refacción está vinculada y en `waiting_purchase` (OC pendiente de recibir).
  - `OT-2026-0142` TRK-008 — `pending_approval`, todas las refacciones ya vinculadas y autorizadas, lista para que firme Supervisor → luego Admin.
- **3 OC** para demostrar tracking de precios:
  - `OC-2026-0001` recibida hace 3 meses, llantas a $4,000 (semilla inicial, OC manual de reabastecimiento).
  - `OC-2026-0002` recibida el mes pasado, mismas llantas a $4,200 (subió el precio, queda registrado en historial).
  - `OC-2026-0003` `ordered` (pendiente de recibir), faros LED, **vinculada a una refacción** de OT-2026-0145 vía `linkedWorkOrderPartId`.
- **Movimientos manuales** (semilla): 1 ingreso de ajuste de inventario (ej. encontradas 2 llantas en revisión física) y 1 egreso por daño (ej. faro roto en el almacén).

---

## 8. Out-of-scope explícito (no entra al demo)

- Password, recuperación de contraseña, 2FA. (El login real captura solo email — ver §2.3.)
- JWT con refresh tokens — se usa una cookie httpOnly firmada simple.
- Almacenamiento de fotos en S3 (se usan archivos locales o base64).
- Checklist primordial bloqueante (queda de referencia visual; se puede agregar como un paso extra del wizard).
- Notificaciones push / email reales (se simulan con badges en la UI: ej. "Hay piezas pendientes de autorizar").
- Multi-tenant, multi-almacén.
- Reportes / Exportación a Excel / PDF.
- Servicios de terceros con flujo de facturación (se pueden mostrar como referencia de la vista Gerente del mockup pero no son críticos para el flujo del brief).
- Internacionalización (todo en español, MXN como moneda fija).

---

## 9. Referencias visuales (donde mirar para cada vista)

| Vista del demo | Referencia del mockup |
|---|---|
| Lista de Órdenes (admin) | [Mockup M4 § Screen 1](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s1` |
| Nueva Orden | [Mockup M4 § Screen 2](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s2` |
| Detalle Mecánico (hub) | [Mockup M4 § Screen 3](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s3` |
| Agregar Servicio (paso wizard) | [Mockup M4 § Screen 4](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s4` |
| Solicitar Refacciones | [Mockup M4 § Screen 5](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s5` |
| Vista Gerente (con costos) | [Mockup M4 § Screen 6](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s6` |
| Autorizar Piezas | [Mockup M4 § Screen 7](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s7` |
| Checklist (futuro) | [Mockup M4 § Screen 8](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s8` |
| Cierre y Firma | [Mockup M4 § Screen 9](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M4_Ordenes.html) — `#s9` |
| Login + Dashboards | [Mockup M0](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M0_Roles.html) |
| Gestión de Usuarios y Roles | [Mockup M0](../../Downloads/Grupo%20NHAVIS/NHAVIS_Mockup_M0_Roles.html) — `#s-usuarios` / `#s-nuevo-usuario` |

---

## 10. Definición de "Demo terminado"

**Creación y asignación**
- Admin **o** Supervisor puede crear una orden **antes de que llegue el camión** (estado `scheduled`).
- La orden puede asignarse **a un mecánico o a un supervisor** y prellenarse con servicios del catálogo (con sus `defaultParts`).

**Llegada y wizard mecánico (mobile, simple)**
- El mecánico puede:
  - ver sus órdenes asignadas,
  - **marcar la unidad como llegada** desde el hub mobile (transiciona a `in_progress`),
  - subir fotos de evidencia inicial,
  - **agregar servicios extra** durante la inspección,
  - por cada servicio: editar refacciones **abstractas** (descripción + categoría + cantidad), agregar nuevas, eliminar; **sin** ver stock, SKUs ni precios,
  - cambiar el estado del servicio (`working` / `waiting_parts` / `done`); el cambio a `waiting_parts` es automático cuando hay refacciones en `waiting_purchase`,
  - **cerrar cada servicio** con evidencia fotográfica una vez todas sus refacciones estén resueltas (`authorized` o `rejected`),
  - **solicitar cierre** cuando todos los servicios estén `done`.

**Vinculación, aprobación y cierre (escritorio)**
- Admin o Supervisor abre la bandeja "Refacciones pendientes" o el detalle de la orden, y por cada refacción abstracta:
  - **vincula** un `inventory_item` real (con sugerencia automática por descripción),
  - elige *Autorizar desde stock* (descuenta inventario), *Generar OC* (crea compra y deja la refacción en `waiting_purchase`), o *Rechazar*.
- Al recibir una OC vinculada, su refacción pasa automáticamente a `authorized` y se actualiza `unitCostSnapshot`.
- Cierre: Supervisor firma revisión → Admin firma aprobación → orden `closed`.
- **Solo Admin ve costos** en cualquier vista. Supervisor puede vincular y generar OCs sin ver precios.

**Stock y compras**
- OC puede crearse **manual** (reabastecimiento sin orden de trabajo) o **desde la vinculación** (cuando no hay stock).
- Marcar OC como recibida suma stock y agrega un punto al **historial de precios** del ítem.
- Existen **operaciones manuales de stock** (ingreso/egreso justificado) **fuera** del flujo de órdenes.

**UX y persistencia**
- UI conserva tokens, badges, cards y layouts del mockup; vista mecánica adaptada a móvil con un paso por pantalla.
- **Login real solo con email**: pantalla `/login` con un campo, cookie httpOnly de sesión, middleware que protege rutas, logout. Cambiar de rol = logout + login con otro correo del set semilla.
- Todo persiste entre reloads en `data/*.json`.

**Auto-validación (recorrido en 5 minutos)**
1. Login con `dalva@nhavis.demo` (Supervisor) → crear OT para TRK-022 con 2 servicios (Cambio de llantas + Servicio de frenos) → asignar a Luis (mecánico). Logout.
2. Login con `lmartinez@nhavis.demo` (Mecánico, mobile) → ver OT en lista → marcar llegada → subir 2 fotos.
3. Servicio "Cambio de llantas": ajustar refacción precargada de 4 a 6 llantas, agregar refacción libre "Válvulas de aire — 6 pza". Marcar servicio como `working`.
4. Servicio "Servicio de frenos": dejar la refacción precargada de balatas. Marcar `working`.
5. Logout → login con `fgarcia@nhavis.demo` (Admin, escritorio) → bandeja "Refacciones pendientes" → vincular las 3 refacciones a sus `inventory_items`. Para llantas: *Autorizar desde stock* (hay 6, justo). Para válvulas: *Autorizar desde stock*. Para balatas: stock = 0, *Generar OC* (proveedor, precio).
6. Logout → volver a `lmartinez@nhavis.demo` → ver que llantas y válvulas pasaron a "Aprobada" y balatas a "Esperando compra". El servicio de frenos quedó en `waiting_parts` automáticamente.
7. Logout → volver a `fgarcia@nhavis.demo` → marcar OC de balatas como recibida. Refacción pasa a `authorized` automáticamente, servicio vuelve a `working`.
8. Logout → volver a `lmartinez@nhavis.demo` → cerrar ambos servicios con foto → solicitar cierre de la OT.
9. Logout → login con `dalva@nhavis.demo` → firmar revisión. Logout → login con `fgarcia@nhavis.demo` → firmar aprobación. OT `closed`.
10. En almacén: stock de llantas bajó 6 unidades, balatas subió por la OC recibida. Abrir el ítem llantas → ver historial de precios con los dos puntos ($4,000 y $4,200).
