import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DiagnosticoPage() {
  const [environmentInfo, setEnvironmentInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});
  
  // Carregar informações básicas do ambiente
  useEffect(() => {
    const isDeployed = window.location.hostname.includes('.replit.app');
    const info = {
      ambiente: isDeployed ? 'Deployed (Produção)' : 'Sandbox (Desenvolvimento)',
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localizacao: navigator.language,
      dataBrowser: new Date().toString(),
      offset: new Date().getTimezoneOffset(),
    };
    
    setEnvironmentInfo(info);
  }, []);
  
  // Removida consulta para endpoint inexistente
  const apiStatus = "API não configurada";
  
  // Obter lista de projetos diretamente, sem filtragem
  const { data: projectsData, isLoading: projectsLoading, isError: projectsError, error: projectsErrorDetails } = useQuery({
    queryKey: ['/api/projects'],
    retry: 1,
    gcTime: 0,
  });
  
  // Realizar testes específicos com datas relevantes
  useEffect(() => {
    if (projectsData) {
      try {
        // Teste 1: Verificar se projectsData é um array
        const isArray = Array.isArray(projectsData);
        
        // Teste 2: Contar projetos
        const count = isArray ? projectsData.length : 'N/A (não é array)';
        
        // Teste 3: Verificar o formato das datas nos projetos
        let datesInfo: any = {};
        
        if (isArray && projectsData.length > 0) {
          const project = projectsData[0];
          
          if (project.creation_date) {
            datesInfo.creationDateRaw = project.creation_date;
            
            try {
              const date = new Date(project.creation_date);
              datesInfo.creationDateParsed = date.toString();
              datesInfo.isValidDate = !isNaN(date.getTime());
              
              // Teste especial para o filtro
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              datesInfo.isRecent = date > thirtyDaysAgo;
              datesInfo.thirtyDaysAgo = thirtyDaysAgo.toString();
            } catch (e) {
              datesInfo.parseError = e instanceof Error ? e.message : String(e);
            }
          } else {
            datesInfo.creationDateExiste = false;
          }
        }
        
        // Usar dados apenas se for um array
        const rawData = isArray ? projectsData.slice(0, 2) : [];
        
        setTestResults({
          isArray,
          count,
          datesInfo,
          rawData
        });
      } catch (e) {
        setTestResults({
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }
  }, [projectsData]);
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
        <Button variant="outline" asChild>
          <Link href="/projects">Voltar para Projetos</Link>
        </Button>
      </div>
      
      <Tabs defaultValue="ambiente">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ambiente">Informações do Ambiente</TabsTrigger>
          <TabsTrigger value="projetos">Dados de Projetos</TabsTrigger>
          <TabsTrigger value="datas">Diagnóstico de Datas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ambiente">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Informações do Ambiente</CardTitle>
              <CardDescription>
                Detalhes técnicos sobre o ambiente atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Ambiente:</strong>
                    <p className="text-xl font-bold text-primary">{environmentInfo.ambiente}</p>
                  </div>
                  <div>
                    <strong>Hostname:</strong>
                    <p>{environmentInfo.hostname}</p>
                  </div>
                  <div>
                    <strong>Timezone:</strong>
                    <p>{environmentInfo.timezone}</p>
                  </div>
                  <div>
                    <strong>Offset de Timezone:</strong>
                    <p>{environmentInfo.offset} minutos</p>
                  </div>
                  <div>
                    <strong>Data (Browser):</strong>
                    <p>{environmentInfo.dataBrowser}</p>
                  </div>
                  <div>
                    <strong>Localização:</strong>
                    <p>{environmentInfo.localizacao}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="projetos">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Dados de Projetos</CardTitle>
              <CardDescription>
                Informações sobre os projetos obtidos da API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <p>Carregando dados dos projetos...</p>
              ) : projectsError ? (
                <div className="p-4 bg-destructive/10 rounded">
                  <p className="font-bold">Erro ao carregar projetos:</p>
                  <p>{String(projectsErrorDetails)}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>É um array:</strong>
                      <p>{testResults.isArray ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <strong>Quantidade de projetos:</strong>
                      <p className="text-xl font-bold">{testResults.count}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Primeiros projetos (raw data):</h3>
                    <pre className="bg-muted p-4 rounded overflow-auto text-xs max-h-48">
                      {JSON.stringify(testResults.rawData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="datas">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Diagnóstico de Datas</CardTitle>
              <CardDescription>
                Análise do processamento de datas (se existirem projetos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!testResults.datesInfo ? (
                <p>Nenhuma informação de data disponível</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Data de criação (raw):</strong>
                      <p>{testResults.datesInfo.creationDateRaw || 'Não disponível'}</p>
                    </div>
                    <div>
                      <strong>Data é válida:</strong>
                      <p>{testResults.datesInfo.isValidDate ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <strong>Data processada:</strong>
                      <p>{testResults.datesInfo.creationDateParsed || 'Não disponível'}</p>
                    </div>
                    <div>
                      <strong>É considerada recente (< 30 dias):</strong>
                      <p className="font-bold">{testResults.datesInfo.isRecent ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <strong>Data atual menos 30 dias:</strong>
                      <p>{testResults.datesInfo.thirtyDaysAgo || 'Não disponível'}</p>
                    </div>
                  </div>
                  
                  {testResults.datesInfo.parseError && (
                    <div className="p-4 bg-destructive/10 rounded">
                      <p className="font-bold">Erro ao processar data:</p>
                      <p>{testResults.datesInfo.parseError}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                O filtro de "projetos recentes" verifica se a data de criação está dentro dos últimos 30 dias.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}