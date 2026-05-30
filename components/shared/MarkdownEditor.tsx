"use client";

import { useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { cn } from "@/lib/utils";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

type WrapKind = "bold" | "italic" | "link" | "h2" | "quote" | "ul" | "ol";

const textareaClass = cn(
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "resize-y min-h-[6rem]"
);

export type MarkdownEditorProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  helperText?: React.ReactNode;
  className?: string;
};

function applyWrap(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: WrapKind
): { next: string; cursorStart: number; cursorEnd: number } {
  const selected = value.slice(selectionStart, selectionEnd);
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEnd = value.indexOf("\n", selectionEnd);
  const line = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);

  switch (kind) {
    case "bold": {
      const wrapped = `**${selected || "text"}**`;
      const next = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
      const innerStart = selectionStart + 2;
      const innerEnd = innerStart + (selected || "text").length;
      return { next, cursorStart: innerStart, cursorEnd: innerEnd };
    }
    case "italic": {
      const wrapped = `*${selected || "text"}*`;
      const next = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
      const innerStart = selectionStart + 1;
      const innerEnd = innerStart + (selected || "text").length;
      return { next, cursorStart: innerStart, cursorEnd: innerEnd };
    }
    case "link": {
      const wrapped = `[${selected || "label"}](url)`;
      const next = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
      const urlStart = selectionStart + (selected || "label").length + 3;
      return { next, cursorStart: urlStart, cursorEnd: urlStart + 3 };
    }
    case "h2": {
      const trimmed = line.replace(/^#+\s*/, "");
      const prefix = line.startsWith("## ") ? "" : "## ";
      const newLine = `${prefix}${trimmed || "Heading"}`;
      const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd === -1 ? value.length : lineEnd);
      return { next, cursorStart: lineStart + newLine.length, cursorEnd: lineStart + newLine.length };
    }
    case "quote": {
      const trimmed = line.replace(/^>\s*/, "");
      const newLine = `> ${trimmed || "Quote"}`;
      const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd === -1 ? value.length : lineEnd);
      return { next, cursorStart: lineStart + newLine.length, cursorEnd: lineStart + newLine.length };
    }
    case "ul": {
      const lines = (selected || "List item").split("\n");
      const block = lines.map((l) => `- ${l}`).join("\n");
      const next = value.slice(0, selectionStart) + block + value.slice(selectionEnd);
      return { next, cursorStart: selectionStart, cursorEnd: selectionStart + block.length };
    }
    case "ol": {
      const lines = (selected || "List item").split("\n");
      const block = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
      const next = value.slice(0, selectionStart) + block + value.slice(selectionEnd);
      return { next, cursorStart: selectionStart, cursorEnd: selectionStart + block.length };
    }
  }
}

export function MarkdownEditor({
  id: idProp,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  minRows = 4,
  helperText,
  className,
}: MarkdownEditorProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  function runWrap(kind: WrapKind) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { next, cursorStart, cursorEnd } = applyWrap(value, start, end, kind);
    onChange(maxLength ? next.slice(0, maxLength) : next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  const toolbar = (
    <div className="flex flex-wrap gap-0.5 rounded-t-md border border-b-0 border-input bg-muted/40 p-1">
      {(
        [
          ["bold", Bold, "Bold"],
          ["italic", Italic, "Italic"],
          ["link", Link2, "Link"],
          ["h2", Heading2, "Heading"],
          ["ul", List, "Bullet list"],
          ["ol", ListOrdered, "Numbered list"],
          ["quote", Quote, "Quote"],
        ] as const
      ).map(([kind, Icon, title]) => (
        <Button
          key={kind}
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={title}
          aria-label={title}
          onClick={() => runWrap(kind)}
          disabled={tab === "preview"}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "write" | "preview")}
        className="w-full"
      >
        <TabsList className="h-9 w-full justify-start rounded-b-none border border-input border-b-0 bg-muted/30">
          <TabsTrigger value="write" className="text-xs sm:text-sm">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs sm:text-sm">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-0">
          {toolbar}
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              onChange(maxLength ? next.slice(0, maxLength) : next);
            }}
            placeholder={placeholder}
            rows={minRows}
            maxLength={maxLength}
            className={cn(textareaClass, "rounded-t-none")}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div
            className={cn(
              "min-h-[6rem] rounded-md border border-input bg-muted/20 px-3 py-3",
              minRows >= 6 ? "min-h-[10rem]" : ""
            )}
          >
            {value.trim() ? (
              <MarkdownContent content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {helperText}
    </div>
  );
}
