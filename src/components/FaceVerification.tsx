import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Camera, ArrowRight, ArrowLeft, VideoOff, AlertTriangle } from "lucide-react";

interface FaceVerificationProps {
  onComplete: (snapshots: Blob[]) => void;
  onBack: () => void;
}

const DIRECTIONS = ["front", "left", "right", "up"] as const;
type Direction = (typeof DIRECTIONS)[number];

const DIRECTION_LABELS: Record<Direction, string> = {
  up: "Look Up",
  right: "Look Right",
  left: "Look Left",
  front: "Look Straight",
};

export default function FaceVerification({ onComplete, onBack }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceSteps, setFaceSteps] = useState<Record<Direction, boolean>>({
    up: false, right: false, left: false, front: false,
  });
  const [snapshots, setSnapshots] = useState<Blob[]>([]);
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [hasFaceDetectorAPI, setHasFaceDetectorAPI] = useState(false);
  const detectorRef = useRef<any>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  // Initialize FaceDetector API if available
  useEffect(() => {
    if ("FaceDetector" in window) {
      try {
        detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        setHasFaceDetectorAPI(true);
      } catch {
        setHasFaceDetectorAPI(false);
      }
    }
  }, []);

  // Continuous face detection loop
  useEffect(() => {
    if (!cameraReady || !detectorRef.current || !videoRef.current) return;

    const detect = async () => {
      try {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const faces = await detectorRef.current.detect(videoRef.current);
        setFaceDetected(faces.length > 0);
      } catch {
        // Detection can fail on some frames, ignore
      }
    };

    detectionIntervalRef.current = window.setInterval(detect, 400);
    return () => {
      if (detectionIntervalRef.current) window.clearInterval(detectionIntervalRef.current);
    };
  }, [cameraReady]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
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
        // If no FaceDetector API, treat face as always detected
        if (!("FaceDetector" in window)) setFaceDetected(true);
      }
    } catch (err: any) {
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
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (detectionIntervalRef.current) window.clearInterval(detectionIntervalRef.current);
    };
  }, [startCamera]);

  const captureSnapshot = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve(null);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1); // Mirror
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  };

  const handleDirectionClick = async (dir: Direction) => {
    if (faceSteps[dir] || activeDirection) return;

    if (!faceDetected && hasFaceDetectorAPI) return; // Don't start if no face

    setActiveDirection(dir);
    setCountdown(3);

    let count = 3;
    const interval = setInterval(async () => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        // Capture snapshot
        const blob = await captureSnapshot();
        if (blob) setSnapshots((prev) => [...prev, blob]);
        setFaceSteps((prev) => ({ ...prev, [dir]: true }));
        setActiveDirection(null);
        setCountdown(null);
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const allDone = DIRECTIONS.every((d) => faceSteps[d]);

  const handleComplete = () => {
    // Stop camera
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onComplete(snapshots);
  };

  return (
    <div className="space-y-5">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera feed */}
      <div className="relative aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-muted border-2 border-border">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <VideoOff className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{cameraError}</p>
            <Button variant="secondary" size="sm" onClick={startCamera}>Retry</Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
                <Camera className="h-10 w-10 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Starting camera…</p>
              </div>
            )}
            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Face guide oval */}
                <div className={`absolute inset-[15%] rounded-full border-2 transition-colors duration-300 ${
                  faceDetected ? "border-primary/60" : "border-destructive/60"
                }`} />
                {/* Face detection indicator */}
                {hasFaceDetectorAPI && (
                  <div className={`absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                    faceDetected
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
                  }`}>
                    {faceDetected ? "Face detected ✓" : "No face detected"}
                  </div>
                )}
                {/* Countdown overlay */}
                {activeDirection && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                      <p className="text-sm font-semibold text-primary">{DIRECTION_LABELS[activeDirection]}</p>
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
            disabled={faceSteps[dir] || !!activeDirection || !cameraReady || (!faceDetected && hasFaceDetectorAPI)}
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
        {!cameraReady
          ? "Allow camera access to continue"
          : !faceDetected && hasFaceDetectorAPI
          ? "Position your face in the oval to begin"
          : "Tap each direction, then hold your face in that position"}
      </p>

      {!hasFaceDetectorAPI && cameraReady && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Face detection unavailable in this browser. Snapshots will still be captured.</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleComplete} disabled={!allDone} className="flex-1 glow-primary">
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
