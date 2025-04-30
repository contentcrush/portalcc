import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, isTaskOverdue, truncateText } from "@/lib/utils";
import { Clock, MoreVertical, Edit, Eye, Trash2, CalendarDays } from "lucide-react";
import { Task } from "@/lib/types";
import ClientAvatar from "./ClientAvatar";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { Button } from "@/components/ui/button";

interface TaskCardProps {
  task: Task;
  onToggleComplete: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}

export function TaskCard({ 
  task, 
  onToggleComplete, 
  onView, 
  onEdit, 
  onDelete,
  compact = false 
}: TaskCardProps) {
  const [isChecked, setIsChecked] = useState(task.completed);
  
  // Get project data for the task
  const { data: project } = useQuery({
    queryKey: ['/api/projects', task.project_id],
    enabled: !!task.project_id,
  });
  
  // Get user data for the assigned user
  const { data: assignedUser } = useQuery({
    queryKey: ['/api/users', task.assigned_to],
    enabled: !!task.assigned_to,
  });
  
  // Get client data via project
  const { data: client } = useQuery({
    queryKey: ['/api/clients', project?.client_id],
    enabled: !!project?.client_id,
  });
  
  const handleCheck = (checked: boolean) => {
    setIsChecked(checked);
    onToggleComplete();
  };
  
  const taskIsOverdue = isTaskOverdue(task);
  
  if (compact) {
    return (
      <Card className={`border-l-4 ${taskIsOverdue ? 'border-l-red-600' : task.completed ? 'border-l-green-600' : 'border-l-blue-600'}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <Checkbox 
                checked={isChecked} 
                onCheckedChange={handleCheck}
                className="mt-1"
              />
              <div>
                <div className="font-medium line-clamp-1">{task.title}</div>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  {project && (
                    <span className="flex items-center">
                      {project?.client_id && <ClientAvatar client_id={project.client_id} size="xs" className="mr-1" />}
                      {truncateText(project.name, 15)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <PriorityBadge priority={task.priority} size="sm" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Apagar tarefa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-1">
            <StatusBadge status={task.status || 'pendente'} small={true} />
            {task.due_date && (
              <Badge variant={taskIsOverdue ? "destructive" : "outline"} className="text-xs">
                <CalendarDays className="h-3 w-3 mr-1" />
                {formatDate(task.due_date)}
              </Badge>
            )}
            {task.estimated_hours && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {task.estimated_hours}h
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`border-l-4 ${taskIsOverdue ? 'border-l-red-600' : task.completed ? 'border-l-green-600' : 'border-l-blue-600'}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox 
            checked={isChecked} 
            onCheckedChange={handleCheck}
            className="mt-1"
          />
          
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="font-medium line-clamp-1">{task.title}</h4>
              <div className="flex items-center space-x-1">
                <PriorityBadge priority={task.priority} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-muted">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onView}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Apagar tarefa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={task.status || 'pendente'} />
              
              {project && (
                <Badge variant="outline" className="flex items-center">
                  {project?.client_id && <ClientAvatar client_id={project.client_id} size="xs" className="mr-1" />}
                  {truncateText(project.name, 20)}
                </Badge>
              )}
              
              {assignedUser && assignedUser.name && (
                <Badge variant="secondary" className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] mr-1">
                    {assignedUser.name.substring(0, 2)}
                  </div>
                  {truncateText(assignedUser.name, 15)}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {task.due_date && (
                <Badge variant={taskIsOverdue ? "destructive" : "outline"} className="flex items-center">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {formatDate(task.due_date)}
                </Badge>
              )}
              
              {task.estimated_hours && (
                <Badge variant="outline" className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="mr-1">Estimativa:</span>
                  {task.estimated_hours}h
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}