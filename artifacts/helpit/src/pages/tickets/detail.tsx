import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetTicket, 
  useGetTicketComments, 
  useUpdateTicket, 
  useAddComment, 
  useRateTicket,
  useGetUsers,
  getGetTicketQueryKey,
  getGetTicketCommentsQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Send, CheckCircle2, Star, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const ticketId = parseInt(id, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isTech = user?.role === "technician" || user?.role === "admin";

  const { data: ticket, isLoading: ticketLoading } = useGetTicket(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketQueryKey(ticketId) }
  });

  const { data: comments, isLoading: commentsLoading } = useGetTicketComments(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketCommentsQueryKey(ticketId) }
  });

  const { data: users } = useGetUsers({
    query: { enabled: isTech }
  });

  const updateTicketMutation = useUpdateTicket();
  const addCommentMutation = useAddComment();
  const rateTicketMutation = useRateTicket();

  const [commentText, setCommentText] = useState("");
  const [rating, setRating] = useState(0);

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

  const handleResolve = () => {
    updateTicketMutation.mutate(
      { id: ticketId, data: { status: 'resolved' } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetTicketQueryKey(ticketId), data);
          toast({ title: "Ticket resolved" });
        }
      }
    );
  };

  const handleAssign = (userId: string) => {
    updateTicketMutation.mutate(
      { id: ticketId, data: { assignedToId: parseInt(userId, 10), status: 'in_progress' } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetTicketQueryKey(ticketId), data);
          toast({ title: "Ticket assigned" });
        }
      }
    );
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(
      { id: ticketId, data: { content: commentText } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTicketCommentsQueryKey(ticketId) });
          setCommentText("");
        }
      }
    );
  };

  const handleRate = (stars: number) => {
    rateTicketMutation.mutate(
      { id: ticketId, data: { stars } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });
          toast({ title: "Feedback submitted" });
          setRating(stars);
        }
      }
    );
  };

  if (ticketLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!ticket) return <div>Ticket not found</div>;

  const canRate = ticket.status === 'resolved' && user?.id === ticket.createdById && !ticket.rating;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Ticket #{ticket.id}
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{ticket.title}</CardTitle>
              <CardDescription>Created by {ticket.createdBy?.name || 'Unknown'} on {new Date(ticket.createdAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : comments?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No comments yet.</p>
              ) : (
                <div className="space-y-4">
                  {comments?.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={comment.user?.role === 'technician' ? 'bg-primary/20 text-primary' : ''}>
                          {comment.user?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{comment.user?.name}</p>
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-sm bg-muted/30 p-3 rounded-md">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex gap-2">
                <Textarea 
                  placeholder="Type a message..." 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button 
                  className="self-end" 
                  size="icon"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  onClick={handleComment}
                >
                  {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="capitalize">{ticket.category}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                {isTech ? (
                  <Select 
                    value={ticket.assignedToId?.toString() || "unassigned"} 
                    onValueChange={handleAssign}
                    disabled={updateTicketMutation.isPending}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Assign technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users?.filter(u => u.role !== 'user').map(tech => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{ticket.assignedTo?.name || 'Unassigned'}</p>
                )}
              </div>

              {ticket.status !== 'resolved' && ticket.status !== 'closed' && isTech && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={handleResolve}
                    disabled={updateTicketMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Resolved
                  </Button>
                </div>
              )}

              {canRate && (
                <div className="pt-4 border-t space-y-3">
                  <p className="font-medium">Rate your experience</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Button
                        key={s}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-400 hover:text-amber-500"
                        onClick={() => handleRate(s)}
                      >
                        <Star className={rating >= s ? "fill-current" : ""} />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {ticket.rating && (
                <div className="pt-4 border-t space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <div className="flex gap-1 text-amber-400">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${ticket.rating! >= s ? "fill-current" : "text-muted"}`} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
