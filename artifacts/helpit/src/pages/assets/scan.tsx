import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetAssetByCode } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, Camera, CameraOff, Monitor, Search } from "lucide-react";

export default function AssetScan() {
  const [, setLocation] = useLocation();
  const [manualCode, setManualCode] = useState("");
  const [searchCode, setSearchCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: asset, isLoading, error } = useGetAssetByCode(searchCode!, {
    query: { enabled: !!searchCode },
  });

  useEffect(() => {
    if (asset) {
      setLocation(`/assets/${asset.id}`);
    }
  }, [asset, setLocation]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError(null);
    } catch {
      setCameraError("Camera access denied. Use manual code entry below.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      setSearchCode(manualCode.trim());
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Scanner</h1>
        <p className="text-muted-foreground">Scan a QR/barcode or enter the asset code manually.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Scanner
          </CardTitle>
          <CardDescription>Point your camera at the asset's QR code or barcode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <QrCode className="h-16 w-16 opacity-20" />
                <p className="text-sm">Camera inactive</p>
              </div>
            )}

            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-primary rounded-lg opacity-70">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-sm text-destructive">{cameraError}</p>
          )}

          <Button
            className="w-full gap-2"
            variant={cameraActive ? "outline" : "default"}
            onClick={cameraActive ? stopCamera : startCamera}
          >
            {cameraActive ? (
              <>
                <CameraOff className="h-4 w-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Start Camera
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Manual Code Entry
          </CardTitle>
          <CardDescription>Type the asset code to look it up directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. IT-2024-0042"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              className="font-mono"
              aria-label="Asset code"
            />
            <Button onClick={handleManualSearch} disabled={!manualCode.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {error && searchCode && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              No asset found with code <span className="font-mono font-semibold">{searchCode}</span>.
            </div>
          )}

          {asset && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Monitor className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{asset.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{asset.type} · {asset.location || "No location"}</p>
              </div>
              <Badge variant="outline" className="ml-auto font-mono text-xs">{asset.code}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
