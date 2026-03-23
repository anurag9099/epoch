"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastVariant = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: "text-teal",
  error: "text-rust",
};

const BORDER_COLORS: Record<ToastVariant, string> = {
  success: "border-l-teal",
  error: "border-l-rust",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant, exiting: false }]);
      setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  const success = useCallback((msg: string) => show(msg, "success"), [show]);
  const error = useCallback((msg: string) => show(msg, "error"), [show]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-24 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant];
          return (
            <ToastBubble
              key={toast.id}
              toast={toast}
              Icon={Icon}
              iconColor={ICON_COLORS[toast.variant]}
              borderColor={BORDER_COLORS[toast.variant]}
              onDismiss={() => dismiss(toast.id)}
            />
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({
  toast,
  Icon,
  iconColor,
  borderColor,
  onDismiss,
}: {
  toast: ToastItem;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  borderColor: string;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const entering = mounted && !toast.exiting;

  return (
    <button
      onClick={onDismiss}
      className={`pointer-events-auto bg-surface border border-border-warm border-l-4 ${borderColor} rounded-md px-4 py-3 shadow-none flex items-center gap-2 max-w-sm w-full transition-all duration-200 cursor-pointer ${
        entering
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <span className="text-sm font-body text-ink">{toast.message}</span>
    </button>
  );
}
