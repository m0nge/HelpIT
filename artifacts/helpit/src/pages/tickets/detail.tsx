import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetTicket, useGetTicketComments, useUpdateTicket,
  useAddComment, useRateTicket, useGetUsers,
  useGetTicketAttachments,
  getGetTicketQueryKey, getGetTicketCommentsQueryKey,
  getGetTicketAttachmentsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send, CheckCircle2, Star, ArrowLeft, UserCheck, Phone, Mail, Paperclip, ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  hardware: "Hardware", software: "Software", network: "Red", access: "Acceso/Permisos",
};

function UploadZone({ ticketId, onUploaded }: { ticketId: number; onUploaded: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Tipo no permitido", description: "Solo se aceptan imágenes y PDF." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Archivo muy grande", description: "El tamaño máximo es 10 MB." });
      return;
    }

    const token = localStorage.getItem("helpit_token");
    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      onUploaded();
      toast({ title: "Evidencia subida correctamente" });
    } catch {
      toast({ variant: "destructive", title: "Error al subir el archivo" });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); Array.from(e.dataTransfer.files).forEach(uploadFile); }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => Array.from(e.target.files || []).forEach(uploadFile)}
      />
      {isUploading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Subiendo...</span>
        </div>
      ) : (
        <>
          <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-medium">Arrastra fotos aquí o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, PDF · Máximo 10 MB</p>
        </>
      )}
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const ticketId = parseInt(id, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isTech = user?.role === "technician" || user?.role === "admin";

  const { data: ticket, isLoading: ticketLoading } = useGetTicket(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketQueryKey(ticketId) },
  });

  const { data: comments, isLoading: commentsLoading } = useGetTicketComments(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketCommentsQueryKey(ticketId) },
  });

  const { data: attachments, refetch: refetchAttachments } = useGetTicketAttachments(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketAttachmentsQueryKey(ticketId) },
  });

  const updateTicketMutation = useUpdateTicket();
  const addCommentMutation = useAddComment();
  const rateTicketMutation = useRateTicket();

  const [commentText, setCommentText] = useState("");
  const [rating, setRating] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const invalidateTicket = () => queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });

  const handleTakeTicket = () => {
    updateTicketMutation.mutate(
      { id: ticketId, data: { assignedToId: user!.id, status: "in_progress" } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetTicketQueryKey(ticketId), data);
          toast({ title: "Ticket tomado", description: "Ahora estás a cargo de este ticket." });
        },
      }
    );
  };

  const handleUnassign = () => {
    updateTicketMutation.mutate(
      { id: ticketId, data: { assignedToId: null, status: "open" } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetTicketQueryKey(ticketId), data);
          toast({ title: "Ticket liberado" });
        },
      }
    );
  };

  const handleResolve = () => {
    updateTicketMutation.mutate(
      { id: ticketId, data: { status: "resolved" } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetTicketQueryKey(ticketId), data);
          toast({ title: "Ticket marcado como resuelto" });
        },
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
        },
      }
    );
  };

  const handleRate = (stars: number) => {
    rateTicketMutation.mutate(
      { id: ticketId, data: { stars } },
      {
        onSuccess: () => {
          invalidateTicket();
          toast({ title: "¡Gracias por tu valoración!" });
          setRating(stars);
        },
      }
    );
  };

  if (ticketLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Ticket no encontrado</div>;

  const canRate = ticket.status === "resolved" && user?.id === ticket.createdById && !ticket.rating;
  const isAssignedToMe = ticket.assignedToId === user?.id;
  const isUnassigned = !ticket.assignedToId;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex flex-wrap items-center gap-2">
            Ticket #{ticket.id}
            {STATUS_BADGES[ticket.status]}
            {PRIORITY_BADGES[ticket.priority]}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Descripción */}
          <Card>
            <CardHeader>
              <CardTitle>{ticket.title}</CardTitle>
              <CardDescription>
                Creado el {new Date(ticket.createdAt).toLocaleString("es-MX")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-md text-sm leading-relaxed">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          {/* Evidencia fotográfica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Evidencia Fotográfica
              </CardTitle>
              <CardDescription>Fotos e imágenes adjuntas al ticket.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attachments && attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((att) => (
                    <div key={att.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer" onClick={() => setSelectedImage(att.url)}>
                      {att.mimetype.startsWith("image/") ? (
                        <img src={att.url} alt={att.originalName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                          <Paperclip className="h-8 w-8" />
                          <span className="text-xs text-center px-2 truncate w-full">{att.originalName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {ticket.status !== "closed" && (
                <UploadZone ticketId={ticketId} onUploaded={() => queryClient.invalidateQueries({ queryKey: getGetTicketAttachmentsQueryKey(ticketId) })} />
              )}
              {(!attachments || attachments.length === 0) && ticket.status === "closed" && (
                <p className="text-sm text-muted-foreground">No hay evidencia adjunta.</p>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comunicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : comments?.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin comentarios aún.</p>
              ) : (
                <div className="space-y-4">
                  {comments?.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={comment.user?.role !== "user" ? "bg-primary/20 text-primary text-xs" : "text-xs"}>
                          {comment.user?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {comment.user?.name}
                            {comment.user?.role !== "user" && (
                              <span className="ml-1.5 text-xs text-primary font-normal">· Técnico</span>
                            )}
                          </p>
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString("es-MX")}</span>
                        </div>
                        <div className="text-sm bg-muted/30 p-3 rounded-md">{comment.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {ticket.status !== "closed" && (
              <CardFooter>
                <div className="w-full flex gap-2">
                  <Textarea
                    placeholder="Escribe un mensaje..."
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
            )}
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          {/* Acción principal del técnico */}
          {isTech && ticket.status !== "resolved" && ticket.status !== "closed" && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acción del Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isUnassigned && (
                  <Button
                    className="w-full gap-2 bg-primary"
                    onClick={handleTakeTicket}
                    disabled={updateTicketMutation.isPending}
                  >
                    <UserCheck className="h-4 w-4" />
                    Tomar este Ticket
                  </Button>
                )}
                {isAssignedToMe && (
                  <>
                    <div className="text-sm text-green-500 font-medium flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" />
                      Estás a cargo de este ticket
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 gap-2"
                      onClick={handleResolve}
                      disabled={updateTicketMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como Resuelto
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={handleUnassign}
                      disabled={updateTicketMutation.isPending}
                    >
                      Liberar Ticket
                    </Button>
                  </>
                )}
                {!isUnassigned && !isAssignedToMe && ticket.assignedTo && (
                  <div className="text-sm text-muted-foreground">
                    <p>Asignado a: <span className="font-medium text-foreground">{ticket.assignedTo.name}</span></p>
                    <Button
                      className="w-full mt-3 gap-2"
                      onClick={handleTakeTicket}
                      disabled={updateTicketMutation.isPending}
                      variant="outline"
                    >
                      <UserCheck className="h-4 w-4" />
                      Tomar de todas formas
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reportado por (contacto) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Reportado por
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {ticket.createdBy?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-medium text-sm">{ticket.createdBy?.name || "Desconocido"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ticket.createdBy?.role === "user" ? "Usuario" : ticket.createdBy?.role}</p>
                </div>
              </div>
              {ticket.createdBy?.email && (
                <a
                  href={`mailto:${ticket.createdBy.email}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline underline-offset-4"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {ticket.createdBy.email}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Detalles del ticket */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Categoría</p>
                <p className="text-sm">{CATEGORY_LABELS[ticket.category] || ticket.category}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Técnico Asignado</p>
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <UserCheck className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-medium">{ticket.assignedTo.name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin asignar</p>
                )}
              </div>

              {ticket.asset && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Activo relacionado</p>
                  <Link href={`/assets/${ticket.asset.id}`}>
                    <span className="text-sm text-primary hover:underline">{ticket.asset.name}</span>
                  </Link>
                </div>
              )}

              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resuelto</p>
                  <p className="text-sm">{new Date(ticket.resolvedAt).toLocaleString("es-MX")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Valoración */}
          {canRate && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Valorar el Soporte</CardTitle>
                <CardDescription>¿Quedaste satisfecho con la solución?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Button
                      key={s}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-amber-400 hover:text-amber-500"
                      onClick={() => handleRate(s)}
                      disabled={rateTicketMutation.isPending}
                    >
                      <Star className={`h-6 w-6 ${rating >= s ? "fill-current" : ""}`} />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ticket.rating && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Valoración recibida</p>
                <div className="flex gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-5 w-5 ${ticket.rating! >= s ? "fill-current" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de imagen */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img src={selectedImage} alt="Evidencia" className="max-w-full max-h-[80vh] rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
