"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCartStore } from "@/store/cartStore";
import { User, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  category: "homecare" | "cosmetics" | "wellness" | "scent";
  retailPrice: number;
  memberPrice: number;
  images: string[];
  stock: number;
  variants: {
    _id: string;
    name: string;
    sku: string;
    attributes: { key: string; value: string }[];
    retailPrice: number;
    memberPrice: number;
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
  const { memberId: cartMemberId, setMember, setBranchId } = useCartStore();

  // Users with an assigned branch use it automatically; admins pick from a list.
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const branchId = selectedBranchId || defaultBranchId;

  const needsBranchSelect = !defaultBranchId;

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches-for-pos"],
    queryFn: async () => {
      const res = await fetch("/api/branches?limit=100");
      const data = await res.json();
      return data.data ?? [];
    },
    enabled: needsBranchSelect,
  });

  useEffect(() => {
    if (branchId) setBranchId(branchId);
  }, [branchId, setBranchId]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  const isMember = !!cartMemberId;

  const { data: products = [] } = useQuery<POSProduct[]>({
    queryKey: ["pos-products", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/products/pos?branchId=${branchId}`);
      const data = await res.json();
      return data.data ?? [];
    },
    enabled: !!branchId,
    staleTime: 30_000,
  });

  async function searchMembers() {
    if (!memberSearch.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/members?search=${encodeURIComponent(memberSearch)}&status=active&branchId=${branchId}`
      );
      const data = await res.json();
      setMemberResults(data.data ?? []);
    } finally {
      setSearching(false);
    }
  }

  function selectMember(member: Member) {
    setMember(member._id, member.name, member.discountPercent);
    setMemberSearchOpen(false);
    setMemberSearch("");
    setMemberResults([]);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Products Panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* POS Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <h1 className="font-bold text-lg">Point of Sale</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
        <ProductGrid products={products} isMember={isMember} branchId={branchId} />
      </div>

      {/* Cart Panel */}
      <div className="w-80 xl:w-96 flex-shrink-0">
        <CartPanel
          onCheckout={() => setCheckoutOpen(true)}
          onMemberSearch={() => setMemberSearchOpen(true)}
        />
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        branchId={branchId}
      />

      {/* Member Search Modal */}
      <Dialog open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Find Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            {memberSearch && memberResults.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
