import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Mystik Cove brand palette — ritual editorial dark system
const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ring-1 ring-inset font-sans",
  {
    variants: {
      variant: {
        // Ochre — primary brand accent
        default: "bg-[#3d2a18] text-[#bb7b3d] ring-[#bb7b3d]/30",
        // Sage — earthy success
        success: "bg-[#1e2e1a] text-[#6b8c5e] ring-[#6b8c5e]/30",
        // Deepened ochre — warning
        warning: "bg-[#3a2510] text-[#c4914a] ring-[#c4914a]/30",
        // Oxblood — danger / error
        danger: "bg-[#3a1c1a] text-[#7c3b37] ring-[#7c3b37]/40",
        // Dusty slate — info
        info: "bg-[#1c2630] text-[#7a8e9e] ring-[#7a8e9e]/30",
        // Muted — neutral state
        muted: "bg-[#2c2a24] text-[#7a7060] ring-[#4c4a40]/40",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
