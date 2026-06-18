import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

interface ErrorStateProps {
  error: unknown;
  fallback?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, fallback = "Something went wrong.", onRetry, className }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : fallback;
  return (
    <Alert variant="destructive" className={className}>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            <RotateCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
