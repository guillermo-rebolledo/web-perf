/**
 * React 19 compatibility: Radix UI primitives use ComponentPropsWithoutRef
 * which no longer includes `children` or `className`. We augment the primitives
 * so that our usage (passing children and className) type-checks.
 */
import "react";

declare module "@radix-ui/react-dialog" {
  export interface DialogTriggerProps {
    children?: React.ReactNode;
    asChild?: boolean;
  }
  export interface DialogTitleProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface DialogDescriptionProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface DialogCloseProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface DialogOverlayProps {
    className?: string;
  }
}

declare module "@radix-ui/react-dropdown-menu" {
  export interface DropdownMenuTriggerProps {
    children?: React.ReactNode;
    asChild?: boolean;
  }
  export interface DropdownMenuItemProps {
    children?: React.ReactNode;
    onClick?: (event: Event) => void;
    className?: string;
  }
}

declare module "@radix-ui/react-label" {
  export interface LabelProps {
    children?: React.ReactNode;
    className?: string;
    htmlFor?: string;
  }
}

declare module "@radix-ui/react-select" {
  export interface SelectTriggerProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface SelectContentProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface SelectItemProps {
    children?: React.ReactNode;
    value: string;
    className?: string;
  }
  export interface SelectIconProps {
    children?: React.ReactNode;
    asChild?: boolean;
  }
  export interface SelectScrollUpButtonProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface SelectScrollDownButtonProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface SelectViewportProps {
    children?: React.ReactNode;
    className?: string;
  }
  export interface SelectLabelProps {
    className?: string;
  }
  export interface SelectSeparatorProps {
    className?: string;
  }
}

declare module "@radix-ui/react-switch" {
  export interface SwitchProps {
    id?: string;
    className?: string;
    children?: React.ReactNode;
  }
  export interface SwitchThumbProps {
    className?: string;
  }
}

declare module "@radix-ui/react-tooltip" {
  export interface TooltipTriggerProps {
    children?: React.ReactNode;
    asChild?: boolean;
  }
}
