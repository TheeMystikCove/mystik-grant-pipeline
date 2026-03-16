import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-sans text-sm font-semibold tracking-wide uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#bb7b3d]/60 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        // Ochre fill — primary action
        default: "bg-[#bb7b3d] text-[#efe8d6] shadow-sm hover:bg-[#cc8f4e]",
        // Alias for default — explicit semantic name
        primary: "bg-[#bb7b3d] text-[#efe8d6] shadow-sm hover:bg-[#cc8f4e]",
        // Oxblood — destructive / danger
        destructive: "bg-[#7c3b37] text-[#efe8d6] shadow-sm hover:bg-[#8f4440]",
        // Outlined — secondary action
        outline: "border border-[#4c4a40] bg-transparent text-[#c8bfa8] shadow-sm hover:bg-[#3a3830] hover:text-[#efe8d6]",
        // Ghost — tertiary / nav action
        ghost: "text-[#c8bfa8] hover:bg-[#3a3830] hover:text-[#efe8d6]",
        // Link — inline text action
        link: "text-[#bb7b3d] underline-offset-4 hover:underline hover:text-[#cc8f4e]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
