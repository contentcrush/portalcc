import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DashboardNovo from "@/pages/dashboard-novo";
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
                  <Route>
                    <Layout>
                      <Switch>
                        <Route path="/" component={Dashboard} />
                        <Route path="/dashboard" component={Dashboard} />
                        <Route path="/dashboard-novo" component={DashboardNovo} />
                        <Route path="/projects" component={Projects} />
                        <Route path="/projects/:id" component={Projects} />
                        <Route path="/tasks" component={Tasks} />
                        <Route path="/tasks/:id" component={Tasks} />
                        <Route path="/clients" component={Clients} />
                        <Route path="/clients/:id" component={ClientDetail} />
                        <Route path="/financial" component={Financial} />
                        <Route path="/calendar" component={Calendar} />
                        <Route path="/team" component={Team} />
                        <Route path="/team/user/:id" component={UserProfile} />
                        <Route path="/settings" component={Settings} />
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