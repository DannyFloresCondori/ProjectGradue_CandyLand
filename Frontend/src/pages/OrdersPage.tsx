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
import { Pagination } from "@/components/ui/Pagination";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import { QuickCustomerModal } from "@/components/shared/QuickCustomerModal";
import { ProductCatalog } from "@/components/shared/ProductCatalog";
import { PromotionBadge } from "@/components/shared/PromotionBadge";
import { QuantityControl } from "@/components/shared/QuantityControl";
import { ToppingSelector } from "@/components/shared/ToppingSelector";
import {
  formatCurrency,
  formatDateTime,
  validateScheduledAt,
  getScheduledMin,
} from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { formatStockReturnMessage } from "@/lib/stockMessage";
import { confirmAction, requestCancellationReason, showSuccessAlert } from "@/lib/alerts";
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
  PaymentType,
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

const getOrderItemPricing = (item: CartItem, product?: Product) => {
  const originalTotal = item.unitPrice * item.quantity;
  const promotion = product?.promotion;
  if (!promotion) return { originalTotal, total: originalTotal };

  const today = new Date().toISOString().slice(0, 10);
  const isCurrent = Boolean(
    promotion.isActive &&
    (!promotion.startDate || promotion.startDate.slice(0, 10) <= today) &&
    (!promotion.endDate || promotion.endDate.slice(0, 10) >= today),
  );
  if (!isCurrent) return { originalTotal, total: originalTotal };

  if (promotion.type === "discount") {
    const discountPercent = Number(promotion.discountPercent ?? 0);
    return {
      originalTotal,
      total: item.unitPrice * (1 - discountPercent / 100) * item.quantity,
    };
  }

  if (promotion.type === "buy_one_get_one") {
    return {
      originalTotal,
      total: item.unitPrice * Math.ceil(item.quantity / 2),
    };
  }

  return { originalTotal, total: originalTotal };
};

// ─── OrderDetailView ──────────────────────────────────────────────────────────

