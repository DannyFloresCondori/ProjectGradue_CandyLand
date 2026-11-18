import type { FC } from "react";

interface QuantityControlProps {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onChange: (v: number) => void;
  max?: number;
}

/** Compact stepper used in cart items across Sales and Orders. */
export const QuantityControl: FC<QuantityControlProps> = ({
  value,
  onDecrease,
  onIncrease,
  onChange,
  max,
}) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={onDecrease}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors font-medium"
    >
      −
    </button>
    <input
      type="number"
      min={1}
      max={max}
      value={value}
      onChange={(e) =>
        onChange(
          Math.min(
            max ?? Number.POSITIVE_INFINITY,
            Math.max(1, Number(e.target.value)),
          ),
        )
      }
      className="quantity-input h-7 w-10 rounded-md border border-gray-300 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
    />
    <button
      type="button"
      onClick={onIncrease}
      disabled={max !== undefined && value >= max}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-40"
    >
      +
    </button>
  </div>
);
