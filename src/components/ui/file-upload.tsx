"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { CheckCircle, File as FileIcon, Loader, Trash2, UploadCloud } from "lucide-react";

const accent = "#19b94b";
const outline = "#b4b4b4";

type FileItem = {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  file: File;
};

type FileUploadProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxBytes?: number;
  disabled?: boolean;
  onReject?: (message: string) => void;
};

// Drop zone for choosing files, with a green hover and a list of what was picked.
export function FileUpload({
  files,
  onFilesChange,
  accept = "application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg",
  multiple = true,
  maxFiles = 10,
  maxBytes = 10 * 1024 * 1024,
  disabled = false,
  onReject,
}: FileUploadProps) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<Map<string, number>>(new Map());

  // Drops files the parent removed, including after a successful submit.
  useEffect(() => {
    setItems((current) => {
      const next = current.filter((item) => files.includes(item.file));
      for (const item of current) {
        if (files.includes(item.file)) continue;
        URL.revokeObjectURL(item.preview);
        const timer = timers.current.get(item.id);
        if (timer) window.clearInterval(timer);
        timers.current.delete(item.id);
      }
      return next;
    });
  }, [files]);

  useEffect(() => {
    const running = timers.current;
    return () => {
      for (const timer of running.values()) window.clearInterval(timer);
      running.clear();
    };
  }, []);

  // Plays the progress bar for a file that was just added.
  function simulateUpload(id: string) {
    let progress = 0;
    const interval = window.setInterval(() => {
      progress += Math.random() * 15;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, progress: Math.min(progress, 100) } : item)),
      );
      if (progress >= 100) {
        window.clearInterval(interval);
        timers.current.delete(id);
      }
    }, 300);
    timers.current.set(id, interval);
  }

  // Keeps PDF, PNG, and JPG files that fit the size and count limits.
  function handleFiles(fileList: FileList) {
    if (disabled) return;
    const existing = items.map((item) => item.file);
    const next = [...existing];
    const added: FileItem[] = [];
    let message = "";
    for (const file of Array.from(fileList)) {
      if (!allowedType(file, accept)) {
        message = "Upload a PDF, PNG, or JPG.";
        continue;
      }
      if (file.size > maxBytes) {
        message = "Each file must be 10 MB or smaller.";
        continue;
      }
      const duplicate = next.some((item) => item.name === file.name && item.size === file.size);
      if (duplicate) continue;
      if (next.length >= maxFiles) {
        message = `Upload between 1 and ${maxFiles} files.`;
        break;
      }
      const preview = URL.createObjectURL(file);
      added.push({
        id: `${preview}-${Date.now()}-${added.length}`,
        preview,
        progress: 0,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      });
      next.push(file);
    }
    if (added.length > 0) {
      setItems((prev) => [...prev, ...added]);
      onFilesChange(next);
      added.forEach((item) => simulateUpload(item.id));
    }
    onReject?.(message);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) handleFiles(event.dataTransfer.files);
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  function onSelect(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) handleFiles(event.target.files);
  }

  function removeFile(item: FileItem) {
    URL.revokeObjectURL(item.preview);
    const timer = timers.current.get(item.id);
    if (timer) window.clearInterval(timer);
    timers.current.delete(item.id);
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    onFilesChange(files.filter((file) => file !== item.file));
  }

  function clearAll() {
    for (const item of items) URL.revokeObjectURL(item.preview);
    for (const timer of timers.current.values()) window.clearInterval(timer);
    timers.current.clear();
    setItems([]);
    onFilesChange([]);
  }

  const highlighted = isDragging || isHovering;

  return (
    <div className="w-full">
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        initial={false}
        animate={{
          borderColor: highlighted ? accent : outline,
          scale: isDragging ? 1.02 : 1,
        }}
        whileHover={disabled ? undefined : { scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "relative rounded-2xl border bg-secondary/50 p-8 text-center shadow-sm backdrop-blur group",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:shadow-md",
          isDragging && "ring-4 ring-[#19b94b]/30",
        )}
      >
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
            transition={{
              duration: 1.5,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: isDragging ? [0.5, 1, 0.5] : 1,
                scale: isDragging ? [0.95, 1.05, 0.95] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isDragging ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="absolute -inset-4 rounded-full bg-[#19b94b]/10 blur-md"
              style={{ display: isDragging ? "block" : "none" }}
            />
            <UploadCloud
              className={clsx(
                "h-16 w-16 drop-shadow-sm md:h-20 md:w-20",
                highlighted ? "text-[#19b94b]" : "text-zinc-700 transition-colors duration-300 group-hover:text-[#19b94b] dark:text-zinc-300",
              )}
            />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              {isDragging ? "Drop files here" : items.length ? "Add more files" : "Upload your files"}
            </h3>
            <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-300">
              {isDragging ? (
                <span className="font-medium text-[#19b94b]">Release to upload</span>
              ) : (
                <>
                  Drag & drop files here, or <span className="font-medium text-[#19b94b]">browse</span>
                </>
              )}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">PDF, PNG, or JPG. Up to 10 MB each.</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            hidden
            disabled={disabled}
            onChange={onSelect}
            accept={accept}
          />
        </div>
      </motion.div>

      <div className="mt-4">
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 flex items-center justify-between px-2"
            >
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Uploaded files ({items.length})</h3>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={disabled}
                  className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 hover:text-red-600 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={clsx("flex flex-col gap-3 overflow-y-auto pr-2", items.length > 3 && "max-h-96")}>
          <AnimatePresence>
            {items.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="flex items-start gap-4 rounded-xl bg-zinc-50 px-4 py-4 shadow transition-all duration-200 hover:shadow-md dark:bg-zinc-800/80"
              >
                <div className="relative flex-shrink-0">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-16 w-16 rounded-lg border object-cover shadow-sm dark:border-zinc-700"
                    />
                  ) : (
                    <FileIcon className="h-16 w-16 text-zinc-400" />
                  )}
                  {file.progress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -right-2 -bottom-2 rounded-full bg-white shadow-sm dark:bg-zinc-800"
                    >
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </motion.div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileIcon className="h-5 w-5 flex-shrink-0 text-[#19b94b]" />
                      <h4 className="truncate text-base font-medium text-zinc-800 dark:text-zinc-200" title={file.name}>
                        {file.name}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="text-xs md:text-sm">{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">{Math.round(file.progress)}%</span>
                        {file.progress < 100 ? (
                          <Loader className="h-4 w-4 animate-spin text-[#19b94b]" />
                        ) : (
                          <button
                            type="button"
                            className="text-zinc-400 transition-colors duration-200 hover:text-red-500 disabled:opacity-50 dark:text-zinc-500 dark:hover:text-red-400"
                            disabled={disabled}
                            aria-label="Remove file"
                            onClick={() => removeFile(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      transition={{ duration: 0.4, type: "spring", stiffness: 100, ease: "easeOut" }}
                      className={clsx("h-full rounded-full", file.progress < 100 ? "bg-[#19b94b]" : "bg-emerald-500")}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Formats a byte count as KB or MB.
function formatFileSize(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Checks a file against the accepted invoice types.
function allowedType(file: File, accept: string) {
  const allowed = accept.split(",").map((part) => part.trim().toLowerCase());
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return allowed.some((part) => {
    if (part.startsWith(".")) return name.endsWith(part);
    if (part.endsWith("/*")) return type.startsWith(part.slice(0, -1));
    return type === part;
  });
}
