import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WelcomeMessageProps {
  className?: string;
}

export default function WelcomeMessage({ className }: WelcomeMessageProps) {
  const { user } = useAuth();

  console.log('WelcomeMessage - User:', user);
  
  // Sempre renderizar algo para debug
  if (!user) {
    console.log('WelcomeMessage - No user, showing fallback');
    return (
      <div style={{ backgroundColor: 'orange', color: 'white', padding: '10px', margin: '10px 0' }}>
        DEBUG: Usuário não encontrado - componente WelcomeMessage está funcionando mas sem dados do usuário
      </div>
    );
  }

  // Determinar saudação baseada na hora
  const hour = new Date().getHours();
  let greeting = "Bom dia";
  let timeIcon = Sunrise;
  let timeOfDay = "manhã";

  if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
    timeIcon = Sun;
    timeOfDay = "tarde";
  } else if (hour >= 18 && hour < 22) {
    greeting = "Boa tarde";
    timeIcon = Sunset;
    timeOfDay = "final de tarde";
  } else if (hour >= 22 || hour < 6) {
    greeting = "Boa noite";
    timeIcon = Moon;
    timeOfDay = "noite";
  }

  const TimeIcon = timeIcon;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
              <TimeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {greeting}, {user.name}!
              </h2>
              <p className="text-sm text-gray-500">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {timeOfDay}
          </Badge>
        </div>

        <p className="text-gray-700 mb-4 leading-relaxed">
          Seja bem-vindo ao seu painel de controle! Aqui você pode acompanhar seus projetos, 
          tarefas e informações financeiras de forma centralizada.
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>🎯 Painel ativo</span>
            <span>📊 Dados em tempo real</span>
            <span>✨ Sistema personalizado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}