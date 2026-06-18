import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<LoadingStateProps["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingState({ label, className, size = "lg" }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-center", className)}>
      <Loader2 className={cn(SIZE_CLASS[size], "animate-spin text-muted-foreground")} />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
