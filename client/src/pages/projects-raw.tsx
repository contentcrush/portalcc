import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";

export default function ProjectsRaw() {
  const [location, setLocation] = useLocation();
  
  // Buscar projetos diretamente da API
  const { data: projects, isLoading, isError, error } = useQuery({
    queryKey: ['/api/projects'],
    retry: 2
  });
  
  // Estado para armazenar diagnóstico
  const [diagnostico, setDiagnostico] = useState<any>({
    ambiente: window.location.hostname.includes('.replit.app') ? 'Deployed' : 'Sandbox',
    hostname: window.location.hostname,
    dataHora: new Date().toString(),
    temProjetos: false,
    numeroProjetos: 0
  });

  // Atualiza diagnóstico quando os projetos forem carregados
  useEffect(() => {
    if (projects) {
      setDiagnostico((prev: any) => ({
        ...prev,
        temProjetos: Array.isArray(projects) && projects.length > 0,
        numeroProjetos: Array.isArray(projects) ? projects.length : 'não é array',
        primeiroProjeto: Array.isArray(projects) && projects.length > 0 ? projects[0].id : 'nenhum'
      }));
    }
  }, [projects]);

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Visualização Simplificada de Projetos</h1>
            <p className="text-muted-foreground">Modo de diagnóstico para detectar problemas entre ambientes</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href="/projects">Voltar para Projetos</Link>
            </Button>
            <Button onClick={() => window.location.reload()}>
              Recarregar Página
            </Button>
          </div>
        </div>
        
        {/* Card de diagnóstico */}
        <Card className="mb-8 bg-muted/50">
          <CardHeader>
            <CardTitle>Informações de Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold">Ambiente</h3>
                <p className="text-lg">{diagnostico.ambiente}</p>
              </div>
              <div>
                <h3 className="font-semibold">Hostname</h3>
                <p className="text-sm break-all">{diagnostico.hostname}</p>
              </div>
              <div>
                <h3 className="font-semibold">Data/Hora</h3>
                <p className="text-sm">{diagnostico.dataHora}</p>
              </div>
              <div>
                <h3 className="font-semibold">Tem Projetos?</h3>
                <p className="text-lg font-bold">{String(diagnostico.temProjetos)}</p>
              </div>
              <div>
                <h3 className="font-semibold">Quantidade</h3>
                <p className="text-lg font-bold">{diagnostico.numeroProjetos}</p>
              </div>
              <div>
                <h3 className="font-semibold">Primeiro Projeto ID</h3>
                <p>{diagnostico.primeiroProjeto}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Estado de carregamento */}
        {isLoading && (
          <div className="py-8 text-center">
            <p className="text-lg">Carregando projetos...</p>
          </div>
        )}
        
        {/* Erro */}
        {isError && (
          <div className="py-8 text-center bg-destructive/10 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Erro ao carregar projetos</h2>
            <p>{String(error)}</p>
          </div>
        )}
        
        {/* Lista de projetos sem filtragem */}
        {!isLoading && !isError && Array.isArray(projects) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="bg-primary/5 py-3">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <p><strong>ID:</strong> {project.id}</p>
                    <p><strong>Status:</strong> {project.status}</p>
                    <p><strong>Cliente ID:</strong> {project.client_id}</p>
                    {project.creation_date && (
                      <p><strong>Criado em:</strong> {new Date(project.creation_date).toLocaleString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Quando não há projetos */}
        {!isLoading && !isError && (!Array.isArray(projects) || projects.length === 0) && (
          <div className="py-8 text-center bg-muted rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Nenhum projeto encontrado</h2>
            <p>A API retornou uma resposta vazia ou sem projetos.</p>
            {!Array.isArray(projects) && (
              <div className="mt-4 p-2 bg-muted/50 rounded">
                <p className="font-mono text-xs">
                  Tipo de dados retornado: {typeof projects}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}