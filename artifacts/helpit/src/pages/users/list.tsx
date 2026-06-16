import { useState } from "react";
import {
  useGetUsers, useUpdateUser, useCreateUser,
  getGetUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const ROLE_BADGES: Record<string, React.ReactNode> = {
  admin: <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">Administrador</Badge>,
  technician: <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Técnico</Badge>,
  user: <Badge variant="secondary">Usuario</Badge>,
};

const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["user", "technician", "admin"]),
});

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createUser = useCreateUser();

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  function onSubmit(values: z.infer<typeof createUserSchema>) {
    createUser.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          toast({ title: `Usuario "${data.name}" creado correctamente` });
          form.reset();
          onClose();
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Error", description: error.data?.error || "No se pudo crear el usuario." });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl><Input placeholder="Juan García" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl><Input type="email" placeholder="juan@empresa.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="technician">Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersList() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useGetUsers();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const handleRoleChange = (userId: number, role: string) => {
    if (userId === currentUser?.id) {
      toast({ variant: "destructive", title: "No puedes cambiar tu propio rol" });
      return;
    }
    updateUser.mutate(
      { id: userId, data: { role: role as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          toast({ title: "Rol actualizado correctamente" });
        },
        onError: () => toast({ variant: "destructive", title: "Error al actualizar el rol" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra cuentas y roles de usuario.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />Crear Usuario
        </Button>
      </div>

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : users?.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Sin usuarios registrados</p>
            </div>
          ) : (
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol actual</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Cambiar Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id} className={u.id === currentUser?.id ? "bg-primary/5" : ""}>
                    <TableCell className="text-muted-foreground font-medium">#{u.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{u.name}</span>
                        {u.id === currentUser?.id && <Badge variant="outline" className="text-xs">Tú</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>{ROLE_BADGES[u.role]}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(u.createdAt).toLocaleDateString("es-MX")}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(role) => handleRoleChange(u.id, role)}
                        disabled={u.id === currentUser?.id || updateUser.isPending}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="technician">Técnico</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
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
