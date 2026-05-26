import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    style={{ top: `calc(var(--toast-header-offset, 0px) + 16px)` } as React.CSSProperties}
    className={cn(
      "fixed left-1/2 -translate-x-1/2 z-[10000] flex max-h-screen w-full flex-col items-center gap-2 p-4 sm:max-w-[480px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    /* Layout */
    "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden",
    /* Shape: The iOS Elastic Pill */
    "rounded-2xl px-5 py-4",
    /* Glass Surface */
    "backdrop-blur-2xl saturate-200",
    /* Hairline Bezel - catches light */
    "border border-white/20",
    /* Depth Shadow */
    "shadow-[0_20px_60px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]",
    /* Transitions */
    "transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
    /* Radix Animations */
    "data-[swipe=cancel]:translate-y-0",
    "data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)]",
    "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]",
    "data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=open]:slide-in-from-top-4 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90",
    "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-4 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-90",
  ].join(" "),
  {
    variants: {
      variant: {
        /* DEFAULT: Neutral Glass — Pure Event Notification */
        default: [
          "bg-white/80 dark:bg-black/75",
          "text-gray-900 dark:text-white",
          "border-white/25 dark:border-white/10",
        ].join(" "),
        /* DESTRUCTIVE: Alarm Glass — Critical Error */
        destructive: [
          "destructive group",
          "bg-red-950/80 dark:bg-red-950/85",
          "text-red-50",
          "border-red-500/40",
          "shadow-[0_20px_60px_rgba(220,38,38,0.25),0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border bg-transparent px-3 text-sm font-semibold ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-red-400/30 group-[.destructive]:hover:border-red-400/50 group-[.destructive]:hover:bg-red-900/50 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1 w-6 h-6 flex items-center justify-center",
      "bg-black/5 dark:bg-white/5 text-foreground/40",
      "opacity-0 transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100",
      "group-[.destructive]:text-red-300/60 group-[.destructive]:hover:text-red-50 group-[.destructive]:hover:bg-red-900/40 group-[.destructive]:focus:ring-red-400",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3 w-3" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      "text-sm font-bold tracking-tight leading-snug",
      "text-gray-900 dark:text-white",
      "group-[.destructive]:text-red-50",
      className
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "text-sm leading-relaxed mt-0.5",
      "text-gray-600 dark:text-white/60",
      "group-[.destructive]:text-red-200/80",
      className
    )}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
