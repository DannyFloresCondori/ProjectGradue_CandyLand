import { act, cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";
import { Navbar } from "./Navbar";
import { inventoryService } from "@/services/inventoryService";
import { orderService } from "@/services/orderService";
import { useAuthStore } from "@/stores/authStore";
import type { Order } from "@/types";

const stockAlert = {
  id: "alert-1",
  productId: "product-1",
  productName: "Frappe de Oreo",
  currentStock: 1,
  minStock: 5,
  quantityIncreased: 0,
  isResolved: false,
  alertedAt: "2026-11-25T10:00:00.000Z",
  stockUpdatedAt: null,
  resolvedAt: null,
  message: "Frappe de Oreo llego al minimo de stock",
};

const orders: Order[] = [
  {
    id: "pending-1",
    userId: "user-1",
    userName: "Admin",
    customerId: "customer-1",
    customerName: "Cliente pendiente",
    customerPhone: "70000000",
    orderType: "delivery",
    status: "pending",
    deliveryAddress: "Calle 1",
    scheduledAt: null,
    total: 15,
    notes: null,
    cancellationReason: null,
    details: [],
    createdAt: "2026-11-25T10:00:00.000Z",
  },
  {
    id: "scheduled-1",
    userId: "user-1",
    userName: "Admin",
    customerId: "customer-2",
    customerName: "Cliente programado",
    customerPhone: "70000001",
    orderType: "scheduled",
    status: "pending",
    deliveryAddress: "Calle 2",
    scheduledAt: "2026-11-26T10:00:00.000Z",
    total: 20,
    notes: null,
    cancellationReason: null,
    details: [],
    createdAt: "2026-11-25T10:00:00.000Z",
  },
];

const testUser = {
  id: "user-1",
  fullName: "Admin",
  username: "admin",
  email: "admin@example.com",
  role: "admin" as const,
  token: "test-token",
};

const renderNavbar = (queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null });
});

describe("Navbar session reminders", () => {
  it("reminds for stock alerts and pending or scheduled orders once per session", async () => {
    vi.spyOn(inventoryService, "getActiveAlerts").mockResolvedValue([
      stockAlert,
    ]);
    vi.spyOn(orderService, "getAll").mockResolvedValue(orders);
    const showToast = vi.spyOn(toast, "error");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.setState({ user: testUser });

    const firstRender = renderNavbar(queryClient);
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    expect(showToast.mock.calls[0][0]).toContain("Frappe de Oreo");
    expect(showToast.mock.calls[0][0]).toContain("Cliente pendiente");
    expect(showToast.mock.calls[0][0]).toContain("Cliente programado");

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["active-alerts"] });
    });
    expect(showToast).toHaveBeenCalledTimes(1);

    firstRender.unmount();
    renderNavbar(queryClient);
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(2));

    queryClient.clear();
  });
});
