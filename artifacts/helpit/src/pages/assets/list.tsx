import { useState } from "react";
import { Link } from "wouter";
import { useGetAssets, getGetAssetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Monitor, Printer, Server, Laptop, Tv, Box, QrCode } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pc: <Monitor className="h-4 w-4" />,
  laptop: <Laptop className="h-4 w-4" />,
  printer: <Printer className="h-4 w-4" />,
  server: <Server className="h-4 w-4" />,
  monitor: <Tv className="h-4 w-4" />,
  other: <Box className="h-4 w-4" />,
};

export default function AssetsList() {
  const [typeFilter, setTypeFilter] = useState("all");
  const params = typeFilter !== "all" ? { type: typeFilter } : undefined;
  const { data: assets, isLoading } = useGetAssets(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Inventory</h1>
          <p className="text-muted-foreground">Manage and track IT equipment.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets/scan">
            <Button variant="outline" className="gap-2">
              <QrCode className="h-4 w-4" />
              Scan Code
            </Button>
          </Link>
          <Link href="/assets/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pc">PC</SelectItem>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="printer">Printer</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="monitor">Monitor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : assets?.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No assets found</p>
              <p className="text-sm mt-1">Add your first asset to the inventory.</p>
            </div>
          ) : (
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets?.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="text-muted-foreground font-medium">#{asset.id}</TableCell>
                    <TableCell className="font-semibold">{asset.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 capitalize">
                        <span className="text-muted-foreground">{TYPE_ICONS[asset.type]}</span>
                        {asset.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {asset.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{asset.location || "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{asset.serialNumber || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/assets/${asset.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
