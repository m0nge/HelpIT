import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetAssetByCode, getGetAssetByCodeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, Camera, CameraOff, Search, Box } from "lucide-react";

export default function AssetScan() {
  const [, setLocation] = useLocation();
  const [manualCode, setManualCode] = useState("");
  const [searchCode, setSearchCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: asset, isLoading, error } = useGetAssetByCode(searchCode!, {
    query: { queryKey: getGetAssetByCodeQueryKey(searchCode!), enabled: !!searchCode },
  });

  useEffect(() => {
    if (asset) setLocation(`/assets/${asset.id}`);
  }, [asset, setLocation]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setCameraError(null);
    } catch {
      setCameraError("Acceso a la cámara denegado. Usa la búsqueda manual.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => { stopCamera(); }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escáner de Activos</h1>
        <p className="text-muted-foreground">Escanea el código QR del equipo o búscalo manualmente.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Cámara</CardTitle>
          <CardDescription>Apunta la cámara al código QR o de barras del equipo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border">
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <QrCode className="h-16 w-16 opacity-20" />
                <p className="text-sm">Cámara inactiva</p>
              </div>
            )}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />
                </div>
              </div>
            )}
          </div>
          {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
          <Button className="w-full gap-2" variant={cameraActive ? "outline" : "default"} onClick={cameraActive ? stopCamera : startCamera}>
            {cameraActive ? <><CameraOff className="h-4 w-4" />Detener Cámara</> : <><Camera className="h-4 w-4" />Activar Cámara</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Búsqueda Manual</CardTitle>
          <CardDescription>Ingresa el código del activo directamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="ej. IT-2024-0042"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && manualCode.trim() && setSearchCode(manualCode.trim())}
              className="font-mono"
            />
            <Button onClick={() => manualCode.trim() && setSearchCode(manualCode.trim())} disabled={!manualCode.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {error && searchCode && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              No se encontró ningún activo con el código <span className="font-mono font-semibold">{searchCode}</span>.
            </div>
          )}
          {asset && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Box className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{asset.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{asset.type} · {asset.location || "Sin ubicación"}</p>
              </div>
              <Badge variant="outline" className="ml-auto font-mono text-xs shrink-0">{asset.code}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
