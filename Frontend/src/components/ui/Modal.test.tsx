import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

const SalesModals = () => {
  const [saleOpen, setSaleOpen] = useState(true);
  const [customerOpen, setCustomerOpen] = useState(false);

  return (
    <>
      <Modal
        isOpen={saleOpen}
        onClose={() => setSaleOpen(false)}
        title="Registrar venta"
      >
        <input aria-label="Producto" defaultValue="" />
        <input aria-label="Cantidad" defaultValue="" />
        <input aria-label="Cliente" defaultValue="" />
        <input aria-label="Método de pago" defaultValue="" />
        <button type="button" onClick={() => setCustomerOpen(true)}>
          Registrar nuevo cliente
        </button>
      </Modal>
      <Modal
        isOpen={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title="Registrar nuevo cliente"
      >
        <button type="button" onClick={() => setCustomerOpen(false)}>
          Cancelar
        </button>
      </Modal>
    </>
  );
};

const openCustomerModal = () => {
  const sale = screen.getByRole("dialog", { name: "Registrar venta" });
  fireEvent.click(
    within(sale).getByRole("button", { name: "Registrar nuevo cliente" }),
  );
  return screen.getByRole("dialog", { name: "Registrar nuevo cliente" });
};

describe("Modal", () => {
  it("cierra el modal principal con Escape cuando es el único abierto", () => {
    render(<SalesModals />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Registrar venta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Registrar nuevo cliente" }),
    ).not.toBeInTheDocument();
  });

  it("cierra únicamente el modal secundario en la primera pulsación", () => {
    render(<SalesModals />);
    openCustomerModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Registrar nuevo cliente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Registrar venta" }),
    ).toBeInTheDocument();
  });

  it("cierra el modal principal con la siguiente pulsación de Escape", () => {
    render(<SalesModals />);
    openCustomerModal();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Registrar nuevo cliente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Registrar venta" }),
    ).not.toBeInTheDocument();
  });

  it("mantiene la venta abierta al cerrar el modal secundario con Cancelar", () => {
    render(<SalesModals />);
    const customer = openCustomerModal();

    fireEvent.click(within(customer).getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("dialog", { name: "Registrar nuevo cliente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Registrar venta" }),
    ).toBeInTheDocument();
  });

  it("mantiene la venta abierta al cerrar el modal secundario con X", () => {
    render(<SalesModals />);
    const customer = openCustomerModal();

    fireEvent.click(within(customer).getByRole("button", { name: "Cerrar" }));

    expect(
      screen.queryByRole("dialog", { name: "Registrar nuevo cliente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Registrar venta" }),
    ).toBeInTheDocument();
  });

  it("conserva los datos de la venta al cerrar el modal secundario con Escape", () => {
    render(<SalesModals />);

    for (const [label, value] of [
      ["Producto", "Torta"],
      ["Cantidad", "3"],
      ["Cliente", "Ana"],
      ["Método de pago", "QR"],
    ]) {
      fireEvent.change(screen.getByRole("textbox", { name: label }), {
        target: { value },
      });
    }

    openCustomerModal();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("textbox", { name: "Producto" })).toHaveValue(
      "Torta",
    );
    expect(screen.getByRole("textbox", { name: "Cantidad" })).toHaveValue("3");
    expect(screen.getByRole("textbox", { name: "Cliente" })).toHaveValue("Ana");
    expect(screen.getByRole("textbox", { name: "Método de pago" })).toHaveValue(
      "QR",
    );
    expect(
      screen.getByRole("dialog", { name: "Registrar venta" }),
    ).toBeInTheDocument();
  });

  it("registra un solo listener de teclado para los modales abiertos", () => {
    const addEventListener = vi.spyOn(document, "addEventListener");
    const removeEventListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<SalesModals />);
    openCustomerModal();

    const keydownListeners = addEventListener.mock.calls.filter(
      ([type]) => type === "keydown",
    );
    expect(keydownListeners).toHaveLength(1);

    unmount();

    expect(
      removeEventListener.mock.calls.filter(([type]) => type === "keydown"),
    ).toHaveLength(1);
    addEventListener.mockRestore();
    removeEventListener.mockRestore();
  });
});
