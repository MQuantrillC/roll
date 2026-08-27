import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-brand text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:brightness-105",
        secondary: "bg-muted text-foreground hover:bg-border/70",
        outline:
          "border-2 border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50",
        ghost: "text-foreground hover:bg-muted",
        accent:
          "bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:brightness-110",
        destructive: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-6 text-base",
        xl: "h-14 px-8 text-lg rounded-3xl",
      },
      full: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
