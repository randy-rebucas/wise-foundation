import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function TenantNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <Building2 className="h-16 w-16 text-muted-foreground opacity-30" />
      <div>
        <h1 className="text-3xl font-bold">Organization Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The organization you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go to my dashboard</Link>
      </Button>
    </div>
  );
}
