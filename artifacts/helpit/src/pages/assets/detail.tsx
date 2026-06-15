import { useParams, Link } from "wouter";
import { useGetAsset, getGetAssetQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Monitor, Laptop, Printer, Server, Tv, Box, MapPin, Hash, FileText, Plus } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pc: <Monitor className="h-5 w-5" />, laptop: <Laptop className="h-5 w-5" />,
  printer: <Printer className="h-5 w-5" />, server: <Server className="h-5 w-5" />,
  monitor: <Tv className="h-5 w-5" />, other: <Box className="h-5 w-5" />,
};

const TYPE_LABELS: Record<string, string> = {
  pc: "PC", laptop: "Laptop", printer: "Impresora",
  server: "Servidor", monitor: "Monitor", other: "Otro",
};

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const assetId = parseInt(id, 10);

  const { data: asset, isLoading } = useGetAsset(assetId, {
    query: { enabled: !!assetId, queryKey: getGetAssetQueryKey(assetId) },
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!asset) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium">Activo no encontrado</p>
        <Link href="/assets"><Button variant="outline" className="mt-4">Volver al Inventario</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {TYPE_ICONS[asset.type]}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
            <p className="text-muted-foreground">{TYPE_LABELS[asset.type] || asset.type}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Activo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />Código</p>
                  <Badge variant="outline" className="font-mono text-sm">{asset.code}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{TYPE_LABELS[asset.type] || asset.type}</p>
                </div>
                {asset.location && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Ubicación</p>
                    <p className="font-medium">{asset.location}</p>
                  </div>
                )}
                {asset.serialNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Número de Serie</p>
                    <p className="font-mono text-sm">{asset.serialNumber}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Registrado</p>
                  <p className="font-medium">{new Date(asset.createdAt).toLocaleDateString("es-MX")}</p>
                </div>
              </div>
              {asset.notes && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Notas</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{asset.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/tickets/new">
                <Button className="w-full gap-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  Crear Ticket para este Activo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
