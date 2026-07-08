import type { FC } from "react";

const formatDateTimeInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services/orderService";
import { productService } from "@/services/productService";
import { customerService } from "@/services/customerService";
import { toppingService } from "@/services/toppingService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import { QuickCustomerModal } from "@/components/shared/QuickCustomerModal";
import { ProductCatalog } from "@/components/shared/ProductCatalog";
import { QuantityControl } from "@/components/shared/QuantityControl";
import { ToppingSelector } from "@/components/shared/ToppingSelector";
import {
  formatCurrency,
  formatDateTime,
  validateScheduledAt,
  getScheduledMin,
} from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ChatBubbleLeftEllipsisIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import type {
  Order,
  OrderType,
  OrderStatus,
  OrderDetailInput,
  Customer,
  Product,
  Category,
} from "@/types";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "warning" | "success" | "error" | "info";
  }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  preparing: { label: "En preparación", variant: "info" },
  ready: { label: "Listo", variant: "success" },
  delivered: { label: "Entregado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "error" },
};

const TYPE_MAP: Record<OrderType, { label: string; icon: string }> = {
  delivery: { label: "Domicilio", icon: "🛵" },
  scheduled: { label: "Programado", icon: "📅" },
};

// Cancellable statuses
const CANCELLABLE: OrderStatus[] = ["pending", "preparing"];

// ─── CartItem (local, enriched for display) ───────────────────────────────────

interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  toppingIds: string[];
}

// ─── OrderDetailView ──────────────────────────────────────────────────────────

