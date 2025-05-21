import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectsDebug() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState<string>("");
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        
        // Registrar o ambiente para diagnóstico
        const currentHost = window.location.hostname;
        setHostname(currentHost);
        console.log(`DEBUG: Buscando projetos no host: ${currentHost}`);
        
        // Usar fetch diretamente sem o react-query para diagnóstico
        const response = await fetch("/api/projects", {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });
        
        // Registrar informações da resposta
        console.log(`DEBUG: Status da resposta: ${response.status}`);
        console.log(`DEBUG: Headers:`, response.headers.get('content-type'));
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Erro ${response.status}: ${text}`);
        }
        
        const data = await response.json();
        console.log(`DEBUG: Projetos recebidos:`, data);
        console.log(`DEBUG: Número de projetos: ${Array.isArray(data) ? data.length : 'Não é um array'}`);
        
        setProjects(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("DEBUG: Erro ao buscar projetos:", err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar projetos');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Página de Diagnóstico de Projetos</h1>
        <Link href="/projects">
          <Button variant="outline">Voltar para Projetos</Button>
        </Link>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações de Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Hostname:</strong> {hostname}</p>
            <p><strong>Status:</strong> {loading ? "Carregando..." : error ? "Erro" : "Sucesso"}</p>
            <p><strong>Total de projetos:</strong> {projects.length}</p>
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
                <h3 className="font-semibold">Erro:</h3>
                <p>{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="col-span-full text-center">Carregando projetos...</p>
        ) : projects.length === 0 ? (
          <p className="col-span-full text-center">
            {error ? "Erro ao carregar projetos" : "Nenhum projeto encontrado"}
          </p>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 p-4">
                <CardTitle className="text-lg">{project.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <p><strong>ID:</strong> {project.id}</p>
                  <p><strong>Cliente ID:</strong> {project.client_id}</p>
                  <p><strong>Status:</strong> {project.status}</p>
                  <p><strong>Descrição:</strong> {project.description || "Sem descrição"}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <div className="mt-8 p-4 bg-slate-50 rounded-md">
        <h2 className="text-xl font-semibold mb-4">Log de Dados Brutos:</h2>
        <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-96 text-xs">
          {JSON.stringify(projects, null, 2)}
        </pre>
      </div>
    </div>
  );
}