import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
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

// Componente de fallback para quando os dados estão carregando
const PageLoader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

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
                        <Route path="/" component={(props) => <ProtectedRoute component={Dashboard} {...props} />} />
                        <Route path="/dashboard" component={(props) => <ProtectedRoute component={Dashboard} {...props} />} />
                        <Route path="/projects" component={(props) => <ProtectedRoute component={Projects} {...props} />} />
                        <Route path="/projects/:id" component={(props) => <ProtectedRoute component={Projects} {...props} />} />
                        <Route path="/tasks" component={(props) => <ProtectedRoute component={Tasks} {...props} />} />
                        <Route path="/tasks/:id" component={(props) => <ProtectedRoute component={Tasks} {...props} />} />
                        <Route path="/clients" component={(props) => <ProtectedRoute component={Clients} {...props} />} />
                        <Route path="/clients/:id" component={(props) => <ProtectedRoute component={ClientDetail} {...props} />} />
                        <Route path="/financial" component={(props) => <ProtectedRoute component={Financial} {...props} />} />
                        <Route path="/calendar" component={(props) => <ProtectedRoute component={Calendar} {...props} />} />
                        <Route path="/team" component={(props) => <ProtectedRoute component={Team} {...props} />} />
                        <Route path="/team/user/:id" component={(props) => <ProtectedRoute component={UserProfile} {...props} />} />
                        <Route path="/settings" component={(props) => <ProtectedRoute component={Settings} {...props} />} />
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