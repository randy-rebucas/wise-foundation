"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMediaAssets, type MediaAssetRow } from "@/lib/client/media";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUrls: string[];
  maxPick: number;
  onConfirm: (urls: string[]) => void;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  selectedUrls,
  maxPick,
  onConfirm,
}: MediaPickerDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [picked, setPicked] = useState<string[]>([]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["media", "picker", debouncedSearch],
    queryFn: () =>
      fetchMediaAssets({ page: 1, limit: 60, search: debouncedSearch || undefined }),
    enabled: open,
  });

  const items = data?.items ?? [];
  const room = Math.max(0, maxPick - selectedUrls.length);

  function toggle(url: string) {
    if (selectedUrls.includes(url) || picked.includes(url)) {
      setPicked((prev) => prev.filter((u) => u !== url));
      return;
    }
    if (picked.length >= room) return;
    setPicked((prev) => [...prev, url]);
  }

  function isSelected(item: MediaAssetRow) {
    return selectedUrls.includes(item.url) || picked.includes(item.url);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setPicked([]);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Choose from media library</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="pl-9"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive py-4">
              {error instanceof Error ? error.message : "Failed to load media."}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {debouncedSearch
                ? `No results for "${debouncedSearch}".`
                : "No media yet. Upload files on the Media page first."}
            </p>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {items.map((item) => {
                const selected = isSelected(item);
                const disabled =
                  !selected && picked.length >= room && !selectedUrls.includes(item.url);
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(item.url)}
                      className={cn(
                        "relative w-full aspect-square rounded-md overflow-hidden border-2 transition-colors",
                        selected ? "border-primary ring-2 ring-primary/30" : "border-transparent",
                        disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.filename ?? ""}
                        className="h-full w-full object-cover"
                      />
                      {selected && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            {picked.length} selected · {room} slot{room === 1 ? "" : "s"} available
          </p>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.length === 0}
            onClick={() => {
              onConfirm(picked);
              setPicked([]);
              onOpenChange(false);
            }}
          >
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
