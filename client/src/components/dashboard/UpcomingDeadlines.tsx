import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isBefore, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CalendarClock, ArrowUpRight } from "lucide-react";

export function UpcomingDeadlines() {
  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: projects = [] } = useQuery({ queryKey: ['/api/projects'] });
  const { data: financialDocuments = [] } = useQuery({ queryKey: ['/api/financial-documents'] });

  const today = new Date();
  const nextWeek = addDays(today, 7);
  
  // Combine tasks and project deadlines
  const deadlines = [
    // Tasks with due dates
    ...tasks
      .filter(task => !task.completed && task.due_date)
      .map(task => ({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        date: new Date(task.due_date),
        priority: task.priority || 'media',
        entityId: task.id,
        projectId: task.project_id,
        projectName: ''
      })),
    
    // Projects with deadlines
    ...projects
      .filter(project => project.deadline && project.status !== 'concluido' && project.status !== 'cancelado')
      .map(project => ({
        id: `project-${project.id}`,
        type: 'project',
        title: project.name,
        date: new Date(project.deadline),
        priority: project.priority || 'media',
        entityId: project.id,
        projectId: project.id,
        projectName: ''
      })),
      
    // Financial documents with due dates
    ...financialDocuments
      .filter(doc => doc.due_date && !doc.paid)
      .map(doc => ({
        id: `finance-${doc.id}`,
        type: 'financial',
        title: doc.description || `Documento #${doc.id}`,
        date: new Date(doc.due_date),
        priority: isBefore(new Date(doc.due_date), today) ? 'alta' : 'media',
        entityId: doc.id,
        projectId: doc.project_id,
        projectName: ''
      }))
  ];

  // Fill in project names
  deadlines.forEach(deadline => {
    if (deadline.projectId) {
      const project = projects.find(p => p.id === deadline.projectId);
      if (project) {
        deadline.projectName = project.name;
      }
    }
  });

  // Filter to upcoming deadlines (next 7 days) and sort by date
  const upcomingDeadlines = deadlines
    .filter(d => d.date && isBefore(d.date, nextWeek))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  // Define badge colors by priority
  const priorityColors = {
    baixa: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    media: "bg-amber-100 text-amber-800 hover:bg-amber-200",
    alta: "bg-orange-100 text-orange-800 hover:bg-orange-200",
    critica: "bg-red-100 text-red-800 hover:bg-red-200"
  };

  return (
    <DashboardCard 
      title="Prazos próximos" 
      description="Lista de 5 próximos deadlines (tarefas ou entregas)"
    >
      <div className="mt-2 space-y-3">
        {upcomingDeadlines.length > 0 ? (
          upcomingDeadlines.map((deadline) => {
            const isLate = isBefore(deadline.date, today);
            
            // Determine which page to link to
            let linkTo = '';
            if (deadline.type === 'task') {
              linkTo = `/tasks/${deadline.entityId}`;
            } else if (deadline.type === 'project') {
              linkTo = `/projects/${deadline.entityId}`;
            } else if (deadline.type === 'financial') {
              linkTo = `/financial?document=${deadline.entityId}`;
            }

            return (
              <div key={deadline.id} className="flex items-center justify-between group">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    {isLate ? (
                      <Badge variant="destructive" className="flex items-center gap-1 px-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Atrasado</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`${priorityColors[deadline.priority]} px-1.5`}>
                        {deadline.date && format(deadline.date, 'dd/MM')}
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="capitalize px-1.5">
                      {deadline.priority}
                    </Badge>
                  </div>
                  
                  <Link href={linkTo}>
                    <h3 className="font-medium text-sm mt-1 hover:text-primary cursor-pointer group-hover:underline">
                      {deadline.title}
                    </h3>
                  </Link>
                  
                  {deadline.projectName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {deadline.projectName}
                    </p>
                  )}
                </div>
                
                <Link href={linkTo}>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <CalendarClock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Não há prazos para os próximos 7 dias</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}