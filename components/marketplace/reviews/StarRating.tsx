import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  rating: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  label?: string;
};

export function StarRating({
  rating,
  max = 5,
  size = "md",
  className,
  label,
}: StarRatingProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div
      className={cn("flex gap-0.5 text-[#FBC02D]", className)}
      aria-label={label ?? `${rating} out of ${max} stars`}
      role="img"
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(iconClass, i < rating ? "fill-current" : "opacity-25")}
          aria-hidden
        />
      ))}
    </div>
  );
}

type InteractiveStarRatingProps = {
  rating: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
};

export function InteractiveStarRating({
  rating,
  onChange,
  disabled,
}: InteractiveStarRatingProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="rounded p-1 disabled:opacity-50"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={cn(
              "h-6 w-6",
              n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
