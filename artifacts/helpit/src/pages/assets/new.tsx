import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCreateAsset, getGetAssetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const assetSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["pc", "laptop", "printer", "server", "monitor", "other"]),
  code: z.string().min(3, "El código debe tener al menos 3 caracteres"),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

export default function AssetNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof assetSchema>>({
    resolver: zodResolver(assetSchema),
    defaultValues: { name: "", type: "pc", code: "", location: "", serialNumber: "", notes: "" },
  });

  const createAsset = useCreateAsset();

  function onSubmit(values: z.infer<typeof assetSchema>) {
    createAsset.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
          toast({ title: "Activo registrado", description: `${data.name} añadido al inventario.` });
          setLocation(`/assets/${data.id}`);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.data?.error || "No se pudo registrar el activo.",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Activo</h1>
        <p className="text-muted-foreground">Añade un nuevo equipo al inventario de TI.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos del Equipo</CardTitle>
          <CardDescription>El código se usará para identificar el equipo mediante QR o código de barras.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del activo</FormLabel>
                    <FormControl><Input placeholder="ej. LAPTOP-DEV-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pc">PC</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="printer">Impresora</SelectItem>
                        <SelectItem value="server">Servidor</SelectItem>
                        <SelectItem value="monitor">Monitor</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Activo</FormLabel>
                  <FormControl><Input placeholder="ej. IT-2024-0042" {...field} className="font-mono" /></FormControl>
                  <FormDescription>Identificador único para escaneo QR o código de barras.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl><Input placeholder="ej. Oficina 3B, Piso 2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Serie</FormLabel>
                    <FormControl><Input placeholder="Serie del fabricante" {...field} className="font-mono" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales</FormLabel>
                  <FormControl><Textarea placeholder="Observaciones sobre el equipo..." className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-4 pt-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/assets")}>Cancelar</Button>
                <Button type="submit" disabled={createAsset.isPending}>
                  {createAsset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Activo
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
