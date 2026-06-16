import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  useGetTicket, useGetTicketComments, useUpdateTicket,
  useAddComment, useRateTicket, useGetTicketAttachments,
  getGetTicketQueryKey, getGetTicketCommentsQueryKey,
  getGetTicketAttachmentsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Send, CheckCircle2, Star, ArrowLeft,
  UserCheck, Phone, Mail, Paperclip, Mic, MicOff,
  Image as ImageIcon, StopCircle, X, FileAudio,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

type ChatItem =
  | { kind: "comment"; id: number; content: string; createdAt: string; user: { id: number; name: string; role: string } | null }
  | { kind: "attachment"; id: number; url: string; originalName: string; mimetype: string; createdAt: string; uploadedBy: { id: number; name: string; role: string } | null };

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-MX", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function roleLabel(role: string) {
  if (role === "technician" || role === "admin") return "Técnico";
  return null;
}

function ChatMessage({ item, isMe }: { item: ChatItem; isMe: boolean }) {
  const [lightbox, setLightbox] = useState(false);
  const sender = item.kind === "comment" ? item.user : item.uploadedBy;
  const name = sender?.name ?? "?";
  const role = sender?.role ?? "user";

  return (
    <div className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback className={cn(
          "text-xs font-semibold",
          role !== "user" ? "bg-primary/20 text-primary" : "bg-muted-foreground/20"
        )}>
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex flex-col gap-1 max-w-[70%]", isMe ? "items-end" : "items-start")}>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs font-medium", isMe ? "order-last" : "")}>{name}</span>
          {roleLabel(role) && (
            <span className="text-xs text-primary font-semibold">· {roleLabel(role)}</span>
          )}
        </div>

        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm break-words",
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm",
          (item.kind === "attachment" && item.mimetype.startsWith("image/")) ? "p-1 bg-transparent" : ""
        )}>
          {item.kind === "comment" && (
            <p className="whitespace-pre-wrap">{item.content}</p>
          )}
          {item.kind === "attachment" && item.mimetype.startsWith("image/") && (
            <>
              <img
                src={item.url}
                alt={item.originalName}
                className="max-w-full max-h-64 rounded-xl cursor-pointer object-cover"
                onClick={() => setLightbox(true)}
              />
              {lightbox && (
                <div
                  className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                  onClick={() => setLightbox(false)}
                >
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="absolute -top-12 right-0 text-white" onClick={() => setLightbox(false)}>
                      <X className="h-6 w-6" />
                    </Button>
                    <img src={item.url} alt={item.originalName} className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain" />
                  </div>
                </div>
              )}
            </>
          )}
          {item.kind === "attachment" && item.mimetype.startsWith("audio/") && (
            <div className="flex items-center gap-2 py-1">
              <FileAudio className="h-4 w-4 shrink-0" />
              <audio controls className="max-w-[220px] h-8" src={item.url} />
            </div>
          )}
          {item.kind === "attachment" && !item.mimetype.startsWith("image/") && !item.mimetype.startsWith("audio/") && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline underline-offset-2">
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="text-sm truncate max-w-[180px]">{item.originalName}</span>
            </a>
          )}
        </div>

        <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
      </div>
    </div>
  );
}

