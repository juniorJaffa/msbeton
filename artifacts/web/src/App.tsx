import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { syncFromServer } from "@/lib/adminData";
import { clientAuth } from "@/lib/clientAuth";

import Home from "@/pages/Home";
const Cennik = lazy(() => import("@/pages/Cennik"));
const VozovyPark = lazy(() => import("@/pages/VozovyPark"));
const ClientLogin = lazy(() => import("@/pages/ClientLogin"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
import { CookieBanner } from "@/components/CookieBanner";
import { VersionChecker } from "@/components/VersionChecker";

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/cennik" component={Cennik} />
        <Route path="/vozovy-park" component={VozovyPark} />
        <Route path="/prihlasenie" component={ClientLogin} />
        <Route path="/admin">
          {() => <Redirect to="/admin/login" />}
        </Route>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    syncFromServer();
    clientAuth.refreshSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <CookieBanner />
        <VersionChecker />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
