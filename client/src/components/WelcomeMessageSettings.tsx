import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings, 
  MessageSquare, 
  Clock, 
  Target,
  Sparkles,
  Save
} from "lucide-react";

interface WelcomeMessageSettingsProps {
  className?: string;
}

export default function WelcomeMessageSettings({ className }: WelcomeMessageSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estado local para configurações
  const [settings, setSettings] = useState({
    enabled: true,
    style: 'professional', // professional, casual, motivational
    showInsights: true,
    showStats: true,
    showWeather: false,
    customGreeting: '',
    priorities: ['tasks', 'projects', 'deadlines', 'financial']
  });

  // Buscar configurações do usuário
  const { data: userPreferences } = useQuery({
    queryKey: ["/api/user-preferences"],
  });

  // Mutação para salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: (newSettings: any) => 
      apiRequest("/api/user-preferences/welcome-message", {
        method: "POST",
        body: newSettings
      }),
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de mensagem de boas-vindas foram atualizadas."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleStyleChange = (newStyle: string) => {
    setSettings(prev => ({ ...prev, style: newStyle }));
  };

  const handlePriorityToggle = (priority: string) => {
    setSettings(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5" />
          <span>Configurações da Mensagem de Boas-vindas</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ativar/Desativar */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Mensagens personalizadas</Label>
            <p className="text-sm text-muted-foreground">
              Ative mensagens de boas-vindas personalizadas no dashboard
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        {settings.enabled && (
          <>
            {/* Estilo da mensagem */}
            <div className="space-y-3">
              <Label className="text-base">Estilo da mensagem</Label>
              <Select value={settings.style} onValueChange={handleStyleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Profissional</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="casual">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Casual</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="motivational">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>Motivacional</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Insights e estatísticas */}
            <div className="space-y-4">
              <Label className="text-base">Conteúdo da mensagem</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar insights inteligentes</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas sobre tarefas urgentes e prazos
                  </p>
                </div>
                <Switch
                  checked={settings.showInsights}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showInsights: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar estatísticas rápidas</Label>
                  <p className="text-sm text-muted-foreground">
                    Resumo de projetos e tarefas
                  </p>
                </div>
                <Switch
                  checked={settings.showStats}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showStats: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Incluir informações climáticas</Label>
                  <p className="text-sm text-muted-foreground">
                    Tempo e sugestões baseadas no clima
                  </p>
                </div>
                <Switch
                  checked={settings.showWeather}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showWeather: checked }))
                  }
                />
              </div>
            </div>

            {/* Prioridades de conteúdo */}
            <div className="space-y-3">
              <Label className="text-base">Prioridades de conteúdo</Label>
              <p className="text-sm text-muted-foreground">
                Selecione quais informações são mais importantes para você
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'tasks', label: 'Tarefas', icon: Target },
                  { id: 'projects', label: 'Projetos', icon: Settings },
                  { id: 'deadlines', label: 'Prazos', icon: Clock },
                  { id: 'financial', label: 'Financeiro', icon: MessageSquare }
                ].map(({ id, label, icon: Icon }) => (
                  <Badge
                    key={id}
                    variant={settings.priorities.includes(id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handlePriorityToggle(id)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Saudação personalizada */}
            <div className="space-y-3">
              <Label className="text-base">Saudação personalizada (opcional)</Label>
              <Textarea
                placeholder="Ex: Olá! Vamos tornar hoje produtivo..."
                value={settings.customGreeting}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, customGreeting: e.target.value }))
                }
                className="min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground">
                Deixe em branco para usar saudações automáticas baseadas na hora do dia
              </p>
            </div>

            {/* Botão salvar */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>
                  {saveSettingsMutation.isPending ? "Salvando..." : "Salvar configurações"}
                </span>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}