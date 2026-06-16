"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCartStore } from "@/store/cartStore";
import { User, Search } from "lucide-react";
interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  category: "homecare" | "cosmetics" | "wellness" | "scent";
  retailPrice: number;
  images: string[];
  stock: number;
  variants: {
    _id: string;
    name: string;
    sku: string;
    attributes: { key: string; value: string }[];
    retailPrice: number;
    stock: number;
  }[];
}

interface Branch {
  _id: string;
  name: string;
}

interface Member {
  _id: string;
  memberId: string;
  name: string;
  phone: string;
  discountPercent: number;
  status: string;
}

export default function POSPage() {
  const { data: session } = useSession();
  const defaultBranchId = session?.user?.branchIds?.[0] ?? "";
  const { setMember, setBranchId } = useCartStore();

  const isOrgAdmin = session?.user?.role === "ORG_ADMIN";
  const orgCaps = session?.user?.organizationCapabilities;
  const posBlocked = isOrgAdmin && orgCaps?.posSurface === "none";
  const orgTypeLabel = session?.user?.organizationType
    ? session.user.organizationType.charAt(0).toUpperCase() + session.user.organizationType.slice(1)
    : "organization";

  // Users with an assigned branch use it automatically; admins and franchise org admins pick from a list.
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const branchId = selectedBranchId || defaultBranchId;

  const needsBranchSelect = !defaultBranchId || (isOrgAdmin && orgCaps?.posSurface === "branch");

  const {
    data: branches = [],
    isError: isBranchesError,
    error: branchesError,
  } = useQuery<Branch[]>({
    queryKey: ["branches-for-pos", session?.user?.organizationId],
    queryFn: async () => {
      const res = await fetch("/api/branches?limit=100");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load branches (${res.status})`);
      return (data.data ?? []) as Branch[];
    },
    enabled: needsBranchSelect && !posBlocked,
  });

  useEffect(() => {
    if (branchId) setBranchId(branchId);
  }, [branchId, setBranchId]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState("");

  const {
    data: products = [],
    isError: isProductsError,
    error: productsError,
  } = useQuery<POSProduct[]>({
    queryKey: ["pos-products", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/products/pos?branchId=${branchId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load products (${res.status})`);
      return (data.data ?? []) as POSProduct[];
    },
    enabled: !!branchId,
    staleTime: 30_000,
  });

  async function searchMembers() {
    if (!memberSearch.trim()) return;
    setSearching(true);
    setMemberSearchError("");
    try {
      const res = await fetch(
        `/api/members?search=${encodeURIComponent(memberSearch)}&status=active&branchId=${branchId}`
      );
      const data = await res.json();
      if (!data.success) {
        setMemberResults([]);
        setMemberSearchError(data.error ?? `Search failed (${res.status})`);
        return;
      }
      setMemberResults((data.data ?? []) as Member[]);
    } catch (e) {
      setMemberResults([]);
      setMemberSearchError(e instanceof Error ? e.message : "Member search failed.");
    } finally {
      setSearching(false);
    }
  }

  function selectMember(member: Member) {
    setMember(member._id, member.name, member.discountPercent);
    setMemberSearchOpen(false);
    setMemberSearch("");
    setMemberResults([]);
    setMemberSearchError("");
  }

  if (posBlocked) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 p-8">
        <h1 className="font-bold text-lg">Point of Sale unavailable</h1>
        <Alert className="max-w-md">
          <AlertDescription>
            {orgTypeLabel} accounts do not use in-store POS. Use Purchase Orders or My Panel for your workflow.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
      {/* Products Panel */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* POS Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-background">
          <h1 className="font-bold text-lg">Point of Sale</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-3">
            <User className="h-4 w-4" />
            <span>{session?.user?.name}</span>
            {needsBranchSelect ? (
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue placeholder="Select branch…" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              branchId && <Badge variant="secondary">Branch Active</Badge>
            )}
          </div>
        </div>
        {needsBranchSelect && isBranchesError && (
          <Alert variant="destructive" className="mx-4 shrink-0">
            <AlertDescription>
              {branchesError instanceof Error ? branchesError.message : "Unable to load branches."}
            </AlertDescription>
          </Alert>
        )}
        {!!branchId && isProductsError && (
          <Alert variant="destructive" className="mx-4 shrink-0">
            <AlertDescription>
              {productsError instanceof Error ? productsError.message : "Unable to load products for this branch."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProductGrid products={products} branchId={branchId} />
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full shrink-0 border-t lg:w-80 lg:border-t-0 lg:border-l xl:w-96">
        <CartPanel
          onCheckout={() => setCheckoutOpen(true)}
          onMemberSearch={() => setMemberSearchOpen(true)}
          branchId={branchId}
        />
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        branchId={branchId}
      />

      {/* Member Search Modal */}
      <Dialog
        open={memberSearchOpen}
        onOpenChange={(v) => {
          setMemberSearchOpen(v);
          if (!v) {
            setMemberSearch("");
            setMemberResults([]);
            setMemberSearchError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Find Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {memberSearchError && (
              <Alert variant="destructive">
                <AlertDescription>{memberSearchError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, phone, or member ID..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchMembers()}
              />
              <Button onClick={searchMembers} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {memberResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {memberResults.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => selectMember(member)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted text-left transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.memberId} • {member.phone}
                      </p>
                    </div>
                    <Badge variant="success" className="text-xs">
                      {member.discountPercent}% off
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {memberSearch && memberResults.length === 0 && !searching && !memberSearchError && (
              <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
