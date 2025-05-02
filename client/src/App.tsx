import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DashboardNew from "@/pages/dashboard-new";
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
                  <Route path="/">
                    <Layout>
                      <Switch>
                        <ProtectedRoute path="/" exact component={Dashboard} />
                        <ProtectedRoute path="/dashboard" component={Dashboard} />
                        <ProtectedRoute path="/dashboard-new" component={DashboardNew} />
                        <ProtectedRoute path="/projects" exact component={Projects} />
                        <ProtectedRoute path="/projects/:id" component={Projects} />
                        <ProtectedRoute path="/tasks" exact component={Tasks} />
                        <ProtectedRoute path="/tasks/:id" component={Tasks} />
                        <ProtectedRoute path="/clients" exact component={Clients} />
                        <ProtectedRoute path="/clients/:id" component={ClientDetail} />
                        <ProtectedRoute path="/financial" component={Financial} />
                        <ProtectedRoute path="/calendar" component={Calendar} />
                        <ProtectedRoute path="/team" exact component={Team} />
                        <ProtectedRoute path="/team/user/:id" component={UserProfile} />
                        <ProtectedRoute path="/settings" component={Settings} />
                        <Route component={NotFound} />
                      </Switch>
                    </Layout>
                  </Route>
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