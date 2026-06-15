import { useState } from "react";
import { Link } from "wouter";
import { useGetAssets } from "@workspace/api-client-react";
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

const TYPE_LABELS: Record<string, string> = {
  pc: "PC", laptop: "Laptop", printer: "Impresora",
  server: "Servidor", monitor: "Monitor", other: "Otro",
};

export default function AssetsList() {
  const [typeFilter, setTypeFilter] = useState("all");
  const params = typeFilter !== "all" ? { type: typeFilter } : undefined;
  const { data: assets, isLoading } = useGetAssets(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario de Activos</h1>
          <p className="text-muted-foreground">Gestiona y rastrea el equipo de TI.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets/scan">
            <Button variant="outline" className="gap-2">
              <QrCode className="h-4 w-4" />Escanear
            </Button>
          </Link>
          <Link href="/assets/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />Registrar Activo
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="pc">PC</SelectItem>
              <SelectItem value="laptop">Laptop</SelectItem>
              <SelectItem value="printer">Impresora</SelectItem>
              <SelectItem value="server">Servidor</SelectItem>
              <SelectItem value="monitor">Monitor</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : assets?.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Sin activos registrados</p>
              <p className="text-sm mt-1">Registra tu primer equipo en el inventario.</p>
            </div>
          ) : (
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Serie</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets?.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="text-muted-foreground font-medium">#{asset.id}</TableCell>
                    <TableCell className="font-semibold">{asset.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{TYPE_ICONS[asset.type]}</span>
                        <span className="text-sm">{TYPE_LABELS[asset.type] || asset.type}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{asset.code}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{asset.location || "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{asset.serialNumber || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/assets/${asset.id}`}><Button variant="ghost" size="sm">Ver</Button></Link>
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
