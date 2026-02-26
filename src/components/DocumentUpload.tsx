import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Upload, X, FileText, CheckCircle2 } from "lucide-react";

interface DocumentUploadProps {
  onComplete: (docs: { front: File; back?: File }) => void;
  onBack: () => void;
}

export default function DocumentUpload({ onComplete, onBack }: DocumentUploadProps) {
  const [frontDoc, setFrontDoc] = useState<File | null>(null);
  const [backDoc, setBackDoc] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File, side: "front" | "back") => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setFrontDoc(file);
      setFrontPreview(url);
    } else {
      setBackDoc(file);
      setBackPreview(url);
    }
  };

  const removeFile = (side: "front" | "back") => {
    if (side === "front") {
      setFrontDoc(null);
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontPreview(null);
    } else {
      setBackDoc(null);
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackPreview(null);
    }
  };

  const renderUploadBox = (
    side: "front" | "back",
    label: string,
    file: File | null,
    preview: string | null,
    inputRef: React.RefObject<HTMLInputElement>,
    required: boolean
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f, side);
        }}
      />
      {file && preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <img src={preview} alt={label} className="w-full h-36 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => removeFile(side)}
              className="p-1 rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium backdrop-blur-sm">
            <CheckCircle2 className="h-3 w-3" /> Uploaded
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-lg border-2 border-dashed border-border bg-muted hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Tap to upload or take photo</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Upload a valid government-issued ID (passport, driver's license, or national ID card)
        </p>
      </div>

      {renderUploadBox("front", "Front of ID", frontDoc, frontPreview, frontRef as any, true)}
      {renderUploadBox("back", "Back of ID (optional)", backDoc, backPreview, backRef as any, false)}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          onClick={() => frontDoc && onComplete({ front: frontDoc, back: backDoc || undefined })}
          disabled={!frontDoc}
          className="flex-1 glow-primary"
        >
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
