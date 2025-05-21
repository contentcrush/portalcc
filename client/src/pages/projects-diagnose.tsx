import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";

export default function ProjectsDiagnose() {
  const [location, setLocation] = useLocation();
  const [ambiente] = useState(window.location.hostname.includes('.replit.app') ? 'DEPLOYED' : 'SANDBOX');
  
  // Buscar projetos diretamente da API, sem nenhum processamento
  const { data: projects, isLoading, isError, error } = useQuery({
    queryKey: ['/api/projects'],
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: false
  });
  
  // Estados para diagnóstico
  const [diagnostico, setDiagnostico] = useState({
    totalProjetos: 0,
    isArray: false,
    primeiroProjeto: null,
    temDatasValidas: false,
    detalheDatas: {},
    problemasFiltros: []
  });
  
  // Analisar projetos quando estiverem disponíveis
  useEffect(() => {
    if (!projects) return;
    
    const isProjectsArray = Array.isArray(projects);
    const totalProjetos = isProjectsArray ? projects.length : 0;
    const primeiroProjeto = isProjectsArray && totalProjetos > 0 ? projects[0] : null;
    
    // Verificar datas nos projetos
    let temDatasValidas = false;
    let detalheDatas = {};
    let problemasFiltros = [];
    
    if (primeiroProjeto) {
      // Verificar campos essenciais no primeiro projeto
      if (!primeiroProjeto.hasOwnProperty('creation_date')) {
        problemasFiltros.push("Campo 'creation_date' não encontrado nos projetos");
      }
      
      if (primeiroProjeto.creation_date) {
        try {
          const data = new Date(primeiroProjeto.creation_date);
          temDatasValidas = !isNaN(data.getTime());
          
          const hoje = new Date();
          const trinta_dias = new Date();
          trinta_dias.setDate(hoje.getDate() - 30);
          
          detalheDatas = {
            dataOriginal: primeiroProjeto.creation_date,
            dataConvertida: data.toString(),
            dataFormatada: data.toLocaleString(),
            isValid: temDatasValidas,
            isRecent: data > trinta_dias,
            dataAtual: hoje.toString(),
            trintaDiasAtras: trinta_dias.toString(),
            diferenca: Math.floor((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24))
          };
        } catch (e) {
          problemasFiltros.push(`Erro ao processar data: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    
    setDiagnostico({
      totalProjetos,
      isArray: isProjectsArray,
      primeiroProjeto,
      temDatasValidas,
      detalheDatas,
      problemasFiltros
    });
  }, [projects]);
  
  // Função para testar manualmente o filtro de datas
  const testDateFilter = () => {
    if (!diagnostico.primeiroProjeto || !diagnostico.primeiroProjeto.creation_date) {
      return "Projeto não tem creation_date";
    }
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Converter a data do projeto
      const projDate = new Date(diagnostico.primeiroProjeto.creation_date);
      
      // Verificar se é uma data válida
      if (isNaN(projDate.getTime())) {
        return "Data inválida!";
      }
      
      // Simular o filtro que está falhando no ambiente deployed
      return projDate > thirtyDaysAgo ? "PROJETO RECENTE (deve aparecer)" : "PROJETO ANTIGO (filtrado)";
    } catch (e) {
      return `ERRO: ${e instanceof Error ? e.message : String(e)}`;
    }
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Diagnóstico de Projetos</h1>
            <p className="text-muted-foreground">Ambiente: <span className="font-bold">{ambiente}</span></p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects">Ver Projetos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects-raw">Ver Projetos Raw</Link>
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold">Carregando projetos...</p>
          </div>
        ) : isError ? (
          <div className="py-8 text-center bg-destructive/10 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Erro ao carregar projetos</h2>
            <p>{String(error)}</p>
          </div>
        ) : (
          <Tabs defaultValue="resumo">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="datas">Análise de Datas</TabsTrigger>
              <TabsTrigger value="data-raw">Dados Raw</TabsTrigger>
            </TabsList>
            
            <TabsContent value="resumo">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo da Resposta da API</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Formato</h3>
                      <p className="text-2xl font-bold">{diagnostico.isArray ? 'Array ✓' : 'Não é Array ✗'}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Total de Projetos</h3>
                      <p className="text-2xl font-bold">{diagnostico.totalProjetos}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Status de Datas</h3>
                      <p className="text-2xl font-bold">{diagnostico.temDatasValidas ? 'Válidas ✓' : 'Inválidas ✗'}</p>
                    </div>
                  </div>
                  
                  {diagnostico.problemasFiltros.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Problemas Detectados:</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {diagnostico.problemasFiltros.map((problema, index) => (
                          <li key={index} className="text-destructive">{problema}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="w-full">
                    <h3 className="font-medium mb-2">Teste Manual do Filtro</h3>
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      {testDateFilter()}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="datas">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Datas dos Projetos</CardTitle>
                </CardHeader>
                <CardContent>
                  {!diagnostico.primeiroProjeto ? (
                    <p className="text-center py-4">Nenhum projeto disponível para análise</p>
                  ) : !diagnostico.primeiroProjeto.creation_date ? (
                    <p className="text-center py-4 text-destructive">O campo creation_date não existe nos projetos!</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Data Original</h3>
                          <p className="font-mono text-sm">{String(diagnostico.detalheDatas.dataOriginal)}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Data Convertida</h3>
                          <p className="font-mono text-sm">{diagnostico.detalheDatas.dataConvertida}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Data Formatada</h3>
                          <p className="font-mono text-sm">{diagnostico.detalheDatas.dataFormatada}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Data válida?</h3>
                          <p className="text-xl font-bold">{diagnostico.detalheDatas.isValid ? 'Sim ✓' : 'Não ✗'}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">É recente (< 30 dias)?</h3>
                          <p className="text-xl font-bold">{diagnostico.detalheDatas.isRecent ? 'Sim ✓' : 'Não ✗'}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Dias de diferença</h3>
                          <p className="text-xl font-bold">{diagnostico.detalheDatas.diferenca}</p>
                        </div>
                      </div>
                      
                      <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-medium mb-2">Data Atual</h3>
                        <p className="font-mono text-sm">{diagnostico.detalheDatas.dataAtual}</p>
                      </div>
                      <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-medium mb-2">30 Dias Atrás</h3>
                        <p className="font-mono text-sm">{diagnostico.detalheDatas.trintaDiasAtras}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="data-raw">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Raw da API</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                    {JSON.stringify(projects, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}