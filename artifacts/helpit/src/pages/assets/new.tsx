import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCreateAsset, getGetAssetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const assetSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["pc", "laptop", "printer", "server", "monitor", "other"]),
  code: z.string().min(3, "Code must be at least 3 characters"),
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
    defaultValues: {
      name: "",
      type: "pc",
      code: "",
      location: "",
      serialNumber: "",
      notes: "",
    },
  });

  const createAsset = useCreateAsset();

  function onSubmit(values: z.infer<typeof assetSchema>) {
    createAsset.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
          toast({ title: "Asset registered", description: `${data.name} added to inventory.` });
          setLocation(`/assets/${data.id}`);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.data?.error || error.message || "Failed to create asset.",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Register Asset</h1>
        <p className="text-muted-foreground">Add a new piece of equipment to the inventory.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>Fill in the equipment information. The code will be used for QR/barcode scanning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. LAPTOP-DEV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pc">PC</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                          <SelectItem value="printer">Printer</SelectItem>
                          <SelectItem value="server">Server</SelectItem>
                          <SelectItem value="monitor">Monitor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. IT-2024-0042" {...field} className="font-mono" />
                    </FormControl>
                    <FormDescription>Unique identifier used for QR/barcode scanning.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Office 3B, Floor 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Manufacturer serial" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about this asset..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/assets")}>Cancel</Button>
                <Button type="submit" disabled={createAsset.isPending}>
                  {createAsset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register Asset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