function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("No se pudo acceder al micrófono.");
    }
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRef.current) { resolve(new Blob()); return; }
      mediaRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRef.current?.mimeType || "audio/webm" });
        mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        setSeconds(0);
        resolve(blob);
      };
      mediaRef.current.stop();
    });
  }, []);

  return { recording, seconds, start, stop };
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

  const { data: comments } = useGetTicketComments(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketCommentsQueryKey(ticketId) },
  });

  const { data: attachments } = useGetTicketAttachments(ticketId, {
    query: { enabled: !!ticketId, queryKey: getGetTicketAttachmentsQueryKey(ticketId) },
  });

  const updateTicketMutation = useUpdateTicket();
  const addCommentMutation = useAddComment();
  const rateTicketMutation = useRateTicket();

  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [sendingFile, setSendingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { recording, seconds, start: startRecording, stop: stopRecording } = useAudioRecorder();

  const chatItems: ChatItem[] = [
    ...(comments ?? []).map((c): ChatItem => ({
      kind: "comment", id: c.id, content: c.content,
      createdAt: c.createdAt, user: c.user as any,
    })),
    ...(attachments ?? []).map((a): ChatItem => ({
      kind: "attachment", id: a.id, url: a.url,
      originalName: a.originalName, mimetype: a.mimetype,
      createdAt: a.createdAt, uploadedBy: (a as any).uploadedBy ?? null,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems.length]);

  const invalidateChat = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetTicketCommentsQueryKey(ticketId) });
    queryClient.invalidateQueries({ queryKey: getGetTicketAttachmentsQueryKey(ticketId) });
  }, [queryClient, ticketId]);

  async function uploadFile(file: File | Blob, name = "audio.webm") {
    const token = localStorage.getItem("helpit_token");
    const fd = new FormData();
    fd.append("file", file, file instanceof File ? file.name : name);
    setSendingFile(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      invalidateChat();
    } catch {
      toast({ variant: "destructive", title: "Error al enviar el archivo" });
    } finally {
      setSendingFile(false);
    }
  }

  const handleSendMessage = () => {
    if (!message.trim()) return;
    addCommentMutation.mutate(
      { id: ticketId, data: { content: message } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTicketCommentsQueryKey(ticketId) });
          setMessage("");
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob.size > 0) await uploadFile(blob, `audio-${Date.now()}.webm`);
  };

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
      { onSuccess: (data) => { queryClient.setQueryData(getGetTicketQueryKey(ticketId), data); } }
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

  if (ticketLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Ticket no encontrado</div>;

  const canRate = ticket.status === "resolved" && user?.id === ticket.createdById && !ticket.rating;
  const isAssignedToMe = ticket.assignedToId === user?.id;
  const isUnassigned = !ticket.assignedToId;
  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
        {/* Chat principal */}
        <div className="md:col-span-2 flex flex-col">
          <Card className="flex flex-col flex-1">
            <CardHeader className="pb-3 border-b">
              <div>
                <CardTitle className="text-lg">{ticket.title}</CardTitle>
                <CardDescription className="mt-1">{CATEGORY_LABELS[ticket.category] || ticket.category}</CardDescription>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.description}
              </div>
            </CardHeader>

            {/* Área de mensajes */}
            <CardContent className="flex-1 overflow-y-auto min-h-[320px] max-h-[480px] py-4 space-y-4">
              {chatItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 py-8">
                  <div className="text-4xl">💬</div>
                  <p className="text-sm">Sin mensajes aún. ¡Sé el primero en escribir!</p>
                </div>
              ) : (
                chatItems.map((item) => {
                  const senderId = item.kind === "comment" ? item.user?.id : item.uploadedBy?.id;
                  const isMe = senderId === user?.id;
                  return <ChatMessage key={`${item.kind}-${item.id}`} item={item} isMe={isMe} />;
                })
              )}
              <div ref={chatEndRef} />
            </CardContent>

            {/* Input área */}
            {!isClosed ? (
              <CardFooter className="border-t pt-4 pb-4 flex-col gap-3">
                {recording && (
                  <div className="w-full flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-500 font-medium flex-1">
                      Grabando... {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
                    </span>
                    <Button size="sm" variant="destructive" onClick={handleStopRecording} className="gap-1.5 h-8">
                      <StopCircle className="h-3.5 w-3.5" />Enviar
                    </Button>
                  </div>
                )}

                <div className="flex w-full gap-2 items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => Array.from(e.target.files || []).forEach((f) => uploadFile(f))}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingFile || recording}
                    title="Adjuntar foto o archivo"
                  >
                    {sendingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("shrink-0 h-10 w-10", recording && "text-red-500")}
                    onClick={recording ? handleStopRecording : startRecording}
                    disabled={sendingFile}
                    title={recording ? "Detener grabación" : "Grabar audio"}
                  >
                    {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  <Textarea
                    placeholder="Escribe un mensaje... (Enter para enviar)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                    disabled={recording}
                  />

                  <Button
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    disabled={!message.trim() || addCommentMutation.isPending || recording}
                    onClick={handleSendMessage}
                  >
                    {addCommentMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground self-start">
                  Puedes enviar texto, fotos, PDFs o mensajes de voz.
                </p>
              </CardFooter>
            ) : (
              <CardFooter className="border-t pt-4 pb-4">
                <p className="text-sm text-muted-foreground italic">
                  Este ticket está {ticket.status === "resolved" ? "resuelto" : "cerrado"}. No se pueden añadir mensajes.
                </p>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          {/* Acción técnico */}
          {isTech && ticket.status !== "resolved" && ticket.status !== "closed" && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acción del Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isUnassigned && (
                  <Button className="w-full gap-2" onClick={handleTakeTicket} disabled={updateTicketMutation.isPending}>
                    <UserCheck className="h-4 w-4" />Tomar este Ticket
                  </Button>
                )}
                {isAssignedToMe && (
                  <>
                    <div className="text-sm text-green-500 font-medium flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" />Estás a cargo de este ticket
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 gap-2" onClick={handleResolve} disabled={updateTicketMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4" />Marcar como Resuelto
                    </Button>
                    <Button className="w-full" variant="outline" size="sm" onClick={handleUnassign} disabled={updateTicketMutation.isPending}>
                      Liberar Ticket
                    </Button>
                  </>
                )}
                {!isUnassigned && !isAssignedToMe && ticket.assignedTo && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Asignado a: <span className="font-medium text-foreground">{ticket.assignedTo.name}</span></p>
                    <Button className="w-full gap-2" variant="outline" onClick={handleTakeTicket} disabled={updateTicketMutation.isPending}>
                      <UserCheck className="h-4 w-4" />Tomar de todas formas
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reportado por */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Reportado por</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {ticket.createdBy?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-medium text-sm">{ticket.createdBy?.name || "Desconocido"}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {ticket.createdBy?.role === "user" ? "Usuario" : ticket.createdBy?.role}
                  </p>
                </div>
              </div>
              {ticket.createdBy?.email && (
                <a href={`mailto:${ticket.createdBy.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline underline-offset-4">
                  <Mail className="h-3.5 w-3.5" />{ticket.createdBy.email}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Detalles */}
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
              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resuelto</p>
                  <p className="text-sm">{new Date(ticket.resolvedAt).toLocaleString("es-MX")}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Creado</p>
                <p className="text-sm">{new Date(ticket.createdAt).toLocaleString("es-MX")}</p>
              </div>
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
                    <Button key={s} variant="ghost" size="icon" className="h-10 w-10 text-amber-400" onClick={() => {
                      setRating(s);
                      rateTicketMutation.mutate(
                        { id: ticketId, data: { stars: s } },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });
                            toast({ title: "¡Gracias por tu valoración!" });
                          },
                        }
                      );
                    }} disabled={rateTicketMutation.isPending}>
                      <Star className={cn("h-6 w-6", rating >= s ? "fill-current" : "")} />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ticket.rating && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Valoración</p>
                <div className="flex gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-5 w-5", ticket.rating! >= s ? "fill-current" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
