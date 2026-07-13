"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Newspaper } from "lucide-react";

const PAGE_SIZE = 10;

interface BlogPostRow {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  author: string;
  tags: string[];
  bodyMarkdown: string;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
}

interface FormState {
  open: boolean;
  editingId: string | null;
  title: string;
  slug: string;
  slugTouched: boolean;
  summary: string;
  coverImage: string;
  author: string;
  tags: string;
  bodyMarkdown: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormState = {
  open: false,
  editingId: null,
  title: "",
  slug: "",
  slugTouched: false,
  summary: "",
  coverImage: "",
  author: "Team",
  tags: "",
  bodyMarkdown: "",
  isPublished: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const {
    data: listResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-blog", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load posts (${res.status})`);
      return json as { data: BlogPostRow[]; meta?: { total?: number } };
    },
  });

  const posts = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.slug.trim()) throw new Error("Slug is required");
      if (!form.summary.trim()) throw new Error("Summary is required");
      if (!form.bodyMarkdown.trim()) throw new Error("Body is required");

      const body = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        summary: form.summary.trim(),
        coverImage: form.coverImage || undefined,
        author: form.author.trim() || "Team",
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        bodyMarkdown: form.bodyMarkdown,
        isPublished: form.isPublished,
      };

      const url = form.editingId ? `/api/admin/blog/${form.editingId}` : "/api/admin/blog";
      const res = await fetch(url, {
        method: form.editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Save failed (${res.status})`);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast({ title: form.editingId ? "Post updated" : "Post created" });
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  async function handleCoverSelected(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/admin/blog/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Upload failed (${res.status})`);
      setForm((s) => ({ ...s, coverImage: json.data.url }));
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function openEdit(post: BlogPostRow) {
    setForm({
      open: true,
      editingId: post._id,
      title: post.title,
      slug: post.slug,
      slugTouched: true,
      summary: post.summary,
      coverImage: post.coverImage ?? "",
      author: post.author,
      tags: post.tags.join(", "),
      bodyMarkdown: post.bodyMarkdown,
      isPublished: post.isPublished,
    });
  }

  const columns = [
    {
      key: "cover",
      label: "Cover",
      render: (post: BlogPostRow) => (
        <div className="h-12 w-16 rounded-md bg-muted overflow-hidden border flex-shrink-0">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Newspaper className="h-5 w-5" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (post: BlogPostRow) => (
        <div>
          <p className="font-medium">{post.title}</p>
          <p className="text-xs text-muted-foreground">/blog/{post.slug}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (post: BlogPostRow) => (
        <Badge variant={post.isPublished ? "success" : "secondary"}>
          {post.isPublished ? "Published" : "Draft"}
        </Badge>
      ),
    },
    {
      key: "publishedAt",
      label: "Published",
      render: (post: BlogPostRow) => (
        <span className="text-xs text-muted-foreground">
          {post.publishedAt ? post.publishedAt.slice(0, 10) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (post: BlogPostRow) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit post" onClick={() => openEdit(post)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            title="Delete post"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete this post?",
                description: "This removes the post from the blog. This cannot be undone.",
                variant: "destructive",
              });
              if (ok) deleteMutation.mutate(post._id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requiredPermissions={["manage:blog"]}>
      <div className="flex flex-col">
        <Header title="Blog" subtitle="Write and publish articles for the storefront blog" />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          {isError && (
            <ErrorState error={error} fallback="Unable to load posts." onRetry={() => refetch()} />
          )}

          <div className="flex justify-end">
            <Button onClick={() => setForm({ ...EMPTY_FORM, open: true })}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={posts}
            loading={isLoading}
            keyExtractor={(post) => post._id}
            emptyMessage="No posts found."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        <Dialog open={form.open} onOpenChange={(open) => setForm((s) => (open ? s : EMPTY_FORM))}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                {form.editingId ? "Edit Post" : "New Post"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="post-title">Title *</Label>
                <Input
                  id="post-title"
                  value={form.title}
                  maxLength={160}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((s) => ({
                      ...s,
                      title,
                      slug: s.slugTouched ? s.slug : slugify(title),
                    }));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-slug">Slug *</Label>
                <Input
                  id="post-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, slug: slugify(e.target.value), slugTouched: true }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-summary">Summary *</Label>
                <Input
                  id="post-summary"
                  value={form.summary}
                  maxLength={300}
                  onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="post-author">Author</Label>
                  <Input
                    id="post-author"
                    value={form.author}
                    onChange={(e) => setForm((s) => ({ ...s, author: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="post-tags">Tags (comma separated)</Label>
                  <Input
                    id="post-tags"
                    value={form.tags}
                    onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))}
                    placeholder="guide, skincare"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Cover image</Label>
                {form.coverImage ? (
                  <div className="relative h-32 w-full rounded-md border bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.coverImage} alt="" className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute right-2 top-2 h-7"
                      onClick={() => setForm((s) => ({ ...s, coverImage: "" }))}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <FileDropzone
                    accept="image/*"
                    disabled={uploading}
                    busy={uploading}
                    onFilesSelected={handleCoverSelected}
                    idleLabel={uploading ? "Uploading…" : "Drag an image here or click to browse"}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm font-medium">Uploading…</span>
                      </>
                    ) : undefined}
                  </FileDropzone>
                )}
              </div>

              <MarkdownEditor
                label="Body *"
                value={form.bodyMarkdown}
                onChange={(bodyMarkdown) => setForm((s) => ({ ...s, bodyMarkdown }))}
                minRows={10}
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="post-isPublished"
                  checked={form.isPublished}
                  onCheckedChange={(checked) =>
                    setForm((s) => ({ ...s, isPublished: checked === true }))
                  }
                />
                <Label htmlFor="post-isPublished" className="cursor-pointer">
                  Published
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(EMPTY_FORM)}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploading}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {form.editingId ? "Save changes" : "Create post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
