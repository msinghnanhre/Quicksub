"use client";

import * as React from "react";
import { FileText, UploadCloud, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

type FileDropProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "children"
> & {
  /** Currently attached files (controlled). */
  files?: ReadonlyArray<File | FileLike>;
  /** Called when the user drops or selects new files. */
  onFilesAdded?: (files: File[]) => void;
  /** Called when the user removes an attached file. */
  onFileRemoved?: (file: File | FileLike, index: number) => void;
  /** `accept` attribute on the underlying `<input type="file">`. */
  accept?: string;
  /** Allow multiple files. Default true. */
  multiple?: boolean;
  /** Override the primary headline. */
  title?: React.ReactNode;
  /** Override the secondary hint line. */
  hint?: React.ReactNode;
  /** Disable interaction. */
  disabled?: boolean;
};

/** Minimal shape used to render server-persisted attachments alongside fresh `File`s. */
type FileLike = {
  name: string;
  size?: number;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function FileDrop({
  className,
  files = [],
  onFilesAdded,
  onFileRemoved,
  accept = "application/pdf,image/png,image/jpeg",
  multiple = true,
  title = "Drag & drop plans, photos, or specs",
  hint = "PDF, PNG, JPG — up to 25 MB each",
  disabled = false,
  ...props
}: FileDropProps) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) onFilesAdded?.(dropped);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) onFilesAdded?.(selected);
    e.target.value = "";
  };

  return (
    <div
      data-slot="file-drop"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2.5 rounded-md border-[1.5px] border-dashed px-5 py-6 text-center",
          "transition-[border-color,background-color] duration-150 ease-out",
          dragging
            ? "border-primary bg-brand-tint"
            : "border-border-strong bg-surface-sunk hover:bg-canvas-2",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <UploadCloud
          aria-hidden
          className="size-7 text-ink-subtle"
          strokeWidth={1.5}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13.5px] font-medium text-ink-2">
            {title}
          </span>
          <span className="text-xs text-ink-subtle">{hint}</span>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          // Click bubbles to the outer div, which opens the picker.
          tabIndex={-1}
          className="mt-1.5"
        >
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleSelect}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Attached files">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-sm border border-border bg-surface px-2.5 py-1.5"
            >
              <FileText
                aria-hidden
                className="size-3.5 shrink-0 text-ink-subtle"
              />
              <span className="flex-1 truncate font-mono text-[12.5px] text-ink-2">
                {file.name}
              </span>
              {typeof file.size === "number" && (
                <span className="shrink-0 font-mono text-[11px] text-ink-subtle">
                  {formatBytes(file.size)}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${file.name}`}
                onClick={() => onFileRemoved?.(file, i)}
                className="h-6 w-6 p-0 text-ink-subtle hover:text-ink-2"
              >
                <X className="size-3" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { FileDrop, formatBytes };
export type { FileDropProps, FileLike };
