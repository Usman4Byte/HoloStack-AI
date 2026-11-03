import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui-style local primitive: owned by the application and accessible by default.
const variants = cva("button", { variants: { variant: { default: "button-primary", outline: "button-outline", ghost: "button-ghost" }, size: { default: "", sm: "button-sm", icon: "button-icon" } }, defaultVariants: { variant: "default", size: "default" } });
export function Button({ asChild = false, variant, size, className, ...props }: ComponentProps<"button"> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(variants({ variant, size }), className)} {...props} />;
}
