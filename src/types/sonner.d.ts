declare module "sonner" {
  import type { ReactNode } from "react";

  export interface ToasterProps {
    theme?: "light" | "dark" | "system";
    className?: string;
    toastOptions?: {
      classNames?: Record<string, string>;
    };
  }

  type ToastFn = (message: string | ReactNode, options?: Record<string, unknown>) => void;

  export const toast: ToastFn & {
    success: ToastFn;
    info: ToastFn;
    warning: ToastFn;
    error: ToastFn;
  };

  export const Toaster: React.FC<ToasterProps>;
}
