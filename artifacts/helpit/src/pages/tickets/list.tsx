import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetTickets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, FilterX, UserCheck } from "lucide-react";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_BADGES: Record<string, React.ReactNode> = {
  open: <Badge variant="outline" className="text-blue-500 border-blue-500/20">Abierto</Badge>,
  in_progress: <Badge variant="outline" className="text-amber-500 border-amber-500/20">En Progreso</Badge>,
  resolved: <Badge variant="outline" className="text-green-500 border-green-500/20">Resuelto</Badge>,
  closed: <Badge variant="outline" className="text-gray-500 border-gray-500/20">Cerrado</Badge>,
};

const PRIORITY_BADGES: Record<string, React.ReactNode> = {
  low: <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">Baja</Badge>,
  medium: <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Media</Badge>,
  high: <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Alta</Badge>,
  critical: <Badge variant="destructive">Crítica</Badge>,
};

const CATEGORY_LABELS: Record<string, string> = {
  hardware: "Hardware", software: "Software", network: "Red", access: "Acceso",
};

export default function TicketsList() {
  const { user } = useAuth();
  const isUserRole = user?.role === "user";

  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const queryParams: any = {};
  if (status !== "all") queryParams.status = status;
  if (priority !== "all") queryParams.priority = priority;
  if (category !== "all") queryParams.category = category;

  const { data: tickets, isLoading } = useGetTickets(queryParams);
  const hasFilters = status !== "all" || priority !== "all" || category !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            {isUserRole ? "Gestiona tus solicitudes de soporte." : "Gestiona y da seguimiento a todos los tickets."}
          </p>
        </div>
        {isUserRole && (
          <Link href="/tickets/new">
            <Button className="gap-2"><Plus className="h-4 w-4" />Crear Ticket</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="network">Red</SelectItem>
                <SelectItem value="access">Acceso</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={() => { setStatus("all"); setPriority("all"); setCategory("all"); }}>
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : tickets?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No se encontraron tickets.</div>
          ) : (
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets?.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium text-muted-foreground">#{ticket.id}</TableCell>
                    <TableCell className="font-semibold max-w-[200px] truncate">{ticket.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ticket.createdBy?.name || "—"}</TableCell>
                    <TableCell>{STATUS_BADGES[ticket.status]}</TableCell>
                    <TableCell>{PRIORITY_BADGES[ticket.priority]}</TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[ticket.category] || ticket.category}</TableCell>
                    <TableCell>
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-1 text-sm">
                          <UserCheck className="h-3.5 w-3.5 text-green-500" />
                          {ticket.assignedTo.name}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(ticket.createdAt).toLocaleDateString("es-MX")}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/tickets/${ticket.id}`}><Button variant="ghost" size="sm">Ver</Button></Link>
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
