import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCreateTicket, getGetTicketsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

const ticketSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  category: z.enum(["hardware", "software", "network", "access"]),
});

const CRITICAL_KEYWORDS = [
  "caído", "caido", "no enciende", "bloqueado", "error crítico", "error critico",
  "crashed", "critical", "down", "blocked", "no arranca",
  "urgente", "emergencia", "fuera de servicio", "sin acceso",
];

export default function TicketNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { title: "", description: "", category: "hardware" },
  });

  const createTicketMutation = useCreateTicket();
  const description = form.watch("description");
  const isCritical = CRITICAL_KEYWORDS.some((kw) => description.toLowerCase().includes(kw));

  function onSubmit(values: z.infer<typeof ticketSchema>) {
    createTicketMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getGetTicketsQueryKey() });
          toast({
            title: "Ticket creado",
            description: `El ticket #${data.id} fue enviado correctamente.`,
          });
          setLocation(`/tickets/${data.id}`);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.data?.error || error.message || "No se pudo crear el ticket.",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crear Ticket</h1>
        <p className="text-muted-foreground">Envía una nueva solicitud de soporte técnico.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Problema</CardTitle>
          <CardDescription>Proporciona el mayor detalle posible para agilizar la resolución.</CardDescription>
        </CardHeader>
        <CardContent>
          {isCritical && (
            <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-red-500 font-semibold">Prioridad Crítica Detectada</h4>
                <p className="text-sm text-red-500/80 mt-0.5">
                  Tu descripción contiene palabras clave que indican urgencia. Este ticket se marcará como crítico y se escalará inmediatamente.
                </p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del problema</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumen breve del problema" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="network">Red / Conectividad</SelectItem>
                      <SelectItem value="access">Acceso / Permisos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción detallada</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el problema con el mayor detalle posible: qué ocurrió, cuándo empezó, mensajes de error, pasos para reproducirlo..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Una descripción clara agiliza la resolución. Puedes subir fotos de evidencia después de crear el ticket.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-4 pt-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")}>Cancelar</Button>
                <Button type="submit" disabled={createTicketMutation.isPending}>
                  {createTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Ticket
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
