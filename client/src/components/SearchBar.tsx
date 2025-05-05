import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ProjectorIcon, CheckCircle, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: open
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: open
  });

  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    enabled: open
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (value: string) => {
    setOpen(false);
    navigate(value);
  };

  // Filter results based on search query
  const filteredProjects = Array.isArray(projects) ? projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];
  
  const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];
  
  const filteredClients = Array.isArray(clients) ? clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <>
      <div 
        className="flex items-center h-9 rounded-md border border-input px-4 py-2 bg-background cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Buscar projetos, clientes ou tarefas...</span>
        <div className="ml-auto hidden md:flex items-center text-xs text-muted-foreground">
          <kbd className="ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Digite para buscar..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          <CommandGroup heading="Projetos">
            {filteredProjects?.slice(0, 5).map((project) => (
              <CommandItem 
                key={`project-${project.id}`}
                value={`/projects/${project.id}`}
                onSelect={handleSelect}
              >
                <ProjectorIcon className="mr-2 h-4 w-4" />
                <span>{project.name}</span>
              </CommandItem>
            ))}
            {filteredProjects?.length > 5 && (
              <CommandItem
                value="/projects"
                onSelect={handleSelect}
              >
                <span className="text-muted-foreground text-sm">
                  Ver todos os projetos...
                </span>
              </CommandItem>
            )}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Tarefas">
            {filteredTasks?.slice(0, 5).map((task) => (
              <CommandItem 
                key={`task-${task.id}`}
                value={`/tasks?id=${task.id}`}
                onSelect={handleSelect}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>{task.title}</span>
              </CommandItem>
            ))}
            {filteredTasks?.length > 5 && (
              <CommandItem
                value="/tasks"
                onSelect={handleSelect}
              >
                <span className="text-muted-foreground text-sm">
                  Ver todas as tarefas...
                </span>
              </CommandItem>
            )}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Clientes">
            {filteredClients?.slice(0, 5).map((client) => (
              <CommandItem 
                key={`client-${client.id}`}
                value={`/clients/${client.id}`}
                onSelect={handleSelect}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{client.name}</span>
              </CommandItem>
            ))}
            {filteredClients?.length > 5 && (
              <CommandItem
                value="/clients"
                onSelect={handleSelect}
              >
                <span className="text-muted-foreground text-sm">
                  Ver todos os clientes...
                </span>
              </CommandItem>
            )}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Páginas">
            <CommandItem value="/dashboard" onSelect={handleSelect}>
              <div className="mr-2 h-4 w-4 flex items-center justify-center">📊</div>
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem value="/projects" onSelect={handleSelect}>
              <ProjectorIcon className="mr-2 h-4 w-4" />
              <span>Projetos</span>
            </CommandItem>
            <CommandItem value="/tasks" onSelect={handleSelect}>
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Tarefas</span>
            </CommandItem>
            <CommandItem value="/clients" onSelect={handleSelect}>
              <Users className="mr-2 h-4 w-4" />
              <span>Clientes</span>
            </CommandItem>
            <CommandItem value="/calendar" onSelect={handleSelect}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendário</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
