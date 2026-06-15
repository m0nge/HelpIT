import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import TicketsList from "@/pages/tickets/list";
import TicketNew from "@/pages/tickets/new";
import TicketDetail from "@/pages/tickets/detail";
import AssetsList from "@/pages/assets/list";
import AssetNew from "@/pages/assets/new";
import AssetDetail from "@/pages/assets/detail";
import AssetScan from "@/pages/assets/scan";
import UsersList from "@/pages/users/list";

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        {() => (
          <Layout>
            <ProtectedRoute component={Dashboard} />
          </Layout>
        )}
      </Route>

      <Route path="/tickets/new">
        {() => (
          <Layout>
            <ProtectedRoute component={TicketNew} />
          </Layout>
        )}
      </Route>

      <Route path="/tickets/:id">
        {() => (
          <Layout>
            <ProtectedRoute component={TicketDetail} />
          </Layout>
        )}
      </Route>

      <Route path="/tickets">
        {() => (
          <Layout>
            <ProtectedRoute component={TicketsList} />
          </Layout>
        )}
      </Route>

      <Route path="/assets/new">
        {() => (
          <Layout>
            <ProtectedRoute
              component={AssetNew}
              allowedRoles={["admin", "technician"]}
            />
          </Layout>
        )}
      </Route>

      <Route path="/assets/scan">
        {() => (
          <Layout>
            <ProtectedRoute
              component={AssetScan}
              allowedRoles={["admin", "technician"]}
            />
          </Layout>
        )}
      </Route>

      <Route path="/assets/:id">
        {() => (
          <Layout>
            <ProtectedRoute
              component={AssetDetail}
              allowedRoles={["admin", "technician"]}
            />
          </Layout>
        )}
      </Route>

      <Route path="/assets">
        {() => (
          <Layout>
            <ProtectedRoute
              component={AssetsList}
              allowedRoles={["admin", "technician"]}
            />
          </Layout>
        )}
      </Route>

      <Route path="/users">
        {() => (
          <Layout>
            <ProtectedRoute component={UsersList} allowedRoles={["admin"]} />
          </Layout>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="helpit-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
