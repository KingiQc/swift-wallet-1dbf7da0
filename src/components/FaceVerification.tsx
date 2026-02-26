import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Camera, ArrowRight, ArrowLeft, VideoOff } from "lucide-react";

interface FaceVerificationProps {
  onComplete: () => void;
  onBack: () => void;
}

const DIRECTIONS = ["up", "right", "left", "front"] as const;
type Direction = (typeof DIRECTIONS)[number];

const DIRECTION_LABELS: Record<Direction, string> = {
  up: "Look Up",
  right: "Look Right",
  left: "Look Left",
  front: "Look Straight",
};

export default function FaceVerification({ onComplete, onBack }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceSteps, setFaceSteps] = useState<Record<Direction, boolean>>({
    up: false, right: false, left: false, front: false,
  });
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions and try again."
          : "Could not access camera. Make sure your device has a camera."
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  const handleDirectionClick = (dir: Direction) => {
    if (faceSteps[dir] || activeDirection) return;
    setActiveDirection(dir);
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setFaceSteps((prev) => ({ ...prev, [dir]: true }));
        setActiveDirection(null);
        setCountdown(null);
      } else {
        setCountdown(count);
      }
    }, 800);
  };

  const allDone = DIRECTIONS.every((d) => faceSteps[d]);

  return (
    <div className="space-y-5">
      {/* Camera feed */}
      <div className="relative aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-muted border-2 border-border">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <VideoOff className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{cameraError}</p>
            <Button variant="secondary" size="sm" onClick={startCamera}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
                <Camera className="h-10 w-10 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Starting camera…</p>
              </div>
            )}
            {/* Overlay guide */}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[15%] rounded-full border-2 border-primary/40" />
                {activeDirection && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                      <p className="text-sm font-semibold text-primary">
                        {DIRECTION_LABELS[activeDirection]}
                      </p>
                      <p className="text-2xl font-bold text-primary">{countdown}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Direction buttons */}
      <div className="grid grid-cols-2 gap-3">
        {DIRECTIONS.map((dir) => (
          <button
            key={dir}
            onClick={() => handleDirectionClick(dir)}
            disabled={faceSteps[dir] || !!activeDirection || !cameraReady}
            className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-300 text-sm font-medium ${
              faceSteps[dir]
                ? "border-success/50 bg-success/10 text-success"
                : activeDirection === dir
                ? "border-primary bg-primary/10 text-primary animate-pulse"
                : "border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            }`}
          >
            {faceSteps[dir] ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-current" />
            )}
            {DIRECTION_LABELS[dir]}
          </button>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {cameraReady
          ? "Tap each direction, then hold your face in that position"
          : "Allow camera access to continue"}
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onComplete} disabled={!allDone} className="flex-1 glow-primary">
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