const OrderDetailView: FC<{ order: Order; products: Product[] }> = ({ order, products }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
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
            className="flex items-start justify-between gap-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <span className="font-bold text-primary-600 mr-2">
                {d.quantity}×
              </span>
              <span className="wrap-break-word font-medium">{d.productName}</span>
              <PromotionBadge promotion={products.find((product) => product.id === d.productId)?.promotion} compact />
              {d.toppings.length > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  + {d.toppings.map((t) => t.toppingName).join(", ")}
                </span>
              )}
              {Number(d.discountApplied ?? 0) > 0 && (
                <div className="mt-1 text-[11px] text-pink-600">
                  Desc. {Number(d.discountApplied ?? 0)}%{d.promotionName ? ` · ${d.promotionName}` : ''}
                </div>
              )}
            </div>
            <span className="shrink-0 font-semibold">{formatCurrency(d.subtotal)}</span>
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
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPageSize = 8;

  // New order state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
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
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerPhoneError, setEditCustomerPhoneError] = useState<string | null>(null);
  const [editCustomerDataOpen, setEditCustomerDataOpen] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editScheduledError, setEditScheduledError] = useState<string | null>(
    null,
  );
  const [editNotes, setEditNotes] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: orderService.getAll,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: productService.getActive,
  });
  const { data: toppings = [] } = useQuery({
    queryKey: ["toppings", "active"],
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
        displayStock: stockMap[product.id] ?? product.stock,
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

  const syncCartStockMap = (items: CartItem[]) => {
    const quantities = new Map<string, number>();
    items.forEach((item) => {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    });
    setStockMap(Object.fromEntries(products.map((product) => [
      product.id,
      Math.max(0, product.stock - (quantities.get(product.id) ?? 0)),
    ])));
  };

  const syncEditCartStockMap = (items: CartItem[]) => {
    const originalReservations = new Map<string, number>();
    if (editOrder?.stockReserved) {
      editOrder.details.forEach((detail) => {
        originalReservations.set(
          detail.productId,
          (originalReservations.get(detail.productId) ?? 0) + detail.quantity,
        );
      });
    }
    const editedQuantities = new Map<string, number>();
    items.forEach((item) => {
      editedQuantities.set(item.productId, (editedQuantities.get(item.productId) ?? 0) + item.quantity);
    });
    setStockMap(Object.fromEntries(products.map((product) => [
      product.id,
      Math.max(
        0,
        product.stock + (originalReservations.get(product.id) ?? 0) - (editedQuantities.get(product.id) ?? 0),
      ),
    ])));
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

  const paginatedOrders = useMemo(
    () =>
      filtered.slice(
        (ordersPage - 1) * ordersPageSize,
        ordersPage * ordersPageSize,
      ),
    [filtered, ordersPage],
  );

  useEffect(() => {
    setOrdersPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / ordersPageSize));
    if (ordersPage > totalPages) setOrdersPage(totalPages);
  }, [filtered.length, ordersPage]);

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
          paymentType,
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
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard-sales"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['active-alerts'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      showSuccessAlert("Pedido registrado correctamente");
      closeNewModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreateOrder = async () => {
    if (!canSubmit || createMut.isPending) return;

    const paymentLabel = paymentType === "cash" ? "efectivo" : "QR";
    const confirmed = await confirmAction(
      `¿Estás seguro de realizar el pedido en ${paymentLabel}?`,
      `Total: ${formatCurrency(cartTotal)}`,
      "Sí, realizar pedido",
    );

    if (confirmed) createMut.mutate();
  };

  const advanceMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard-sales"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['active-alerts'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      toast.success(
        status === "delivered" ? "Pedido entregado" : "Estado actualizado",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: ({ order, reason }: { order: Order; reason?: string }) => orderService.cancel(order.id, reason),
    onSuccess: (_, { order }) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard-sales"] });
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['active-alerts'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      showSuccessAlert("Pedido cancelado correctamente", formatStockReturnMessage(order.details));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCancelOrder = async (order: Order) => {
    if (order.isPaid) {
      const reason = await requestCancellationReason(
        "¿Cancelar pedido pagado?",
        `Pedido #${order.id.slice(-6).toUpperCase()}. La venta asociada se anulará y el stock reservado será restituido.`,
      );
      if (reason) cancelMut.mutate({ order, reason });
      return;
    }

    const confirmed = await confirmAction(
      "¿Está seguro de cancelar el pedido?",
      `Pedido #${order.id.slice(-6).toUpperCase()}. El stock reservado será restituido.`,
      "Sí, cancelar pedido",
    );
    if (confirmed) cancelMut.mutate({ order });
  };

  const editMut = useMutation({
    mutationFn: async () => {
      if (!editOrder) throw new Error("Pedido no disponible");
      const err =
        editOrderType === "scheduled"
          ? validateScheduledAt(editScheduledAt)
          : null;
      if (err) throw new Error(err);

      const customerId = editSelectedCustomer?.id ?? editOrder.customerId ?? null;
      if (editSelectedCustomer && editCustomerDataOpen) {
        const phone = editCustomerPhone.trim();
        if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(editCustomerName.trim())) {
          throw new Error("El nombre solo puede contener letras.");
        }
        if (phone && !/^[67]\d{7}$/.test(phone)) {
          throw new Error("Ingrese un número de teléfono válido de 8 dígitos.");
        }

        await customerService.update(editSelectedCustomer.id, {
          fullName: editCustomerName.trim(),
          phone,
        });
      }

      return orderService.update(editOrder.id, {
        customerId,
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
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-active"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['active-alerts'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      showSuccessAlert("Pedido actualizado correctamente");
      setEditOrder(null);
      setEditCart([]);
      setEditOrderType("delivery");
      setEditSelectedCustomer(null);
      setEditCustomerName("");
      setEditCustomerPhone("");
      setEditCustomerPhoneError(null);
      setEditCustomerDataOpen(false);
      setEditAddress("");
      setEditScheduledAt("");
      setEditScheduledError(null);
      setEditNotes("");
    },
    onError: (e: Error) => {
      if (/tel[eé]fono|phone/i.test(e.message)) {
        setEditCustomerPhoneError(e.message);
      }
      toast.error(e.message);
    },
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
      if (existing.quantity >= 50) {
        toast.error(`La cantidad máxima por producto es 50`);
        return;
      }
      const updatedCart = cart.map((item) => item.productId === productId
        ? { ...item, quantity: item.quantity + 1 }
        : item);
      setCart(updatedCart);
      syncCartStockMap(updatedCart);
    } else {
      const updatedCart = [
        ...cart,
        {
          productId,
          productName: prod.name,
          unitPrice: prod.price,
          quantity: 1,
          toppingIds: [],
        },
      ];
      setCart(updatedCart);
      syncCartStockMap(updatedCart);
    }
  };

  const removeFromCart = (productId: string) => {
    const updatedCart = cart.filter((item) => item.productId !== productId);
    setCart(updatedCart);
    syncCartStockMap(updatedCart);
  };

  const updateQty = (productId: string, qty: number) => {
    const currentItem = cart.find((i) => i.productId === productId);
    const currentQty = currentItem?.quantity ?? 0;
    if (qty < 1) {
      removeFromCart(productId);
      return;
    }
    if (qty > 50) {
      toast.error("La cantidad máxima por producto es 50");
      return;
    }
    const delta = qty - currentQty;
    if (delta > 0) {
      const availableStock = getDisplayStock(productId);
      if (availableStock < delta) {
        toast.error(`Stock insuficiente (máx: ${availableStock})`);
        return;
      }
    }
    const updatedCart = cart.map((item) => item.productId === productId ? { ...item, quantity: qty } : item);
    setCart(updatedCart);
    syncCartStockMap(updatedCart);
  };

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + getOrderItemPricing(item, product).total;
  }, 0);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const closeNewModal = () => {
    setIsNewOpen(false);
    setCart([]);
    setOrderType("delivery");
    setPaymentType("cash");
    setSelectedCustomer(null);
    setIsGeneralClient(false);
    setAddress("");
    setScheduledAt("");
    setScheduledError(null);
    setNotes("");
    resetStockMap();
  };

  const openEditModal = (order: Order) => {
    const originalQuantities = new Map<string, number>();
    order.details.forEach((detail) => {
      originalQuantities.set(
        detail.productId,
        (originalQuantities.get(detail.productId) ?? 0) + detail.quantity,
      );
    });
    const initialStockMap = Object.fromEntries(products.map((product) => {
      const originalQuantity = originalQuantities.get(product.id) ?? 0;
      const stockToReturn = order.stockReserved ? originalQuantity : 0;
      return [product.id, Math.max(0, product.stock + stockToReturn - originalQuantity)];
    })) as Record<string, number>;

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
    const customer = order.customerId
      ? (customers.find((c) => c.id === order.customerId) ?? {
          id: order.customerId,
          ci: "",
          fullName: order.customerName ?? "",
          phone: order.customerPhone ?? "",
          address: "",
          isActive: true,
          createdAt: order.createdAt,
        })
      : null;
    setEditSelectedCustomer(customer);
    setEditCustomerName(customer?.fullName ?? order.customerName ?? "");
    setEditCustomerPhone(customer?.phone ?? order.customerPhone ?? "");
    setEditCustomerPhoneError(null);
    setEditCustomerDataOpen(false);
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
    setEditCustomerName("");
    setEditCustomerPhone("");
    setEditCustomerPhoneError(null);
    setEditCustomerDataOpen(false);
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
  const editCartTotal = editCart.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + getOrderItemPricing(item, product).total;
  }, 0);

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
      if (existing.quantity >= 50) {
        toast.error("La cantidad máxima por producto es 50");
        return;
      }
      const updatedCart = editCart.map((item) => item.productId === productId
        ? { ...item, quantity: item.quantity + 1 }
        : item);
      setEditCart(updatedCart);
      syncEditCartStockMap(updatedCart);
    } else {
      const updatedCart = [
        ...editCart,
        {
          productId,
          productName: prod.name,
          unitPrice: prod.price,
          quantity: 1,
          toppingIds: [],
        },
      ];
      setEditCart(updatedCart);
      syncEditCartStockMap(updatedCart);
    }
  };

  const editRemoveFromCart = (productId: string) => {
    const updatedCart = editCart.filter((item) => item.productId !== productId);
    setEditCart(updatedCart);
    syncEditCartStockMap(updatedCart);
  };

  const editUpdateQty = (productId: string, qty: number) => {
    const currentItem = editCart.find((i) => i.productId === productId);
    const currentQty = currentItem?.quantity ?? 0;
    if (qty < 1) {
      editRemoveFromCart(productId);
      return;
    }
    if (qty > 50) {
      toast.error("La cantidad máxima por producto es 50");
      return;
    }
    const delta = qty - currentQty;
    if (delta > 0) {
      const availableStock = getDisplayStock(productId);
      if (availableStock < delta) {
        toast.error(`Stock insuficiente (máx: ${availableStock})`);
        return;
      }
    }
    const updatedCart = editCart.map((item) => item.productId === productId ? { ...item, quantity: qty } : item);
    setEditCart(updatedCart);
    syncEditCartStockMap(updatedCart);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
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
        <div className="w-full sm:ml-auto sm:w-56">
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
            <div className="w-full overflow-x-auto">
            <table className="min-w-180 w-full text-sm">
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
                {paginatedOrders.map((o) => {
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
                            title={o.status === "delivered" || o.status === "cancelled" ? "Los pedidos entregados o cancelados no se pueden editar" : "Editar pedido"}
                            disabled={o.status === "delivered" || o.status === "cancelled"}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          {cancellable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { void handleCancelOrder(o); }}
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
            </div>
          </CardBody>
          <div className="border-t border-gray-100">
            <Pagination
              page={ordersPage}
              pageSize={ordersPageSize}
              total={filtered.length}
              onPageChange={setOrdersPage}
              label="pedidos"
            />
          </div>
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
        <div className="-mx-4 -mb-4 grid h-[82vh] max-h-[90vh] min-w-0 grid-cols-1 grid-rows-[minmax(230px,1fr)_minmax(185px,0.8fr)_minmax(250px,1fr)] overflow-y-auto sm:-mx-5 sm:-mb-5 lg:grid-cols-[1.05fr_1fr_0.95fr] lg:grid-rows-1 lg:overflow-hidden">
          <ProductCatalog
            products={catalogProducts}
            categories={categories}
            onAddProduct={addToCart}
            className="md:w-full md:flex-auto md:border-b md:border-r-0 lg:border-b-0 lg:border-r"
          />

          <div className="flex min-h-0 min-w-0 flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-gray-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Carrito ({cart.length} {cart.length === 1 ? "producto" : "productos"})
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-20 items-center justify-center text-gray-300">
                  <p className="text-xs">Selecciona productos del catálogo</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    const pricing = getOrderItemPricing(item, product);
                    const availableToppings = product?.toppings ?? [];
                    const selectedToppingNames = availableToppings
                      .filter((topping) => item.toppingIds.includes(topping.id))
                      .map((topping) => topping.name);

                    return (
                      <li key={item.productId} className="flex items-center gap-2 border-b border-gray-100 pb-2 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="wrap-break-word text-xs font-medium text-gray-800">{item.productName}</p>
                          <p className="text-[10px] text-gray-400">{formatCurrency(item.unitPrice)} c/u</p>
                          <PromotionBadge promotion={product?.promotion} compact />
                          {selectedToppingNames.length > 0 && (
                            <p className="text-[10px] text-primary-600">+ {selectedToppingNames.join(", ")}</p>
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
                          max={50}
                          onDecrease={() => updateQty(item.productId, item.quantity - 1)}
                          onIncrease={() => updateQty(item.productId, item.quantity + 1)}
                          onChange={(value) => updateQty(item.productId, value)}
                        />
                        <span className="flex w-20 shrink-0 flex-col items-end text-xs font-semibold text-gray-700">
                          {pricing.total < pricing.originalTotal && (
                            <span className="text-[10px] font-normal text-gray-400 line-through">
                              {formatCurrency(pricing.originalTotal)}
                            </span>
                          )}
                          <span className={pricing.total < pricing.originalTotal ? "text-emerald-600" : ""}>
                            {formatCurrency(pricing.total)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          aria-label={`Quitar ${item.productName}`}
                          className="cursor-pointer shrink-0 rounded p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-400"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="shrink-0 border-t border-gray-100 px-4 py-3">
              <div className="flex justify-between font-bold text-sm">
                <span>Total estimado</span>
                <span className="text-primary-600">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-gray-100 px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Cliente
                </p>
                <div className="space-y-2">
                  {!selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGeneralClient(true);
                        setSelectedCustomer(null);
                      }}
                      className={cn(
                        "w-full cursor-pointer rounded-md border py-2 text-sm font-medium transition-colors",
                        isGeneralClient
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200",
                      )}
                    >
                      Cliente General (sin registro)
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
              </div>

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

            <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 space-y-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Método de pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["cash", "Efectivo"],
                    ["qr", "QR"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentType(value)}
                      className={cn(
                        "cursor-pointer rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                        paymentType === value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!canSubmit && cart.length > 0 && (
                <p className="text-[11px] text-amber-600 text-left flex-3">
                  {!selectedCustomer &&
                    !isGeneralClient &&
                    "Seleccione un cliente o marque como Cliente General"}
                  {(selectedCustomer || isGeneralClient) &&
                    needsAddress &&
                    !address.trim() &&
                    " Falta la dirección de entrega"}
                  {(selectedCustomer || isGeneralClient) &&
                    needsDate &&
                    (!scheduledAt || scheduledError) &&
                    " Falta la fecha de entrega"}
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
                onClick={() => { void handleCreateOrder(); }}
                isLoading={createMut.isPending}
                disabled={!canSubmit}
              >
                ✓ Registrar pedido pagado · {formatCurrency(cartTotal)}
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
          <div className="flex h-[82vh] max-h-[90vh] min-w-0 flex-col gap-0 -mx-4 -mb-4 overflow-hidden sm:-mx-5 sm:-mb-5 md:flex-row">
            <ProductCatalog
              products={catalogProducts}
              categories={categories}
              onAddProduct={editAddToCart}
            />
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:w-[42%] md:flex-none">
              {editOrder.isPaid && (
                <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  El pago permanece registrado en Ventas. Estos cambios solo actualizan el pedido.
                </p>
              )}
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
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-2">
                    {editCustomerDataOpen ? (
                      <>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            Nombre del cliente
                          </label>
                          <input
                            type="text"
                            value={editCustomerName}
                            onChange={(e) => setEditCustomerName(e.target.value)}
                            className="mt-1 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={editCustomerPhone}
                            onChange={(e) => {
                              setEditCustomerPhone(e.target.value);
                              setEditCustomerPhoneError(null);
                            }}
                            placeholder="Ej: 71234567"
                            className={`mt-1 h-8 w-full rounded-md border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 ${editCustomerPhoneError ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                          />
                          {editCustomerPhoneError && (
                            <p className="mt-1 text-[11px] text-red-600">{editCustomerPhoneError}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditCustomerName(editSelectedCustomer?.fullName ?? "");
                            setEditCustomerPhone(editSelectedCustomer?.phone ?? "");
                            setEditCustomerDataOpen(false);
                          }}
                          className=" cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          Mantener datos del cliente
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800">
                          {editCustomerName || "Sin datos de cliente"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {editCustomerPhone || "Sin teléfono"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditCustomerDataOpen(true)}
                          disabled={!editSelectedCustomer}
                          className="cursor-pointer text-xs font-medium text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Cambiar datos del cliente
                        </button>
                      </>
                    )}
                  </div>
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
                      const pricing = getOrderItemPricing(item, product);
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
                            <PromotionBadge promotion={product?.promotion} compact />
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
                            max={50}
                            onDecrease={() =>
                              editUpdateQty(item.productId, item.quantity - 1)
                            }
                            onIncrease={() =>
                              editUpdateQty(item.productId, item.quantity + 1)
                            }
                            onChange={(v) => editUpdateQty(item.productId, v)}
                          />
                          <span className="flex w-24 shrink-0 flex-col items-end text-xs font-semibold text-gray-700">
                            {pricing.total < pricing.originalTotal && (
                              <span className="text-[10px] font-normal text-gray-400 line-through">
                                {formatCurrency(pricing.originalTotal)}
                              </span>
                            )}
                            <span className={pricing.total < pricing.originalTotal ? "text-emerald-600" : ""}>
                              {formatCurrency(pricing.total)}
                            </span>
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
        {viewOrder && <OrderDetailView order={viewOrder} products={products} />}
      </Modal>

    </div>
  );
};
