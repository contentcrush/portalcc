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
import Clients from "@/pages/clients-new";
import ClientDetail from "@/pages/client-detail";
import Financial from "@/pages/financial";
import Calendar from "@/pages/calendar";
import Team from "@/pages/team";
import UserProfile from "@/pages/user-profile";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import Files from "@/pages/files";
import FormExample from "@/pages/form-example";
import { AuthProvider } from "@/hooks/use-auth";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import { PreferencesProvider } from "@/hooks/use-preferences";
import { DateFormatterProvider } from "@/hooks/use-date-formatter";
import { ProjectFormProvider } from "@/contexts/ProjectFormContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { FormPersistenceProvider } from "@/contexts/FormPersistenceContext";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>{children}</Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardNovo} />
      <ProtectedRoute path="/dashboard" component={DashboardNovo} />
      <ProtectedRoute path="/dashboard-antigo" component={Dashboard} />
      <ProtectedRoute path="/projects" component={Projects} />
      <ProtectedRoute path="/projects/:id" component={Projects} />
      <ProtectedRoute path="/tasks" component={Tasks} />
      <ProtectedRoute path="/tasks/:id" component={Tasks} />
      <ProtectedRoute path="/clients" component={Clients} />
      <ProtectedRoute path="/clients/:id" component={ClientDetail} />
      <ProtectedRoute path="/financial" component={Financial} />
      <ProtectedRoute path="/calendar" component={Calendar} />
      <ProtectedRoute path="/team" component={Team} />
      <ProtectedRoute path="/team/user/:id" component={UserProfile} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/files" component={Files} />
      <ProtectedRoute path="/form-example" component={FormExample} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <AccessibilityProvider>
            <DateFormatterProvider>
              <FormPersistenceProvider>
                <ProjectFormProvider>
                  <SocketProvider>
                    <TooltipProvider>
                      <Layout>
                        <Router />
                      </Layout>
                      {/* Renderizar o diálogo de formulário de projeto globalmente */}
                      <ProjectFormDialog />
                      <Toaster />
                    </TooltipProvider>
                  </SocketProvider>
                </ProjectFormProvider>
              </FormPersistenceProvider>
            </DateFormatterProvider>
          </AccessibilityProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;