const OrderDetailView: FC<{ order: Order }> = ({ order }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
      <div>
        <p className="text-xs text-gray-500">Estado</p>
        <Badge variant={STATUS_MAP[order.status].variant} className="mt-1">
          {STATUS_MAP[order.status].label}
        </Badge>
      </div>
      <div>
        <p className="text-xs text-gray-500">Tipo</p>
        <p className="font-medium">
          {TYPE_MAP[order.orderType].icon} {TYPE_MAP[order.orderType].label}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Cliente</p>
        <p className="font-medium">
          {order.customerName ?? (
            <span className="italic text-gray-400">General</span>
          )}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Teléfono</p>
        <p className="font-medium">
          {order.customerPhone ?? (
            <span className="italic text-gray-400">—</span>
          )}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Fecha de pedido</p>
        <p className="font-medium">{formatDateTime(order.createdAt)}</p>
      </div>
      {order.scheduledAt && (
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Entrega programada</p>
          <p className="font-medium text-amber-700">
            {formatDateTime(order.scheduledAt)}
          </p>
        </div>
      )}
      {order.deliveryAddress && (
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Dirección</p>
          <p className="font-medium">{order.deliveryAddress}</p>
        </div>
      )}
      {order.notes && (
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Notas</p>
          <p className="font-medium text-amber-700 bg-amber-50 rounded px-2 py-1">
            {order.notes}
          </p>
        </div>
      )}
      {order.cancellationReason && (
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Motivo de cancelación</p>
          <p className="font-medium text-red-700">{order.cancellationReason}</p>
        </div>
      )}
    </div>

    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        Productos
      </p>
      <ul className="divide-y divide-gray-100">
        {order.details.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <div>
              <span className="font-bold text-primary-600 mr-2">
                {d.quantity}×
              </span>
              <span className="font-medium">{d.productName}</span>
              {d.toppings.length > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  + {d.toppings.map((t) => t.toppingName).join(", ")}
                </span>
              )}
            </div>
            <span className="font-semibold">{formatCurrency(d.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-bold">
        <span>Total</span>
        <span className="text-primary-600">{formatCurrency(order.total)}</span>
      </div>
    </div>
  </div>
);

// ─── OrdersPage ───────────────────────────────────────────────────────────────

export const OrdersPage: FC = () => {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  // List filters
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [search, setSearch] = useState("");

  // New order state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isGeneralClient, setIsGeneralClient] = useState(false);
  const [address, setAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // Quick customer
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState("");

  // Modals
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editCart, setEditCart] = useState<CartItem[]>([]);
  const [editOrderType, setEditOrderType] = useState<OrderType>("delivery");
  const [editSelectedCustomer, setEditSelectedCustomer] =
    useState<Customer | null>(null);
  const [editIsGeneralClient, setEditIsGeneralClient] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editScheduledError, setEditScheduledError] = useState<string | null>(
    null,
  );
  const [editNotes, setEditNotes] = useState("");
  const [cancelModal, setCancelModal] = useState<{
    order: Order;
    reason: string;
  } | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: orderService.getAll,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: productService.getActive,
  });
  const { data: toppings = [] } = useQuery({
    queryKey: ["toppings"],
    queryFn: toppingService.getActive,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-active"],
    queryFn: customerService.getActive,
  });

  const categories: Category[] = useMemo(
    () =>
      Array.from(
        new Map(
          products.map((p: Product) => [p.categoryId, p.category]),
        ).values(),
      ),
    [products],
  );

  useEffect(() => {
    setStockMap(
      Object.fromEntries(products.map((product: Product) => [product.id, product.stock])),
    );
  }, [products]);

  const catalogProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        stock: stockMap[product.id] ?? product.stock,
      })),
    [products, stockMap],
  );

  const getDisplayStock = (productId: string) => {
    const product = products.find((p: Product) => p.id === productId);
    if (!product) return 0;
    return stockMap[product.id] ?? product.stock;
  };

  const adjustStock = (productId: string, delta: number) => {
    const product = products.find((p: Product) => p.id === productId);
    if (!product) return;
    setStockMap((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? product.stock) + delta),
    }));
  };

  const resetStockMap = (baseProducts: Product[] = products) => {
    setStockMap(
      Object.fromEntries(baseProducts.map((product) => [product.id, product.stock])),
    );
  };

  // Filtered + searched orders
  const STATUS_FILTER_GROUPS: Record<string, OrderStatus[]> = {
    active: ["pending", "preparing", "ready"],
    pending: ["pending"],
    preparing: ["preparing"],
    ready: ["ready"],
    delivered: ["delivered"],
    cancelled: ["cancelled"],
    all: ["pending", "preparing", "ready", "delivered", "cancelled"],
  };

  const filtered = useMemo(() => {
    const statuses = STATUS_FILTER_GROUPS[statusFilter] ?? [];
    return orders.filter((o) => {
      const matchStatus = statuses.includes(o.status);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.id.slice(-6).toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: () => {
      const err =
        orderType === "scheduled" ? validateScheduledAt(scheduledAt) : null;
      if (err) throw new Error(err);
      return orderService.create(
        {
          customerId: selectedCustomer?.id ?? null,
          orderType,
          deliveryAddress: address.trim() || null,
          scheduledAt: scheduledAt || null,
          notes: notes.trim() || null,
          details: cart.map(
            (i) =>
              ({
                productId: i.productId,
                quantity: i.quantity,
                toppingIds: i.toppingIds,
              }) satisfies OrderDetailInput,
          ),
        },
        user!.id,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success("Pedido registrado");
      closeNewModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const advanceMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(
        status === "delivered" ? "Pedido entregado" : "Estado actualizado",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      orderService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success("Pedido cancelado. Stock restituido.");
      setCancelModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: () => {
      if (!editOrder) throw new Error("Pedido no disponible");
      const err =
        editOrderType === "scheduled"
          ? validateScheduledAt(editScheduledAt)
          : null;
      if (err) throw new Error(err);
      return orderService.update(editOrder.id, {
        customerId: editSelectedCustomer?.id ?? null,
        orderType: editOrderType,
        deliveryAddress: editAddress.trim() || null,
        scheduledAt: editScheduledAt || null,
        notes: editNotes.trim() || null,
        details: editCart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          toppingIds: i.toppingIds,
        })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success("Pedido editado");
      setEditOrder(null);
      setEditCart([]);
      setEditOrderType("delivery");
      setEditSelectedCustomer(null);
      setEditIsGeneralClient(false);
      setEditAddress("");
      setEditScheduledAt("");
      setEditScheduledError(null);
      setEditNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Cart management ──────────────────────────────────────────────────────

  const toggleTopping = (productId: string, toppingId: string) => {
    setCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;

        const isSelected = item.toppingIds.includes(toppingId);
        if (isSelected) {
          return {
            ...item,
            toppingIds: item.toppingIds.filter((id) => id !== toppingId),
          };
        }

        if (item.toppingIds.length >= 2) {
          toast.error("Solo puedes elegir máximo 2 toppings por producto");
          return item;
        }

        return { ...item, toppingIds: [...item.toppingIds, toppingId] };
      }),
    );
  };

  const addToCart = (productId: string) => {
    const prod = products.find((p: Product) => p.id === productId);
    if (!prod) return;
    const availableStock = getDisplayStock(productId);
    if (availableStock <= 0) {
      toast.error(`"${prod.name}" sin stock`);
      return;
    }
    const existing = cart.find((i) => i.productId === productId);
    if (existing) {
      if (existing.quantity >= availableStock) {
        toast.error(`Stock insuficiente (máx: ${availableStock})`);
        return;
      }
      adjustStock(productId, -1);
      setCart((c) =>
        c.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      adjustStock(productId, -1);
      setCart((c) => [
        ...c,
        {
          productId,
          productName: prod.name,
          unitPrice: prod.price,
          quantity: 1,
          toppingIds: [],
        },
      ]);
    }
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) {
      adjustStock(productId, item.quantity);
    }
    setCart((c) => c.filter((i) => i.productId !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    const currentItem = cart.find((i) => i.productId === productId);
    const currentQty = currentItem?.quantity ?? 0;
    if (qty < 1) {
      removeFromCart(productId);
      return;
    }
    const delta = qty - currentQty;
    if (delta > 0) {
      const availableStock = getDisplayStock(productId);
      if (availableStock < delta) {
        toast.error(`Stock insuficiente (máx: ${availableStock})`);
        return;
      }
      adjustStock(productId, -delta);
    } else if (delta < 0) {
      adjustStock(productId, -delta);
    }
    setCart((c) =>
      c.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const closeNewModal = () => {
    setIsNewOpen(false);
    setCart([]);
    setOrderType("delivery");
    setSelectedCustomer(null);
    setIsGeneralClient(false);
    setAddress("");
    setScheduledAt("");
    setScheduledError(null);
    setNotes("");
    resetStockMap();
  };

  const openEditModal = (order: Order) => {
    const initialStockMap = Object.fromEntries(
      products.map((product: Product) => [product.id, product.stock]),
    ) as Record<string, number>;

    order.details.forEach((detail) => {
      const current = initialStockMap[detail.productId];
      if (typeof current === "number") {
        initialStockMap[detail.productId] = Math.max(0, current - detail.quantity);
      }
    });

    setEditOrder(order);
    setEditCart(
      order.details.map((d) => ({
        productId: d.productId,
        productName: d.productName,
        unitPrice: d.unitPrice,
        quantity: d.quantity,
        toppingIds: d.toppings.map((t) => t.toppingId),
      })),
    );
    setEditOrderType(order.orderType);
    setEditSelectedCustomer(
      order.customerId
        ? (customers.find((c) => c.id === order.customerId) ?? null)
        : null,
    );
    setEditIsGeneralClient(!order.customerId);
    setEditAddress(order.deliveryAddress ?? "");
    setEditScheduledAt(formatDateTimeInput(order.scheduledAt));
    setEditScheduledError(null);
    setEditNotes(order.notes ?? "");
    setStockMap(initialStockMap);
  };

  const closeEditModal = () => {
    setEditOrder(null);
    setEditCart([]);
    setEditOrderType("delivery");
    setEditSelectedCustomer(null);
    setEditIsGeneralClient(false);
    setEditAddress("");
    setEditScheduledAt("");
    setEditScheduledError(null);
    setEditNotes("");
    resetStockMap();
  };

  const needsAddress = orderType === "delivery" || orderType === "scheduled";
  const needsDate = orderType === "scheduled";

  const handleScheduledChange = (value: string) => {
    setScheduledAt(value);
    setScheduledError(validateScheduledAt(value));
  };

  const canSubmit =
    cart.length > 0 &&
    (selectedCustomer !== null || isGeneralClient) &&
    (!needsDate || (!!scheduledAt && !scheduledError)) &&
    (!needsAddress || !!address.trim());

  const editNeedsAddress =
    editOrderType === "delivery" || editOrderType === "scheduled";
  const editNeedsDate = editOrderType === "scheduled";
  const editCartTotal = editCart.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );

  const handleEditScheduledChange = (value: string) => {
    setEditScheduledAt(value);
    setEditScheduledError(validateScheduledAt(value));
  };

  const toggleEditTopping = (productId: string, toppingId: string) => {
    setEditCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;

        const isSelected = item.toppingIds.includes(toppingId);
        if (isSelected) {
          return {
            ...item,
            toppingIds: item.toppingIds.filter((id) => id !== toppingId),
          };
        }

        if (item.toppingIds.length >= 2) {
          toast.error("Solo puedes elegir máximo 2 toppings por producto");
          return item;
        }

        return { ...item, toppingIds: [...item.toppingIds, toppingId] };
      }),
    );
  };

  const editAddToCart = (productId: string) => {
    const prod = products.find((p: Product) => p.id === productId);
    if (!prod) return;
    const availableStock = getDisplayStock(productId);
    if (availableStock <= 0) {
      toast.error(`"${prod.name}" sin stock`);
      return;
    }
    const existing = editCart.find((i) => i.productId === productId);
    if (existing) {
      if (existing.quantity >= availableStock) {
        toast.error(`Stock insuficiente (máx: ${availableStock})`);
        return;
      }
      adjustStock(productId, -1);
      setEditCart((c) =>
        c.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      adjustStock(productId, -1);
      setEditCart((c) => [
        ...c,
        {
          productId,
          productName: prod.name,
          unitPrice: prod.price,
          quantity: 1,
          toppingIds: [],
        },
      ]);
    }
  };

  const editRemoveFromCart = (productId: string) => {
    const item = editCart.find((i) => i.productId === productId);
    if (item) {
      adjustStock(productId, item.quantity);
    }
    setEditCart((c) => c.filter((i) => i.productId !== productId));
  };

  const editUpdateQty = (productId: string, qty: number) => {
    const currentItem = editCart.find((i) => i.productId === productId);
    const currentQty = currentItem?.quantity ?? 0;
    if (qty < 1) {
      editRemoveFromCart(productId);
      return;
    }
    const delta = qty - currentQty;
    if (delta > 0) {
      const availableStock = getDisplayStock(productId);
      if (availableStock < delta) {
        toast.error(`Stock insuficiente (máx: ${availableStock})`);
        return;
      }
      adjustStock(productId, -delta);
    } else if (delta < 0) {
      adjustStock(productId, -delta);
    }
    setEditCart((c) =>
      c.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    );
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <Button
          onClick={() => {
            resetStockMap();
            setIsNewOpen(true);
          }}
          size="sm"
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo pedido
        </Button>
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "active", label: "Activos" },
            { key: "pending", label: "Pendientes" },
            { key: "preparing", label: "En preparación" },
            { key: "ready", label: "Listos" },
            { key: "delivered", label: "Entregados" },
            { key: "cancelled", label: "Cancelados" },
            { key: "all", label: "Todos" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                statusFilter === f.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400",
              )}
            >
              {f.label}
              {f.key === "active" &&
                orders.filter((o) =>
                  ["pending", "preparing", "ready"].includes(o.status),
                ).length > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5">
                    {
                      orders.filter((o) =>
                        ["pending", "preparing", "ready"].includes(o.status),
                      ).length
                    }
                  </span>
                )}
            </button>
          ))}
        </div>
        <div className="ml-auto w-56">
          <Input
            placeholder="Buscar # o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* ─── Table ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardDocumentListIcon className="h-10 w-10" />}
          title="No hay pedidos"
          description={
            search
              ? `Sin resultados para "${search}"`
              : "Registra el primer pedido"
          }
          action={
            <Button size="sm" onClick={() => setIsNewOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Nuevo pedido
            </Button>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">
                    Fecha de entrega
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden xl:table-cell">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((o) => {
                  const cancellable = CANCELLABLE.includes(o.status);
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        #{o.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {o.customerName ?? (
                          <span className="italic text-gray-400">General</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {TYPE_MAP[o.orderType].icon}
                        </span>
                        <span className="ml-1.5 text-xs text-gray-600">
                          {TYPE_MAP[o.orderType].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_MAP[o.status].variant}>
                          {STATUS_MAP[o.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-amber-600 hidden lg:table-cell">
                        {o.scheduledAt ? formatDateTime(o.scheduledAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 hidden xl:table-cell">
                        {o.customerPhone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewOrder(o)}
                            title="Ver detalle"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(o)}
                            title="Editar pedido"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          {cancellable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCancelModal({ order: o, reason: "" })
                              }
                              title="Cancelar pedido"
                            >
                              <XMarkIcon className="h-4 w-4 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* ─── New Order Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={isNewOpen}
        onClose={closeNewModal}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              Nuevo pedido
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(
                Object.entries(TYPE_MAP) as [
                  OrderType,
                  { label: string; icon: string },
                ][]
              ).map(([type, info]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOrderType(type);
                    setAddress("");
                    setScheduledAt("");
                    setScheduledError(null);
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                    orderType === type
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50",
                  )}
                >
                  {info.icon} {info.label}
                </button>
              ))}
            </div>
          </div>
        }
        size="2xl"
      >
        <div className="flex h-[82vh] max-h-[90vh] gap-0 -mx-5 -mb-5 overflow-hidden">
          {/* LEFT — Product catalog (shared component) */}
          <ProductCatalog
            products={catalogProducts}
            categories={categories}
            onAddProduct={addToCart}
          />

          {/* RIGHT — Order configuration */}
          <div className="flex w-[42%] flex-col min-h-0">
            {/* Details section with independent scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="border-b border-gray-100 px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Cliente
                </p>
                {!selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsGeneralClient(true);
                      setSelectedCustomer(null);
                    }}
                    className={cn(
                      "cursor-pointer w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      isGeneralClient
                        ? "border-gray-400 bg-gray-900 text-white"
                        : "border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50",
                    )}
                  >
                    {isGeneralClient
                      ? "✓ Cliente General seleccionado"
                      : "Cliente General (sin registro)"}
                  </button>
                )}
                {!isGeneralClient && (
                  <CustomerSearch
                    customers={customers}
                    selected={selectedCustomer}
                    onSelect={(c) => {
                      setSelectedCustomer(c);
                      if (c) {
                        setIsGeneralClient(false);
                        if (!address && c.address) setAddress(c.address);
                      }
                    }}
                    onQuickRegister={(pf = "") => {
                      setQuickPrefill(pf);
                      setQuickCustomerOpen(true);
                    }}
                  />
                )}
                {isGeneralClient && (
                  <button
                    type="button"
                    onClick={() => setIsGeneralClient(false)}
                    className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
                  >
                    Cambiar a cliente registrado
                  </button>
                )}
              </div>

              {/* Context fields (address / schedule) */}
              {(needsAddress || needsDate) && (
                <div className="border-b border-gray-100 px-4 py-3 space-y-2">
                  {needsAddress && (
                    <div>
                      <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        <MapPinIcon className="h-3 w-3" /> Dirección de entrega
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej: Calle Heroínas 234, Cochabamba"
                        className="h-8 w-full rounded-md border border-gray-300 px-3 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-gray-400"
                      />
                    </div>
                  )}
                  {needsDate && (
                    <div>
                      <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        <CalendarDaysIcon className="h-3 w-3" /> Fecha y hora de
                        entrega
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        min={getScheduledMin()}
                        onChange={(e) => handleScheduledChange(e.target.value)}
                        className={cn(
                          "h-8 w-full rounded-md border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500",
                          scheduledError
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300 hover:border-gray-400",
                        )}
                      />
                      {scheduledError && (
                        <p className="mt-0.5 text-[10px] text-red-600">
                          {scheduledError}
                        </p>
                      )}
                      {!scheduledError && !scheduledAt && (
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          Horario: 09:00 – 19:00 · Mínimo 30 min de anticipación
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="border-b border-gray-100 px-4 py-2">
                <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  <ChatBubbleLeftEllipsisIcon className="h-3 w-3" /> Notas
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Sin maní, torta de cumpleaños..."
                  className="h-8 w-full rounded-md border border-gray-300 px-3 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-gray-400"
                />
              </div>
            </div>

            {/* Cart */}
            <div className="max-h-[26vh] min-h-35 overflow-y-auto border-t border-gray-100 px-4 py-3">
              {" "}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Orden ({cart.length} {cart.length === 1 ? "ítem" : "ítems"})
              </p>
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-16 text-gray-300">
                  <p className="text-xs">Selecciona productos del catálogo</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    const availableToppings = product?.toppings ?? [];
                    const selectedToppingNames = availableToppings
                      .filter((topping) => item.toppingIds.includes(topping.id))
                      .map((topping) => topping.name);

                    return (
                      <li
                        key={item.productId}
                        className="flex items-center gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 truncate">
                            {item.productName}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatCurrency(item.unitPrice)} c/u
                          </p>
                          {selectedToppingNames.length > 0 && (
                            <p className="text-[10px] text-primary-600">
                              + {selectedToppingNames.join(", ")}
                            </p>
                          )}
                          {availableToppings.length > 0 && (
                            <ToppingSelector
                              availableToppings={availableToppings}
                              selectedToppingIds={item.toppingIds}
                              onToggle={(toppingId) => toggleTopping(item.productId, toppingId)}
                            />
                          )}
                        </div>
                        <QuantityControl
                          value={item.quantity}
                          onDecrease={() =>
                            updateQty(item.productId, item.quantity - 1)
                          }
                          onIncrease={() =>
                            updateQty(item.productId, item.quantity + 1)
                          }
                          onChange={(v) => updateQty(item.productId, v)}
                        />
                        <span className="w-16 text-right text-xs font-semibold text-gray-700">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="cursor-pointer shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-4 space-y-2 shrink-0 shadow-[0_-8px_16px_rgba(0,0,0,0.08)]">
              <div className="flex justify-between font-bold text-lg">
                <span>Total estimado</span>
                <span className="text-primary-600 text-xl">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              {!canSubmit && cart.length > 0 && (
                <p className="text-[11px] text-amber-600 text-right">
                  {!selectedCustomer &&
                    !isGeneralClient &&
                    "Selecciona un cliente"}
                  {(selectedCustomer || isGeneralClient) &&
                    needsAddress &&
                    !address.trim() &&
                    "Falta la dirección de entrega"}
                  {(selectedCustomer || isGeneralClient) &&
                    needsDate &&
                    (!scheduledAt || scheduledError) &&
                    "Falta la fecha de entrega"}
                </p>
              )}

              <Button
                className={cn(
                  "w-full py-4 text-base font-bold transition-all duration-200 relative",
                  canSubmit &&
                    "shadow-lg shadow-primary-500/30 hover:shadow-xl hover:-translate-y-0.5 ring-2 ring-primary-400/40 ring-offset-2",
                )}
                variant="primary"
                size="lg"
                onClick={() => createMut.mutate()}
                isLoading={createMut.isPending}
                disabled={!canSubmit}
              >
                ✓ Registrar pedido · {formatCurrency(cartTotal)}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Order Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editOrder}
        onClose={closeEditModal}
        title={
          editOrder
            ? `Editar pedido #${editOrder.id.slice(-6).toUpperCase()}`
            : "Editar pedido"
        }
        size="2xl"
      >
        {editOrder && (
          <div className="flex h-[82vh] max-h-[90vh] gap-0 -mx-5 -mb-5 overflow-hidden">
            <ProductCatalog
              products={catalogProducts}
              categories={categories}
              onAddProduct={editAddToCart}
            />
            <div className="flex w-[42%] flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="border-b border-gray-100 px-4 py-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      Object.entries(TYPE_MAP) as [
                        OrderType,
                        { label: string; icon: string },
                      ][]
                    ).map(([type, info]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setEditOrderType(type);
                          if (type !== "scheduled") {
                            setEditScheduledAt("");
                            setEditScheduledError(null);
                          }
                        }}
                        className={cn(
                          "cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                          editOrderType === type
                            ? "bg-gray-900 text-white border-gray-900"
                            : "border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50",
                        )}
                      >
                        {info.icon} {info.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Cliente
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Cliente
                  </p>
                  {editSelectedCustomer ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <p className="font-medium text-gray-800">
                        {editSelectedCustomer.fullName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {editSelectedCustomer.phone || "Sin teléfono"}
                      </p>
                    </div>
                  ) : (
                    !editIsGeneralClient && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsGeneralClient(true);
                          setEditSelectedCustomer(null);
                        }}
                        className="cursor-pointer w-full rounded-lg border px-3 py-2 text-left text-sm border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50"
                      >
                        Cliente General (sin registro)
                      </button>
                    )
                  )}
                  {!editIsGeneralClient && (
                    <CustomerSearch
                      customers={customers}
                      selected={editSelectedCustomer}
                      onSelect={(c) => {
                        setEditSelectedCustomer(c);
                        if (c) setEditIsGeneralClient(false);
                      }}
                      onQuickRegister={(pf = "") => {
                        setQuickPrefill(pf);
                        setQuickCustomerOpen(true);
                      }}
                    />
                  )}
                </div>
                {(editNeedsAddress || editNeedsDate) && (
                  <div className="border-b border-gray-100 px-4 py-3 space-y-2">
                    {editNeedsAddress && (
                      <div>
                        <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          <MapPinIcon className="h-3 w-3" /> Dirección de
                          entrega
                        </label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Ej: Calle Heroínas 234, Cochabamba"
                          className="h-8 w-full rounded-md border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    )}
                    {editNeedsDate && (
                      <div>
                        <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          <CalendarDaysIcon className="h-3 w-3" /> Fecha y hora
                          de entrega
                        </label>
                        <input
                          type="datetime-local"
                          value={editScheduledAt}
                          min={getScheduledMin()}
                          onChange={(e) =>
                            handleEditScheduledChange(e.target.value)
                          }
                          className={cn(
                            "h-8 w-full rounded-md border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500",
                            editScheduledError
                              ? "border-red-400 bg-red-50"
                              : "border-gray-300",
                          )}
                        />
                        {editScheduledError && (
                          <p className="mt-0.5 text-[10px] text-red-600">
                            {editScheduledError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="border-b border-gray-100 px-4 py-2">
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    <ChatBubbleLeftEllipsisIcon className="h-3 w-3" /> Notas
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ej: Sin maní, torta de cumpleaños..."
                    className="h-8 w-full rounded-md border border-gray-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="max-h-[34vh] min-h-45 overflow-y-auto border-t border-gray-100 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Orden ({editCart.length}{" "}
                  {editCart.length === 1 ? "ítem" : "ítems"})
                </p>
                {editCart.length === 0 ? (
                  <div className="flex items-center justify-center h-16 text-gray-300">
                    <p className="text-xs">
                      Agrega productos para modificar el pedido
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {editCart.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const availableToppings = product?.toppings ?? [];
                      const selectedToppingNames = availableToppings
                        .filter((topping) => item.toppingIds.includes(topping.id))
                        .map((topping) => topping.name);

                      return (
                        <li
                          key={item.productId}
                          className="flex items-center gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {item.productName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {formatCurrency(item.unitPrice)} c/u
                            </p>
                            {selectedToppingNames.length > 0 && (
                              <p className="text-[10px] text-primary-600">
                                + {selectedToppingNames.join(", ")}
                              </p>
                            )}
                            {availableToppings.length > 0 && (
                              <ToppingSelector
                                availableToppings={availableToppings}
                                selectedToppingIds={item.toppingIds}
                                onToggle={(toppingId) => toggleEditTopping(item.productId, toppingId)}
                              />
                            )}
                          </div>
                          <QuantityControl
                            value={item.quantity}
                            onDecrease={() =>
                              editUpdateQty(item.productId, item.quantity - 1)
                            }
                            onIncrease={() =>
                              editUpdateQty(item.productId, item.quantity + 1)
                            }
                            onChange={(v) => editUpdateQty(item.productId, v)}
                          />
                          <span className="w-16 text-right text-xs font-semibold text-gray-700">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => editRemoveFromCart(item.productId)}
                            className="cursor-pointer shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-3 space-y-3 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]">
                <div className="flex justify-between font-bold text-base">
                  <span>Total estimado</span>
                  <span className="text-primary-600">
                    {formatCurrency(editCartTotal)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => editMut.mutate()}
                  isLoading={editMut.isPending}
                  disabled={
                    editCart.length === 0 ||
                    (!editSelectedCustomer && !editIsGeneralClient) ||
                    (editNeedsDate &&
                      (!editScheduledAt || !!editScheduledError)) ||
                    (editNeedsAddress && !editAddress.trim())
                  }
                >
                  Guardar cambios · {formatCurrency(editCartTotal)}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Quick Customer Modal ──────────────────────────────────────────── */}
      <QuickCustomerModal
        isOpen={quickCustomerOpen}
        prefill={quickPrefill}
        onClose={() => setQuickCustomerOpen(false)}
        onCreated={(c) => {
          setSelectedCustomer(c);
          setIsGeneralClient(false);
          if (!address && c.address) setAddress(c.address);
          setQuickCustomerOpen(false);
        }}
      />

      {/* ─── View Order Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Pedido #${viewOrder?.id.slice(-6).toUpperCase()}`}
        size="md"
      >
        {viewOrder && <OrderDetailView order={viewOrder} />}
      </Modal>

      {/* ─── Cancel Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancelar pedido"
        size="sm"
      >
        {cancelModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">
                Esta acción cancelará el pedido{" "}
                <span className="font-mono">
                  #{cancelModal.order.id.slice(-6).toUpperCase()}
                </span>
                .
              </p>
              <p className="text-xs mt-1 text-red-600">
                El stock de los productos será restituido automáticamente.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Motivo de cancelación
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3}
                value={cancelModal.reason}
                onChange={(e) =>
                  setCancelModal((m) =>
                    m ? { ...m, reason: e.target.value } : null,
                  )
                }
                placeholder="Ej: Cliente no contestó, pedido duplicado..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelModal(null)}>
                Volver
              </Button>
              <Button
                variant="danger"
                isLoading={cancelMut.isPending}
                onClick={() =>
                  cancelMut.mutate({
                    id: cancelModal.order.id,
                    reason: cancelModal.reason,
                  })
                }
                disabled={!cancelModal.reason.trim()}
              >
                Confirmar cancelación
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
