import { useAuth } from "@/lib/auth";
import { useGetTicketStats, useGetTickets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, Ticket as TicketIcon, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const isTech = user?.role === "technician" || user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetTicketStats({
    query: {
      enabled: isTech,
    }
  });

  const { data: userTickets, isLoading: ticketsLoading } = useGetTickets(
    { assignedTo: user?.id },
    { query: { enabled: !isTech } }
  );

  if (isTech) {
    if (statsLoading) return <div className="p-8">Loading stats...</div>;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground">Overview of system health and active tickets.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Open</CardTitle>
              <TicketIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.open || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 bg-red-500/5 dark:bg-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Critical Priority</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats?.critical || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg time: {stats?.avgResolutionHours ? `${stats.avgResolutionHours.toFixed(1)}h` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
            <Link href="/tickets">
              <Button variant="outline" size="sm">View All Tickets</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="text-center p-8 text-muted-foreground">
                Navigate to Tickets to see the full queue.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User Dashboard
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-muted-foreground">Track your reported issues and requests.</p>
        </div>
        <Link href="/tickets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Ticket
          </Button>
        </Link>
      </div>

      {ticketsLoading ? (
        <div className="p-8 text-center">Loading your tickets...</div>
      ) : userTickets?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No active issues</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
              You haven't reported any issues. If you need help, create a new ticket.
            </p>
            <Link href="/tickets/new">
              <Button>Create Ticket</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {userTickets?.map(ticket => (
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
                  <div className="text-sm">
                    {ticket.status === 'open' && <span className="text-blue-500 font-medium">Open</span>}
                    {ticket.status === 'in_progress' && <span className="text-amber-500 font-medium">In Progress</span>}
                    {ticket.status === 'resolved' && <span className="text-green-500 font-medium">Resolved</span>}
                    {ticket.status === 'closed' && <span className="text-gray-500 font-medium">Closed</span>}
                  </div>
                  <Link href={`/tickets/${ticket.id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
