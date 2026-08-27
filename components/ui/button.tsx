"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

export function Button({ className, variant, size, full, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, full }), className)} {...props} />
  );
}
