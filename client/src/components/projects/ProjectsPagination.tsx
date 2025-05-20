import { useState } from 'react';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ProjectCard } from '@/components/ProjectCard';

type ProjectFilters = {
  clientId?: number;
  status?: string;
  search?: string;
};

type PaginatedResponse = {
  data: Project[];
  total: number;
  page: number;
  totalPages: number;
};

export function ProjectsPagination() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // Função para atualizar os filtros
  const applySearch = () => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPage(1); // Resetar para a primeira página quando filtrar
  };
  
  const clearSearch = () => {
    setSearchTerm('');
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters.search;
      return newFilters;
    });
    setPage(1);
  };

  // Construir query parameters para a API
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', pageSize.toString());
  queryParams.append('includeRelations', 'true');
  
  if (filters.clientId) {
    queryParams.append('clientId', filters.clientId.toString());
  }
  
  if (filters.status) {
    queryParams.append('status', filters.status);
  }
  
  if (filters.search) {
    queryParams.append('search', filters.search);
  }

  const { data, isLoading, isError } = useQuery<PaginatedResponse>({
    queryKey: ['/api/projects', page, pageSize, filters],
    queryFn: async () => {
      const response = await fetch(`/api/projects?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar projetos');
      }
      return response.json();
    }
  });

  // Query para obter lista de clientes para o filtro
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
      }
      return response.json();
    }
  });

  // Função para gerar links de paginação
  const generatePaginationLinks = () => {
    if (!data || data.totalPages <= 1) return null;
    
    const maxPages = 5; // Número máximo de links a mostrar
    const halfMaxPages = Math.floor(maxPages / 2);
    
    let startPage = Math.max(1, data.page - halfMaxPages);
    let endPage = Math.min(data.totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    const pages = [];
    
    // Adicionar link para a primeira página se necessário
    if (startPage > 1) {
      pages.push(
        <PaginationItem key="first">
          <PaginationLink 
            onClick={() => setPage(1)}
            isActive={data.page === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      if (startPage > 2) {
        pages.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }
    
    // Adicionar links para as páginas intermediárias
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => setPage(i)}
            isActive={data.page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Adicionar link para a última página se necessário
    if (endPage < data.totalPages) {
      if (endPage < data.totalPages - 1) {
        pages.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      pages.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => setPage(data.totalPages)}
            isActive={data.page === data.totalPages}
          >
            {data.totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return pages;
  };

  const handleStatusChange = (value: string) => {
    if (value === "all") {
      const newFilters = { ...filters };
      delete newFilters.status;
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, status: value });
    }
    setPage(1);
  };

  const handleClientChange = (value: string) => {
    if (value === "all") {
      const newFilters = { ...filters };
      delete newFilters.clientId;
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, clientId: parseInt(value) });
    }
    setPage(1);
  };

  // Função para invalidar o cache ao adicionar/editar um projeto
  const invalidateProjects = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    toast({
      title: "Projetos atualizados",
      description: "A lista de projetos foi atualizada com sucesso.",
      variant: "success"
    });
  };

  // Provedores de status para filtros
  const statusOptions = [
    { value: "pre_producao", label: "Pré-Produção" },
    { value: "producao", label: "Produção" },
    { value: "pos_producao", label: "Pós-Produção" },
    { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
    { value: "proposta", label: "Proposta" },
    { value: "proposta_aceita", label: "Proposta Aceita" },
    { value: "concluido", label: "Concluído" },
    { value: "cancelado", label: "Cancelado" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <div className="flex-1"></div>
        
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Input
                placeholder="Pesquisar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applySearch();
                  }
                }}
                className="pr-8"
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={applySearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Select onValueChange={handleStatusChange} defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleClientChange} defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {clients?.map((client: any) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={pageSize.toString()} 
            onValueChange={(value) => {
              setPageSize(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="20">20 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Estado de erro */}
      {isError && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <p className="text-red-500 mb-2">Erro ao carregar projetos</p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects', page, pageSize, filters] })}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Mostra total de resultados */}
      {data && !isLoading && (
        <div className="text-sm text-muted-foreground">
          Mostrando {data.data.length} de {data.total} projetos
          {Object.keys(filters).length > 0 && " (filtrados)"}
        </div>
      )}

      {/* Lista de projetos */}
      {data && !isLoading && data.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project}
              onUpdate={invalidateProjects}
            />
          ))}
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {data && !isLoading && data.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">Nenhum projeto encontrado com os filtros selecionados</p>
          {Object.keys(filters).length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters({});
                setSearchTerm('');
                setPage(1);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Paginação */}
      {data && data.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setPage(Math.max(1, page - 1))}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {generatePaginationLinks()}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                className={page >= data.totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}