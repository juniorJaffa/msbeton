import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { syncFromServer } from "@/lib/adminData";
import { clientAuth } from "@/lib/clientAuth";

import Home from "@/pages/Home";
const Cennik = lazy(() => import("@/pages/Cennik"));
const KalkulackaBeton = lazy(() => import("@/pages/KalkulackaBeton"));
const Kontakt = lazy(() => import("@/pages/Kontakt"));
const VozovyPark = lazy(() => import("@/pages/VozovyPark"));
const ClientLogin = lazy(() => import("@/pages/ClientLogin"));
const ClientProfile = lazy(() => import("@/pages/ClientProfile"));
const ClientPasswordReset = lazy(() => import("@/pages/ClientPasswordReset"));
const NotFound = lazy(() => import("@/pages/not-found"));
const OchranaOsobnychUdajov = lazy(() => import("@/pages/OchranaOsobnychUdajov"));
const VOP = lazy(() => import("@/pages/VOP"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
import { CookieBanner } from "@/components/CookieBanner";
import { VersionChecker } from "@/components/VersionChecker";
import { BiometricUnlockGate } from "@/components/BiometricUnlockGate";

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/cennik" component={Cennik} />
        <Route path="/kalkulacka-beton" component={KalkulackaBeton} />
        <Route path="/kontakt" component={Kontakt} />
        <Route path="/vozovy-park" component={VozovyPark} />
        <Route path="/prihlasenie" component={ClientLogin} />
        <Route path="/klient-profil" component={ClientProfile} />
        <Route path="/klient-reset" component={ClientPasswordReset} />
        <Route path="/admin">
          {() => <Redirect to="/admin/login" />}
        </Route>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/ochrana-osobnych-udajov" component={OchranaOsobnychUdajov} />
        <Route path="/vop" component={VOP} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    syncFromServer();
    clientAuth.refreshSession();

    // Refresh dát pri návrate na tab + každé 2 minúty
    const onVisible = () => { if (document.visibilityState === "visible") syncFromServer(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(syncFromServer, 2 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <BiometricUnlockGate />
        </WouterRouter>
        <Toaster />
        <CookieBanner />
        <VersionChecker />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
