import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetTickets, Ticket, TicketStatus, TicketPriority, TicketCategory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, FilterX } from "lucide-react";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function TicketsList() {
  const { user } = useAuth();
  const isTech = user?.role === "technician" || user?.role === "admin";
  
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  
  const queryParams: any = {};
  if (status !== "all") queryParams.status = status;
  if (priority !== "all") queryParams.priority = priority;
  if (category !== "all") queryParams.category = category;
  if (!isTech) queryParams.assignedTo = user?.id; // If not tech, we only fetch their tickets? Actually the API should handle this, but let's be safe. The prompt says "user: shows their own tickets list" on dashboard. On /tickets, maybe also only their own.
  
  const { data: tickets, isLoading } = useGetTickets(queryParams);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'low': return <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">Low</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Medium</Badge>;
      case 'high': return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">High</Badge>;
      case 'critical': return <Badge variant="destructive" className="animate-pulse-fast">Critical</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open': return <Badge variant="outline" className="text-blue-500 border-blue-500/20">Open</Badge>;
      case 'in_progress': return <Badge variant="outline" className="text-amber-500 border-amber-500/20">In Progress</Badge>;
      case 'resolved': return <Badge variant="outline" className="text-green-500 border-green-500/20">Resolved</Badge>;
      case 'closed': return <Badge variant="outline" className="text-gray-500 border-gray-500/20">Closed</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Manage and track support requests.</p>
        </div>
        <Link href="/tickets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Ticket
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 flex-wrap">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                </SelectContent>
              </Select>

              {(status !== 'all' || priority !== 'all' || category !== 'all') && (
                <Button variant="ghost" size="icon" onClick={() => { setStatus('all'); setPriority('all'); setCategory('all'); }}>
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tickets?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No tickets found matching your criteria.
            </div>
          ) : (
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets?.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium text-muted-foreground">#{ticket.id}</TableCell>
                    <TableCell className="font-semibold">{ticket.title}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="capitalize">{ticket.category}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/tickets/${ticket.id}`}>
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
