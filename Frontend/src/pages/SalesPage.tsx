import type { FC } from "react";
import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saleService } from "@/services/saleService";
import { productService } from "@/services/productService";
import { customerService } from "@/services/customerService";
import { promotionService } from "@/services/promotionService";
import { toppingService } from "@/services/toppingService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { CustomerSearch } from "@/components/shared/CustomerSearch";
import { QuickCustomerModal } from "@/components/shared/QuickCustomerModal";
import { ProductCatalog } from "@/components/shared/ProductCatalog";
import { PromotionBadge } from "@/components/shared/PromotionBadge";
import { QuantityControl } from "@/components/shared/QuantityControl";
import { ToppingSelector } from "@/components/shared/ToppingSelector";
import LogoImg from "@/assets/Logo.jpeg";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { formatStockReturnMessage } from "@/lib/stockMessage";
import { confirmAction, showSuccessAlert } from "@/lib/alerts";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import type {
  Sale,
  SaleDetailInput,
  PaymentType,
  Customer,
  Promotion,
  Product,
  Category,
} from "@/types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  toppingIds: string[];
}

// ─── Ticket ───────────────────────────────────────────────────────────────────

const Ticket: FC<{
  sale: Sale;
  onClose: () => void;
  onPrintTicket?: (sale: Sale) => void;
}> = ({ sale, onClose, onPrintTicket }) => (
  <div className="space-y-4">
    <div className="text-center border-b border-dashed border-gray-300 pb-3">
      <img
        src={LogoImg}
        alt="Logo CandyLand"
        className="mx-auto mb-2 h-14 w-14 rounded-full object-contain"
      />
      <p className="font-bold text-lg">CandyLand</p>
      <p className="text-xs text-gray-500">Heladería Artesanal</p>
      <p className="text-xs text-gray-400">Cochabamba, Bolivia</p>
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      <p>
        <span className="font-medium">Ticket:</span> #
        {sale.id.slice(-6).toUpperCase()}
      </p>
      <p>
        <span className="font-medium">Fecha:</span>{" "}
        {formatDateTime(sale.createdAt)}
      </p>
      <p>
        <span className="font-medium">Registrado por:</span> {sale.userName}
      </p>
      <p>
        <span className="font-medium">Confirmado por:</span> {sale.userName}
        {sale.userRole ? ` · ${sale.userRole}` : ""}
      </p>
      {sale.customerName && (
        <p>
          <span className="font-medium">Cliente:</span> {sale.customerName}
        </p>
      )}
      <p>
        <span className="font-medium">Tipo:</span>{" "}
        {sale.orderType === "scheduled"
          ? "Programado"
          : sale.orderType === "delivery"
            ? "Domicilio"
            : "Local"}
      </p>
      {sale.scheduledAt && (
        <p>
          <span className="font-medium">Entrega programada:</span>{" "}
          {formatDateTime(sale.scheduledAt)}
        </p>
      )}
      {sale.deliveryAddress && (
        <p>
          <span className="font-medium">Dirección:</span> {sale.deliveryAddress}
        </p>
      )}
    </div>
    <div className="border-t border-dashed border-gray-300 pt-3">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed text-[10px] sm:mx-auto sm:max-w-[28rem] sm:text-xs">
          <thead>
            <tr className="text-gray-500">
              <th className="w-[42%] text-left pb-1">Producto</th>
              <th className="text-center pb-1">Cant.</th>
              <th className="text-right pb-1">P.U.</th>
              <th className="text-right pb-1">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sale.details.map((d) => (
              <tr key={d.id}>
                <td className="wrap-break-word py-1">
                  <div>{d.productName}</div>
                  {d.toppings.length > 0 && (
                    <div className="text-[10px] text-gray-500">
                      +{" "}
                      {d.toppings
                        .map((topping) => topping.toppingName)
                        .join(", ")}
                    </div>
                  )}
                  {Number(d.discountApplied ?? 0) > 0 && (
                    <div className="text-[9px] text-pink-600">
                      Desc. {Number(d.discountApplied ?? 0)}%
                      {d.promotionName ? ` · ${d.promotionName}` : ""}
                    </div>
                  )}
                </td>
                <td className="py-1 text-center">{d.quantity}</td>
                <td className="py-1 text-right">
                  {formatCurrency(d.unitPrice)}
                </td>
                <td className="py-1 text-right">
                  {formatCurrency(d.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div className="border-t border-gray-300 pt-2 flex justify-between items-center font-bold">
      <span>TOTAL</span>
      <span>{formatCurrency(sale.total)}</span>
    </div>
    <div className="text-xs text-gray-500 text-center">
      Pago:{" "}
      <span className="font-medium">
        {sale.paymentType === "cash" ? "Efectivo" : "QR"}
      </span>
    </div>
    <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-2">
      ¡Gracias por su compra!
    </div>
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="flex-1"
        onClick={() => onPrintTicket?.(sale)}
      >
        <PrinterIcon className="h-4 w-4" />
        Imprimir
      </Button>
      <Button size="sm" className="flex-1" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  </div>
);

const SaleStatusBadge: FC<{ sale: Sale }> = ({ sale }) => {
  const map: Record<string, { variant: "success" | "error"; label: string }> = {
    delivered: { variant: "success", label: "Entregada" },
    canceled: { variant: "error", label: "Cancelada" },
  };
  if (
    sale.status === "delivered" &&
    sale.orderId &&
    sale.orderStatus !== "delivered"
  ) {
    return <Badge variant="info">Pagada</Badge>;
  }
  const config = map[sale.status] ?? {
    variant: "default",
    label: sale.status ?? "Desconocido",
  };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
};

const getSaleTypeKey = (sale: Sale): "local" | "delivery" | "scheduled" =>
  sale.orderType === "scheduled"
    ? "scheduled"
    : sale.orderType === "delivery"
      ? "delivery"
      : "local";

const getSaleItemPricing = (item: CartItem, product?: Product) => {
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
    return {
      originalTotal,
      total:
        item.unitPrice *
        (1 - Number(promotion.discountPercent ?? 0) / 100) *
        item.quantity,
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

// ─── SalesPage ────────────────────────────────────────────────────────────────

export const SalesPage: FC = () => {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [ticketSale, setTicketSale] = useState<Sale | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    sale: Sale;
    reason: string;
  } | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isGeneralClient, setIsGeneralClient] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [salesPage, setSalesPage] = useState(1);
  const [selectedType, setSelectedType] = useState<
    "all" | "local" | "delivery" | "scheduled"
  >("all");
  const salesPageSize = 1;

  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: saleService.getAll,
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

  const openSaleTicketId = (
    location.state as { openSaleTicketId?: string } | null
  )?.openSaleTicketId;
  useEffect(() => {
    if (!openSaleTicketId || isLoading) return;
    const sale = sales.find((item) => item.id === openSaleTicketId);
    if (!sale) return;

    setTicketSale(sale);
    navigate(location.pathname, { replace: true, state: null });
  }, [isLoading, location.pathname, navigate, openSaleTicketId, sales]);

  const categories: Category[] = Array.from(
    new Map(products.map((p: Product) => [p.categoryId, p.category])).values(),
  );

  useEffect(() => {
    setStockMap(() =>
      Object.fromEntries(
        products.map((product) => [product.id, product.stock]),
      ),
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
      Object.fromEntries(
        baseProducts.map((product) => [product.id, product.stock]),
      ),
    );
  };

  const groupedSales = useMemo(() => {
    const sortedSales = [...sales].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        total: number;
        sales: Sale[];
        typeCounts: { local: number; delivery: number; scheduled: number };
      }
    >();

    sortedSales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      const dayKey = saleDate.toISOString().split("T")[0];
      const existing = groups.get(dayKey);
      const resolvedType = getSaleTypeKey(sale);

      if (existing) {
        if (sale.status !== "canceled") existing.total += sale.total;
        existing.typeCounts[resolvedType] += 1;
        existing.sales.push(sale);
        return;
      }

      groups.set(dayKey, {
        key: dayKey,
        label: saleDate.toLocaleDateString("es-BO", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        total: sale.status !== "canceled" ? sale.total : 0,
        typeCounts: {
          local: resolvedType === "local" ? 1 : 0,
          delivery: resolvedType === "delivery" ? 1 : 0,
          scheduled: resolvedType === "scheduled" ? 1 : 0,
        },
        sales: [sale],
      });
    });

    return Array.from(groups.values());
  }, [sales]);

  const currentGroup = groupedSales[(salesPage - 1) * salesPageSize] ?? null;
  const visibleDateSales = currentGroup?.sales ?? [];

  const salesTypeCounts = useMemo(() => {
    return visibleDateSales.reduce(
      (counts, sale) => {
        const key = getSaleTypeKey(sale);
        counts[key] += 1;
        return counts;
      },
      { local: 0, delivery: 0, scheduled: 0 },
    );
  }, [visibleDateSales]);

  useEffect(() => {
    setSalesPage(1);
  }, [selectedType]);

  const paginatedSales = useMemo(() => {
    return groupedSales
      .slice((salesPage - 1) * salesPageSize, salesPage * salesPageSize)
      .map((group) => {
        const salesForType =
          selectedType === "all"
            ? group.sales
            : group.sales.filter(
                (sale) => getSaleTypeKey(sale) === selectedType,
              );

        const total = salesForType.reduce(
          (sum, sale) => sum + (sale.status === "canceled" ? 0 : sale.total),
          0,
        );

        return {
          ...group,
          sales: salesForType,
          total,
        };
      });
  }, [groupedSales, salesPage, selectedType]);

  const todayKey = new Date().toISOString().split("T")[0];
  const todayPage =
    groupedSales.findIndex((group) => group.key === todayKey) + 1;

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

  const removeFromCart = (productId: string) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) adjustStock(productId, item.quantity);
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

  const cartSubtotal = cart.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );
  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find((p: Product) => p.id === item.productId);
    return sum + getSaleItemPricing(item, product).total;
  }, 0);

  const resetSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setIsGeneralClient(false);
    setPaymentType("cash");
    resetStockMap();
  };

  const handlePrintTicket = async (sale: Sale) => {
    try {
      const blob = await saleService.getTicketPdf(sale.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Vista previa abierta del ticket");
    } catch (error) {
      toast.error("No se pudo abrir la vista previa del ticket");
    }
  };

  const createMut = useMutation({
    mutationFn: (input: {
      details: SaleDetailInput[];
      paymentType: PaymentType;
      customerId: string | null;
      orderId: null;
    }) => saleService.create(input, user!.id),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard-sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["active-alerts"] });
      toast.success("Venta registrada correctamente");
      setIsNewOpen(false);
      resetSale();
      setTicketSale(sale);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      saleService.cancel(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard-sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["active-alerts"] });
      qc.invalidateQueries({ queryKey: ["report"] });
      // also invalidate any report queries that include params (from/to)
      try {
        qc.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === "report",
        });
      } catch (e) {
        // fallback: already invalidated by key above
      }
      const canceledSale = sales.find((sale) => sale.id === id);
      showSuccessAlert(
        "Venta anulada correctamente",
        canceledSale
          ? formatStockReturnMessage(canceledSale.details)
          : "Stock restituido.",
      );
      setCancelModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (!selectedCustomer && !isGeneralClient) {
      toast.error("Selecciona un cliente o usa Cliente General");
      return;
    }

    const paymentLabel = paymentType === "cash" ? "efectivo" : "QR";
    const confirmed = await confirmAction(
      `¿Estás seguro de realizar la venta en ${paymentLabel}?`,
      `Total: ${formatCurrency(cartTotal)}`,
      "Sí, realizar venta",
    );

    if (!confirmed) return;

    createMut.mutate({
      details: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        toppingIds: i.toppingIds,
      })),
      paymentType,
      customerId: selectedCustomer?.id ?? null,
      orderId: null,
    });
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Ventas</h1>
          <div className="ml-0 flex flex-wrap items-center gap-1 sm:ml-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setSalesPage((page) => Math.max(1, page - 1))}
              disabled={salesPage <= 1}
              aria-label="Ver día anterior con ventas"
              title="Día anterior con ventas"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() =>
                setSalesPage((page) => Math.min(groupedSales.length, page + 1))
              }
              disabled={
                salesPage >= groupedSales.length || groupedSales.length === 0
              }
              aria-label="Ver día siguiente con ventas"
              title="Día siguiente con ventas"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSalesPage(todayPage)}
              disabled={todayPage === 0 || salesPage === todayPage}
              title="Ir a las ventas de hoy"
            >
              Hoy
            </Button>
          </div>
        </div>
        <Button
          onClick={() => {
            resetStockMap();
            setIsNewOpen(true);
          }}
          size="sm"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva venta
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "Todos" },
          { key: "local", label: `Local (${salesTypeCounts.local})` },
          { key: "delivery", label: `Domicilio (${salesTypeCounts.delivery})` },
          {
            key: "scheduled",
            label: `Programados (${salesTypeCounts.scheduled})`,
          },
        ].map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() =>
              setSelectedType(
                filter.key as "all" | "local" | "delivery" | "scheduled",
              )
            }
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selectedType === filter.key
                ? "border-pink-500 bg-pink-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-pink-200 hover:text-pink-600",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {paginatedSales.map((group) => (
          <Card key={group.key}>
            <CardBody className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-gray-900">
                    {group.label}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                    <span>
                      {group.sales.length} venta
                      {group.sales.length === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span>Local {group.typeCounts.local}</span>
                    <span>·</span>
                    <span>Domicilio {group.typeCounts.delivery}</span>
                    <span>·</span>
                    <span>Programados {group.typeCounts.scheduled}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Total
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(group.total)}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {group.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">
                          #{sale.id.slice(-6).toUpperCase()}
                        </span>
                        <Badge
                          variant={
                            sale.paymentType === "cash" ? "default" : "pink"
                          }
                        >
                          {sale.paymentType === "cash" ? "Efectivo" : "QR"}
                        </Badge>
                        <SaleStatusBadge sale={sale} />
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {sale.customerName ?? (
                          <span className="italic text-gray-400">General</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">
                          Fecha de venta:
                        </span>{" "}
                        {formatDateTime(sale.createdAt)}
                      </p>
                      {sale.status === "canceled" &&
                        sale.cancellationReason && (
                          <p className="text-xs mt-1 text-red-600">
                            Motivo: {sale.cancellationReason}
                          </p>
                        )}
                      <div className="mt-2 space-y-1">
                        {sale.details.map((detail) => (
                          <div
                            key={detail.id}
                            className="text-xs text-gray-600"
                          >
                            <span className="font-medium">
                              {detail.productName}
                            </span>{" "}
                            x{detail.quantity}
                            {detail.toppings.length > 0 && (
                              <span className="text-gray-500">
                                {" "}
                                ·{" "}
                                {detail.toppings
                                  .map((topping) => topping.toppingName)
                                  .join(", ")}
                              </span>
                            )}
                            {Number(detail.discountApplied ?? 0) > 0 && (
                              <span className="ml-1 text-pink-600">
                                · Desc. {Number(detail.discountApplied ?? 0)}%
                                {detail.promotionName
                                  ? ` · ${detail.promotionName}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Monto
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(sale.total)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTicketSale(sale)}
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                        {sale.status === "delivered" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelModal({ sale, reason: "" })}
                          >
                            <XMarkIcon className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}

        {groupedSales.length === 0 && (
          <Card>
            <CardBody className="py-8 text-center text-sm text-gray-500">
              No hay ventas registradas aún.
            </CardBody>
          </Card>
        )}
      </div>

      {/* ─── POS Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => {
          setIsNewOpen(false);
          resetSale();
        }}
        title="Registrar venta"
        size="2xl"
      >
        <div className="-mx-4 -mb-4 grid h-[78vh] min-w-0 grid-cols-1 grid-rows-[minmax(235px,1.1fr)_minmax(175px,0.8fr)_minmax(245px,1.1fr)] overflow-y-auto sm:-mx-5 sm:-mb-5 lg:h-[70vh] lg:grid-cols-[1.05fr_1fr_0.95fr] lg:grid-rows-1 lg:overflow-hidden">
          <ProductCatalog
            products={catalogProducts}
            categories={categories}
            onAddProduct={addToCart}
            className="md:w-full md:flex-auto md:border-b md:border-r-0 lg:border-b-0 lg:border-r"
          />

          <div className="flex min-h-0 min-w-0 flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-gray-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Carrito ({cart.length}{" "}
                {cart.length === 1 ? "producto" : "productos"})
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
                    const product = products.find(
                      (p: Product) => p.id === item.productId,
                    );
                    const pricing = getSaleItemPricing(item, product);
                    const availableToppings = product?.toppings ?? [];
                    const selectedToppingNames = availableToppings
                      .filter((topping) => item.toppingIds.includes(topping.id))
                      .map((topping) => topping.name);

                    return (
                      <li
                        key={item.productId}
                        className="flex items-center gap-2 border-b border-gray-100 pb-2 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 wrap-break-word">
                            {item.productName}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatCurrency(item.unitPrice)} c/u
                          </p>
                          <PromotionBadge
                            promotion={product?.promotion}
                            compact
                          />
                          {selectedToppingNames.length > 0 && (
                            <p className="text-[10px] text-primary-600">
                              + {selectedToppingNames.join(", ")}
                            </p>
                          )}
                          {availableToppings.length > 0 && (
                            <ToppingSelector
                              availableToppings={availableToppings}
                              selectedToppingIds={item.toppingIds}
                              onToggle={(toppingId) =>
                                toggleTopping(item.productId, toppingId)
                              }
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
                        <span className="flex w-20 shrink-0 flex-col items-end text-xs font-semibold text-gray-700">
                          {pricing.total < pricing.originalTotal && (
                            <span className="text-[10px] font-normal text-gray-400 line-through">
                              {formatCurrency(pricing.originalTotal)}
                            </span>
                          )}
                          <span
                            className={
                              pricing.total < pricing.originalTotal
                                ? "text-emerald-600"
                                : ""
                            }
                          >
                            {formatCurrency(pricing.total)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          aria-label={`Quitar ${item.productName}`}
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
            <div className="shrink-0 border-t border-gray-100 px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-gray-100 pt-1 font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Cliente y pago
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
                      if (c) setIsGeneralClient(false);
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

            <div className="shrink-0 border-t border-gray-100 px-4 py-3 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Método de pago
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("cash")}
                  className={cn(
                    "flex-1 cursor-pointer rounded-md py-2 text-sm font-medium border transition-colors",
                    paymentType === "cash"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  💵 Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("qr")}
                  className={cn(
                    "flex-1 cursor-pointer rounded-md py-2 text-sm font-medium border transition-colors",
                    paymentType === "qr"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  📱 QR
                </button>
              </div>

              {!selectedCustomer && !isGeneralClient && cart.length > 0 && (
                <p className="text-left text-[11px] text-amber-600" role="status">
                  Seleccione un cliente o marque como Cliente General
                </p>
              )}

              <Button
                className="w-full shadow-lg hover:shadow-xl transition-all py-4 text-base font-bold"
                variant="primary"
                size="lg"
                onClick={handleCreateSale}
                isLoading={createMut.isPending}
                disabled={
                  cart.length === 0 || (!selectedCustomer && !isGeneralClient)
                }
              >
                ✓ Confirmar venta · {formatCurrency(cartTotal)}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <QuickCustomerModal
        isOpen={quickCustomerOpen}
        prefill={quickPrefill}
        onClose={() => setQuickCustomerOpen(false)}
        onCreated={(c) => {
          setSelectedCustomer(c);
          setIsGeneralClient(false);
          setQuickCustomerOpen(false);
        }}
      />

      <Modal
        isOpen={!!ticketSale}
        onClose={() => setTicketSale(null)}
        title="Ticket de venta"
        size="sm"
      >
        {ticketSale && (
          <Ticket
            sale={ticketSale}
            onClose={() => setTicketSale(null)}
            onPrintTicket={handlePrintTicket}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Anular venta"
        size="sm"
      >
        {cancelModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Esta acción anulará la venta{" "}
              <span className="font-mono font-semibold">
                #{cancelModal.sale.id.slice(-6).toUpperCase()}
              </span>{" "}
              y restituirá el inventario.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Motivo de anulación
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
                placeholder="Ej: Pedido duplicado..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelModal(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={cancelMut.isPending}
                onClick={() =>
                  cancelMut.mutate({
                    id: cancelModal.sale.id,
                    reason: cancelModal.reason,
                  })
                }
                disabled={!cancelModal.reason.trim()}
              >
                Anular venta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
