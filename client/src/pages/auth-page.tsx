import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { isMobileDevice, performMobileLogin } from "@/lib/mobile-auth";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, EyeOffIcon, KeyRound, Lock, User, Users, Smartphone, AlertCircle, Info } from "lucide-react";

// Validação para o formulário de login
const loginSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

// Estendendo o schema de inserção para validação adicional
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  email: z.string().email("Email inválido"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [showPassword, setShowPassword] = useState(false);

  // Redirecionamento se já estiver autenticado usando useEffect
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Formulário de login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Formulário de registro
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      name: "",
      role: "editor", // Valor padrão
      department: "",
      position: "",
    },
  });

  // Submissão do formulário de login
  const onLoginSubmit = async (data: LoginFormValues) => {
    // Se for dispositivo móvel, usar método específico mobile que armazena tokens
    if (isMobileDevice()) {
      const success = await performMobileLogin(data.username, data.password);
      if (success) {
        setLocation("/");
      }
    } else {
      // Login normal para desktop
      loginMutation.mutate(data);
    }
  };

  // Submissão do formulário de registro
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Remover confirmPassword antes de enviar
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  // Alternar visibilidade da senha
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex min-h-screen">
      {/* Hero Section com gradiente */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pink-500 via-rose-500 to-blue-500 flex-col justify-center px-16 text-white">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold mb-6">Content Crush</h1>
          <p className="text-xl mb-10">
            Gerencie seus projetos e tarefas com facilidade e eficiência
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Controle de acesso</h3>
                <p className="text-white/80 text-sm">
                  Diferentes níveis de acesso para administradores, gerentes e criadores
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Gestão de equipe</h3>
                <p className="text-white/80 text-sm">
                  Organize sua equipe e atribua tarefas facilmente
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center w-full lg:w-1/2 px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Entrar</h2>
            <p className="text-gray-500">Faça login com suas credenciais</p>
          </div>

          <div className="mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-10">
                <TabsTrigger value="login" className="rounded-md">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-md">Registrar</TabsTrigger>
              </TabsList>

              {/* Tab de Login */}
              <TabsContent value="login" className="mt-0">
                {isMobileDevice() && (
                  <Alert className="mb-4">
                    <Smartphone className="h-4 w-4 mr-2" />
                    <AlertTitle>Dispositivo móvel detectado</AlertTitle>
                    <AlertDescription>
                      Utilizando autenticação otimizada para dispositivos móveis.
                    </AlertDescription>
                  </Alert>
                )}
                
                {isMobileDevice() && (
                  <div className="mb-4">
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-500 mr-2" />
                      <AlertTitle className="text-blue-700">Usuários recomendados para teste:</AlertTitle>
                      <AlertDescription className="text-blue-600 text-sm">
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li><strong>Admin:</strong> bruno.silva / password</li>
                          <li><strong>Editor:</strong> ana.oliveira / password</li>
                          <li><strong>Viewer:</strong> Teste / password</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                              </div>
                              <Input 
                                placeholder="Seu username" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <KeyRound className="h-5 w-5 text-gray-400" />
                              </div>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Sua senha"
                                className="pl-10 pr-10"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showPassword ? (
                                  <EyeOffIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <EyeIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-rose-500 hover:bg-rose-600" 
                      disabled={loginMutation.isPending}
                    >
                      {isMobileDevice() ? (
                        <div className="flex items-center justify-center">
                          <Smartphone className="mr-2 h-4 w-4" />
                          <span>{loginMutation.isPending ? "Entrando..." : "Entrar com Mobile Auth"}</span>
                        </div>
                      ) : (
                        <span>{loginMutation.isPending ? "Entrando..." : "Entrar"}</span>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 text-center">
                  <Button variant="link" className="text-sm text-rose-500">
                    Esqueceu sua senha?
                  </Button>
                </div>
              </TabsContent>

              {/* Tab de Registro */}
              <TabsContent value="register" className="mt-0">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome de usuário único" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu departamento" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu cargo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Crie uma senha"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirme a Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirme sua senha"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-rose-500 hover:bg-rose-600" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Registrando..." : "Registrar"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}