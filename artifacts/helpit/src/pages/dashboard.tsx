import { useAuth } from "@/lib/auth";
import { useGetTicketStats, getGetTicketStatsQueryKey, useGetTickets, getGetTicketsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, Ticket as TicketIcon, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Abierto", className: "text-blue-500" },
  in_progress: { label: "En Progreso", className: "text-amber-500" },
  resolved: { label: "Resuelto", className: "text-green-500" },
  closed: { label: "Cerrado", className: "text-gray-500" },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja", medium: "Media", high: "Alta", critical: "Crítica",
};

export default function Dashboard() {
  const { user } = useAuth();
  const isTech = user?.role === "technician" || user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetTicketStats({
    query: { queryKey: getGetTicketStatsQueryKey(), enabled: isTech },
  });

  const { data: userTickets, isLoading: ticketsLoading } = useGetTickets(
    {},
    { query: { queryKey: getGetTicketsQueryKey(), enabled: !isTech } }
  );

  if (isTech) {
    if (statsLoading) return <div className="p-8 text-center text-muted-foreground">Cargando estadísticas...</div>;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground">Resumen del estado del sistema y tickets activos.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Abiertos</CardTitle>
              <TicketIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.open || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 bg-red-500/5 dark:bg-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Prioridad Crítica</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.critical || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tiempo promedio: {stats?.avgResolutionHours ? `${stats.avgResolutionHours.toFixed(1)}h` : "N/D"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Actividad Reciente</h2>
            <Link href="/tickets">
              <Button variant="outline" size="sm">Ver Todos los Tickets</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="text-center p-8 text-muted-foreground text-sm">
                Ve a la sección de Tickets para ver la cola completa.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Panel de usuario normal
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Tickets</h1>
          <p className="text-muted-foreground">Sigue el estado de tus solicitudes de soporte.</p>
        </div>
        <Link href="/tickets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Crear Ticket
          </Button>
        </Link>
      </div>

      {ticketsLoading ? (
        <div className="p-8 text-center text-muted-foreground">Cargando tus tickets...</div>
      ) : userTickets?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Sin problemas activos</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
              No has reportado ningún problema. Si necesitas ayuda, crea un ticket.
            </p>
            <Link href="/tickets/new"><Button>Crear Ticket</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {userTickets?.map((ticket) => {
            const st = STATUS_LABELS[ticket.status] || { label: ticket.status, className: "" };
            return (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{ticket.title}</span>
                      <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${st.className}`}>{st.label}</span>
                    <Badge variant="outline" className="capitalize">
                      {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    </Badge>
                    <Link href={`/tickets/${ticket.id}`}>
                      <Button variant="secondary" size="sm">Ver</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
