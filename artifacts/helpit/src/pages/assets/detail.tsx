import { useParams, Link } from "wouter";
import { useGetAsset, useGetTickets, getGetAssetQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Monitor, Laptop, Printer, Server, Tv, Box, MapPin, Hash, FileText } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pc: <Monitor className="h-5 w-5" />,
  laptop: <Laptop className="h-5 w-5" />,
  printer: <Printer className="h-5 w-5" />,
  server: <Server className="h-5 w-5" />,
  monitor: <Tv className="h-5 w-5" />,
  other: <Box className="h-5 w-5" />,
};

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const assetId = parseInt(id, 10);

  const { data: asset, isLoading } = useGetAsset(assetId, {
    query: { enabled: !!assetId, queryKey: getGetAssetQueryKey(assetId) },
  });

  const { data: relatedTickets } = useGetTickets({ } as any);
  const assetTickets = relatedTickets?.filter((t) => t.assetId === assetId);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium">Asset not found</p>
        <Link href="/assets"><Button variant="outline" className="mt-4">Back to Inventory</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {TYPE_ICONS[asset.type]}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
            <p className="text-muted-foreground capitalize">{asset.type}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Asset Code
                  </p>
                  <Badge variant="outline" className="font-mono text-sm">{asset.code}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{asset.type}</p>
                </div>
                {asset.location && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Location
                    </p>
                    <p className="font-medium">{asset.location}</p>
                  </div>
                )}
                {asset.serialNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Serial Number</p>
                    <p className="font-mono text-sm">{asset.serialNumber}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p className="font-medium">{new Date(asset.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {asset.notes && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Notes
                  </p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{asset.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ticket History</CardTitle>
              <CardDescription>Support tickets associated with this asset.</CardDescription>
            </CardHeader>
            <CardContent>
              {!assetTickets?.length ? (
                <p className="text-muted-foreground text-sm">No tickets recorded for this asset.</p>
              ) : (
                <div className="space-y-3">
                  {assetTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                      <div>
                        <p className="font-medium text-sm">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">#{ticket.id} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/tickets/new`}>
                <Button className="w-full" variant="outline">
                  Create Ticket for Asset
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
