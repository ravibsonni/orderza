"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, FileText, Image, Table } from "lucide-react";
import type { ExtractedMenu } from "@/lib/ai/extract";

interface Step2Props {
  restaurantId: string;
  restaurantName: string;
  onComplete: (xp: number, extractedMenu: ExtractedMenu) => void;
}

const FORMAT_PILLS = [
  { label: "PDF", icon: <FileText className="w-3 h-3" /> },
  { label: "JPG", icon: <Image className="w-3 h-3" /> },
  { label: "PNG", icon: <Image className="w-3 h-3" /> },
  { label: "CSV", icon: <Table className="w-3 h-3" /> },
  { label: "Excel", icon: <Table className="w-3 h-3" /> },
];

export function Step2Upload({ restaurantId, restaurantName, onComplete }: Step2Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "uploading" | "reading" | "done">("idle");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [resultSummary, setResultSummary] = useState<{ categories: number; items: number } | null>(null);
  const [extractedMenu, setExtractedMenu] = useState<ExtractedMenu | null>(null);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus("uploading");
    setProgress(20);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("restaurantName", restaurantName);

    setProgress(40);
    setStatus("reading");

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85));
    }, 400);

    try {
      const res = await fetch("/api/menu/extract", { method: "POST", body: formData });
      clearInterval(interval);

      if (!res.ok) throw new Error((await res.json()).error);

      const { data } = await res.json() as { data: ExtractedMenu };
      setProgress(100);
      setStatus("done");
      setResultSummary({ categories: data.categories.length, items: data.items.length });
      setExtractedMenu(data);
    } catch (err) {
      clearInterval(interval);
      setStatus("idle");
      setProgress(0);
      toast({
        title: "Extraction failed",
        description: String(err) ?? "Please try again or use a different file.",
        variant: "destructive",
      });
    }
  }, [restaurantName, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: status !== "idle",
  });

  const handleContinue = () => {
    if (!extractedMenu) return;
    onComplete(100, extractedMenu);
  };

  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">📋</div>
        <h2 className="text-2xl font-bold text-brand-green">Upload your menu</h2>
        <p className="text-muted-foreground">Our AI reads PDFs, photos, spreadsheets — whatever you have.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 1 minute</p>
      </div>

      {/* Format pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {FORMAT_PILLS.map(({ label, icon }) => (
          <span key={label} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm font-medium">
            {icon} {label}
          </span>
        ))}
      </div>

      {/* Drop zone */}
      {status === "idle" ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${isDragActive ? "border-brand-green bg-brand-green/5" : "border-border hover:border-brand-green/50 hover:bg-secondary/50"}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-semibold text-brand-green">
            {isDragActive ? "Drop it here!" : "Tap here to upload"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">or drag and drop your menu file</p>
          <p className="text-xs text-muted-foreground mt-2">Maximum file size: 20 MB</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-brand-green shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {status === "uploading" && "Uploading..."}
                {status === "reading" && "Reading your menu with AI..."}
                {status === "done" && `Found ${resultSummary?.categories} categories and ${resultSummary?.items} items`}
              </p>
            </div>
            {status !== "done" && <Loader2 className="w-5 h-5 animate-spin text-brand-green shrink-0" />}
            {status === "done" && <span className="text-2xl">✅</span>}
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && resultSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-800 font-semibold">
            🎉 Found {resultSummary.categories} categories and {resultSummary.items} menu items!
          </p>
          <p className="text-emerald-600 text-sm mt-1">Review and edit them in the next step.</p>
        </div>
      )}

      <div className="flex gap-3">
        {status === "done" ? (
          <Button size="lg" className="w-full" onClick={handleContinue}>
            Review my menu →
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={status !== "idle"}
            onClick={() => {
              /* Allow skipping with manual entry */
              onComplete(100, { categories: [], items: [], confidence: "low" });
            }}
          >
            Skip — I'll add items manually
          </Button>
        )}
      </div>
    </div>
  );
}
