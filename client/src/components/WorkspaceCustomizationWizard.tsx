import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { usePreferences, UserPreference } from "@/hooks/use-preferences";
import { Check, Settings, PanelLeft, Layout, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WorkspaceCustomizationWizardProps {
  trigger?: React.ReactNode;
}

export function WorkspaceCustomizationWizard({ trigger }: WorkspaceCustomizationWizardProps) {
  const { preferences, updatePreferences } = usePreferences();
  const [open, setOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Partial<UserPreference>>(
    preferences || {}
  );
  
  // Atualiza o estado local quando as preferências globais mudam
  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  // Atualiza uma propriedade específica
  const updateLocalPref = <K extends keyof UserPreference>(
    key: K,
    value: UserPreference[K]
  ) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Salva as alterações
  const savePreferences = () => {
    updatePreferences(localPrefs);
    setOpen(false);
    toast({
      title: "Espaço de trabalho personalizado",
      description: "Suas configurações foram salvas com sucesso.",
    });
  };

  // Reinicia o diálogo com as preferências atuais quando abrir
  const handleOpenChange = (value: boolean) => {
    if (value && preferences) {
      setLocalPrefs(preferences);
    }
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>Personalizar Espaço de Trabalho</DialogTitle>
          <DialogDescription>
            Adapte o Content Crush ao seu estilo de trabalho.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="appearance" className="flex items-center">
              <Palette className="mr-2 h-4 w-4" /> Aparência
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center">
              <Layout className="mr-2 h-4 w-4" /> Layout
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="flex items-center">
              <PanelLeft className="mr-2 h-4 w-4" /> Barra Lateral
            </TabsTrigger>
          </TabsList>

          {/* Aba de Aparência */}
          <TabsContent value="appearance">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tema</CardTitle>
                  <CardDescription>
                    Escolha o tema que melhor se adapta ao seu ambiente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={localPrefs?.theme || "light"}
                    onValueChange={(v) => updateLocalPref("theme", v as "light" | "dark" | "system")}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                      <Label
                        htmlFor="theme-light"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:border-accent hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="mb-2 rounded-md bg-background p-2">
                          <div className="h-8 w-8 rounded-full bg-primary" />
                        </div>
                        <span>Claro</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                      <Label
                        htmlFor="theme-dark"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-zinc-950 p-4 hover:border-accent hover:bg-accent/20 text-white cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="mb-2 rounded-md bg-zinc-800 p-2">
                          <div className="h-8 w-8 rounded-full bg-primary" />
                        </div>
                        <span>Escuro</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                      <Label
                        htmlFor="theme-system"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-gradient-to-r from-white to-zinc-950 p-4 hover:border-accent hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="mb-2 rounded-md bg-gradient-to-r from-background to-zinc-800 p-2">
                          <div className="h-8 w-8 rounded-full bg-primary" />
                        </div>
                        <span>Sistema</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cores de Destaque</CardTitle>
                  <CardDescription>
                    Escolha a cor principal para botões e elementos interativos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={localPrefs?.accent_color || "blue"}
                    onValueChange={(v) => updateLocalPref("accent_color", v as "blue" | "green" | "purple" | "orange" | "red" | "pink")}
                    className="grid grid-cols-6 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="blue" id="accent-blue" className="sr-only" />
                      <Label
                        htmlFor="accent-blue"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-2 hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-600" />
                        <span className="mt-2 text-xs">Azul</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="green" id="accent-green" className="sr-only" />
                      <Label
                        htmlFor="accent-green"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-2 hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="h-8 w-8 rounded-full bg-green-600" />
                        <span className="mt-2 text-xs">Verde</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="purple" id="accent-purple" className="sr-only" />
                      <Label
                        htmlFor="accent-purple"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-2 hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="h-8 w-8 rounded-full bg-purple-600" />
                        <span className="mt-2 text-xs">Roxo</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="orange" id="accent-orange" className="sr-only" />
                      <Label
                        htmlFor="accent-orange"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-2 hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="h-8 w-8 rounded-full bg-orange-600" />
                        <span className="mt-2 text-xs">Laranja</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="red" id="accent-red" className="sr-only" />
                      <Label
                        htmlFor="accent-red"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-2 hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="h-8 w-8 rounded-full bg-red-600" />
                        <span className="mt-2 text-xs">Vermelho</span>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="pink" id="accent-pink" className="sr-only" />
                      <Label
                        htmlFor="accent-pink"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-2 hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                      >
                        <div className="h-8 w-8 rounded-full bg-pink-600" />
                        <span className="mt-2 text-xs">Rosa</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba de Layout */}
          <TabsContent value="layout">
            <Card>
              <CardHeader>
                <CardTitle>Visualização de Clientes</CardTitle>
                <CardDescription>
                  Escolha como seus clientes serão exibidos na seção de clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={localPrefs?.clients_view_mode || "grid"}
                  onValueChange={(v) => updateLocalPref("clients_view_mode", v as "grid" | "list" | "table")}
                  className="grid grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="grid" id="view-grid" className="sr-only" />
                    <Label
                      htmlFor="view-grid"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:border-accent hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                    >
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <div className="h-10 w-12 rounded bg-muted" />
                        <div className="h-10 w-12 rounded bg-muted" />
                      </div>
                      <span>Grade</span>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="list" id="view-list" className="sr-only" />
                    <Label
                      htmlFor="view-list"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:border-accent hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                    >
                      <div className="mb-2 space-y-2">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-4 w-24 rounded bg-muted" />
                      </div>
                      <span>Lista</span>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="table" id="view-table" className="sr-only" />
                    <Label
                      htmlFor="view-table"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:border-accent hover:bg-accent/10 cursor-pointer [&:has([data-state=checked])]:border-primary"
                    >
                      <div className="mb-2">
                        <div className="h-4 w-24 rounded bg-muted mb-2" />
                        <div className="grid grid-cols-3 gap-1">
                          <div className="h-3 w-7 rounded bg-muted" />
                          <div className="h-3 w-7 rounded bg-muted" />
                          <div className="h-3 w-7 rounded bg-muted" />
                        </div>
                      </div>
                      <span>Tabela</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Widgets do Dashboard</CardTitle>
                <CardDescription>
                  Personalize quais widgets aparecem na sua página inicial.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "tasks", label: "Tarefas Recentes" },
                    { id: "projects", label: "Projetos Ativos" },
                    { id: "clients", label: "Clientes" },
                    { id: "calendar", label: "Calendário" },
                    { id: "financial", label: "Resumo Financeiro" },
                    { id: "activity", label: "Atividades Recentes" },
                  ].map((widget) => {
                    const isChecked = (localPrefs?.dashboard_widgets || []).includes(widget.id);
                    return (
                      <div
                        key={widget.id}
                        className="flex items-center space-x-2"
                        onClick={() => {
                          // Toggle widget in array
                          const current = localPrefs?.dashboard_widgets || [];
                          let updated;
                          if (isChecked) {
                            updated = current.filter(w => w !== widget.id);
                          } else {
                            updated = [...current, widget.id];
                          }
                          updateLocalPref("dashboard_widgets", updated);
                        }}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          isChecked ? "bg-primary border-primary" : "border-muted"
                        }`}>
                          {isChecked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <Label className="cursor-pointer">{widget.label}</Label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Barra Lateral */}
          <TabsContent value="sidebar">
            <Card>
              <CardHeader>
                <CardTitle>Preferências da Barra Lateral</CardTitle>
                <CardDescription>
                  Configure como a barra lateral se comporta e quais ações rápidas aparecem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="sidebar-collapsed">Barra Lateral Recolhida</Label>
                    <div className="text-sm text-muted-foreground">
                      Iniciar com a barra lateral recolhida para maximizar o espaço
                    </div>
                  </div>
                  <Switch
                    id="sidebar-collapsed"
                    checked={localPrefs?.sidebar_collapsed || false}
                    onCheckedChange={(checked) => updateLocalPref("sidebar_collapsed", checked)}
                  />
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Ações Rápidas</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Escolha até 4 ações rápidas para exibir na barra lateral.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "new-task", label: "Nova Tarefa" },
                      { id: "new-project", label: "Novo Projeto" },
                      { id: "new-client", label: "Novo Cliente" },
                      { id: "new-event", label: "Novo Evento" },
                      { id: "new-document", label: "Novo Documento" },
                      { id: "new-expense", label: "Nova Despesa" },
                      { id: "search", label: "Pesquisar" },
                      { id: "reports", label: "Relatórios" },
                    ].map((action) => {
                      const isChecked = (localPrefs?.quick_actions || []).includes(action.id);
                      const disabled = 
                        !isChecked && 
                        (localPrefs?.quick_actions || []).length >= 4;
                        
                      return (
                        <div
                          key={action.id}
                          className={`flex items-center space-x-2 ${disabled ? "opacity-50" : ""}`}
                          onClick={() => {
                            if (disabled) return;
                            
                            // Toggle action in array
                            const current = localPrefs?.quick_actions || [];
                            let updated;
                            if (isChecked) {
                              updated = current.filter(a => a !== action.id);
                            } else {
                              updated = [...current, action.id];
                            }
                            updateLocalPref("quick_actions", updated);
                          }}
                        >
                          <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            isChecked ? "bg-primary border-primary" : "border-muted"
                          }`}>
                            {isChecked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <Label className={`cursor-pointer ${disabled ? "cursor-not-allowed" : ""}`}>
                            {action.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={savePreferences}>
            Salvar Preferências
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}