import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard-new-v2";
// import DashboardOriginal from "@/pages/dashboard"; // Mantendo o original comentado
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Financial from "@/pages/financial";
import Calendar from "@/pages/calendar";
import Team from "@/pages/team";
import UserProfile from "@/pages/user-profile";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import { PreferencesProvider } from "@/hooks/use-preferences";
import { ProjectFormProvider } from "@/contexts/ProjectFormContext";
import { SocketProvider } from "@/contexts/SocketContext";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <AccessibilityProvider>
            <ProjectFormProvider>
              <SocketProvider>
                <TooltipProvider>
                <Switch>
                  <Route path="/auth" component={AuthPage} />
                  <ProtectedRoute path="/" component={() => (
                    <Layout>
                      <Switch>
                        <Route path="/" component={Dashboard} />
                        <Route path="/dashboard" component={Dashboard} />
                        {/* Rota para dashboard antigo removida */}
                        <Route path="/projects">
                          {(params) => <Projects />}
                        </Route>
                        <Route path="/projects/:id">
                          {(params) => <Projects params={params} />}
                        </Route>
                        <Route path="/tasks">
                          {(params) => <Tasks />}
                        </Route>
                        <Route path="/tasks/:id">
                          {(params) => <Tasks params={params} />}
                        </Route>
                        <Route path="/clients">
                          {(params) => <Clients />}
                        </Route>
                        <Route path="/clients/:id">
                          {(params) => <ClientDetail params={params} />}
                        </Route>
                        <Route path="/financial">
                          {() => <Financial />}
                        </Route>
                        <Route path="/calendar">
                          {() => <Calendar />}
                        </Route>
                        <Route path="/team">
                          {() => <Team />}
                        </Route>
                        <Route path="/team/user/:id">
                          {(params) => <UserProfile params={params} />}
                        </Route>
                        <Route path="/settings">
                          {() => <Settings />}
                        </Route>
                        <Route>
                          {() => <NotFound />}
                        </Route>
                      </Switch>
                    </Layout>
                  )} />
                </Switch>
                {/* Renderizar o diálogo de formulário de projeto globalmente */}
                <ProjectFormDialog />
                <Toaster />
              </TooltipProvider>
              </SocketProvider>
            </ProjectFormProvider>
          </AccessibilityProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;