import { useAuth } from "@/lib/auth";
import {
  useGetTicketStats, getGetTicketStatsQueryKey,
  useGetTickets, getGetTicketsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, Ticket as TicketIcon, Plus, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGES: Record<string, React.ReactNode> = {
  open: <Badge variant="outline" className="text-blue-500 border-blue-500/20">Abierto</Badge>,
  in_progress: <Badge variant="outline" className="text-amber-500 border-amber-500/20">En Progreso</Badge>,
  resolved: <Badge variant="outline" className="text-green-500 border-green-500/20">Resuelto</Badge>,
  closed: <Badge variant="outline" className="text-gray-500 border-gray-500/20">Cerrado</Badge>,
};

const PRIORITY_BADGES: Record<string, React.ReactNode> = {
  low: <Badge variant="secondary">Baja</Badge>,
  medium: <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Media</Badge>,
  high: <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Alta</Badge>,
  critical: <Badge variant="destructive">Crítica</Badge>,
};

export default function Dashboard() {
  const { user } = useAuth();
  const isTech = user?.role === "technician" || user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetTicketStats({
    query: { queryKey: getGetTicketStatsQueryKey(), enabled: isTech },
  });

  const { data: recentTickets, isLoading: recentLoading } = useGetTickets(
    { limit: 8 },
    { query: { queryKey: getGetTicketsQueryKey({ limit: 8 }), enabled: isTech } }
  );

  const { data: userTickets, isLoading: ticketsLoading } = useGetTickets(
    {},
    { query: { queryKey: getGetTicketsQueryKey(), enabled: !isTech } }
  );

  if (!isTech) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis Tickets</h1>
            <p className="text-muted-foreground">Sigue el estado de tus solicitudes de soporte.</p>
          </div>
          <Link href="/tickets/new">
            <Button className="gap-2"><Plus className="h-4 w-4" />Crear Ticket</Button>
          </Link>
        </div>

        {ticketsLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando tus tickets...</div>
        ) : userTickets?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary mb-3 opacity-50" />
              <h3 className="text-lg font-semibold">Sin problemas activos</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Si necesitas ayuda, crea un ticket.</p>
              <Link href="/tickets/new"><Button>Crear Ticket</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {userTickets?.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ticket.title}</span>
                      <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {STATUS_BADGES[ticket.status]}
                    {PRIORITY_BADGES[ticket.priority]}
                    <Link href={`/tickets/${ticket.id}`}><Button variant="secondary" size="sm">Ver</Button></Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (statsLoading) return <div className="p-8 text-center text-muted-foreground">Cargando estadísticas...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground">Resumen en tiempo real del estado del sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
            <TicketIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.open ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Esperando atención</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.inProgress ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Siendo atendidos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-500">Críticos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats?.critical ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención urgente</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats?.resolved ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tiempo prom: {stats?.avgResolutionHours ? `${stats.avgResolutionHours.toFixed(1)}h` : "N/D"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />Tickets Recientes
          </h2>
          <Link href="/tickets"><Button variant="outline" size="sm">Ver Todos</Button></Link>
        </div>

        {recentLoading ? (
          <div className="text-center p-6 text-muted-foreground text-sm">Cargando...</div>
        ) : recentTickets?.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8 text-muted-foreground text-sm">
              No hay tickets aún.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {recentTickets?.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden hover:bg-muted/30 transition-colors">
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="flex items-center gap-4 p-4 cursor-pointer">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{ticket.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">#{ticket.id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reportado por <span className="font-medium">{ticket.createdBy?.name ?? "?"}</span>
                        {" · "}
                        {new Date(ticket.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {PRIORITY_BADGES[ticket.priority]}
                      {STATUS_BADGES[ticket.status]}
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
