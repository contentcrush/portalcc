import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle, 
  FileEdit, 
  PlusCircle, 
  File, 
  CircleDollarSign, 
  FileClock, 
  FolderOpen,
  MessageSquare,
  FileArchive,
  Users
} from "lucide-react";

interface ActivityEvent {
  id: string;
  type: string;
  objectType: string;
  objectId: number;
  title: string;
  description: string;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  link?: string;
}

function getActivityIcon(type: string, objectType: string) {
  // Map of [action]_[objectType] to icon
  const iconMap: Record<string, JSX.Element> = {
    'create_task': <PlusCircle className="h-4 w-4 text-green-500" />,
    'complete_task': <CheckCircle className="h-4 w-4 text-green-500" />,
    'update_task': <FileEdit className="h-4 w-4 text-amber-500" />,
    'create_project': <FolderOpen className="h-4 w-4 text-blue-500" />,
    'update_project': <FileEdit className="h-4 w-4 text-amber-500" />,
    'upload_file': <File className="h-4 w-4 text-indigo-500" />,
    'create_comment': <MessageSquare className="h-4 w-4 text-purple-500" />,
    'create_document': <CircleDollarSign className="h-4 w-4 text-green-500" />,
    'pay_document': <CheckCircle className="h-4 w-4 text-green-500" />,
    'create_expense': <CircleDollarSign className="h-4 w-4 text-red-500" />,
    'archive_project': <FileArchive className="h-4 w-4 text-gray-500" />,
    'create_client': <Users className="h-4 w-4 text-blue-500" />,
  };

  const key = `${type}_${objectType}`;
  return iconMap[key] || <FileClock className="h-4 w-4 text-gray-500" />;
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start space-x-4 pb-4">
      <Avatar className="h-8 w-8">
        <AvatarImage src={event.user.avatar} alt={event.user.name} />
        <AvatarFallback>{event.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center">
          <div className="mr-2">
            {getActivityIcon(event.type, event.objectType)}
          </div>
          <p className="text-sm font-medium">
            <span className="font-bold">{event.user.name}</span> {event.description}
          </p>
        </div>
        
        {event.title && (
          <Link href={event.link || '#'}>
            <p className="text-sm text-muted-foreground hover:text-primary cursor-pointer ml-6">
              {event.title}
            </p>
          </Link>
        )}
        
        <p className="text-xs text-muted-foreground ml-6">
          {formatDistanceToNow(event.timestamp, { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

export function RecentActivity() {
  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  const { data: taskComments = [] } = useQuery({ queryKey: ['/api/task-comments'] });
  const { data: projects = [] } = useQuery({ queryKey: ['/api/projects'] });
  const { data: projectComments = [] } = useQuery({ queryKey: ['/api/project-comments'] });
  const { data: documents = [] } = useQuery({ queryKey: ['/api/financial-documents'] });
  const { data: expenses = [] } = useQuery({ queryKey: ['/api/expenses'] });
  const { data: users = [] } = useQuery({ queryKey: ['/api/users'] });
  
  // Generate events from various data sources
  const events: ActivityEvent[] = [];
  
  // Add completed tasks
  tasks
    .filter(task => task.completed && task.completion_date)
    .forEach(task => {
      const user = users.find(u => u.id === task.assignee_id) || { id: 0, name: 'Sistema' };
      
      events.push({
        id: `task-complete-${task.id}`,
        type: 'complete',
        objectType: 'task',
        objectId: task.id,
        title: task.title,
        description: 'concluiu a tarefa',
        user,
        timestamp: new Date(task.completion_date),
        link: `/tasks/${task.id}`
      });
    });
  
  // Add task comments
  taskComments
    .filter(comment => comment.creation_date)
    .forEach(comment => {
      const task = tasks.find(t => t.id === comment.task_id);
      const user = users.find(u => u.id === comment.user_id) || { id: 0, name: 'Sistema' };
      
      if (task) {
        events.push({
          id: `task-comment-${comment.id}`,
          type: 'create',
          objectType: 'comment',
          objectId: comment.id,
          title: `Comentário em: ${task.title}`,
          description: 'comentou na tarefa',
          user,
          timestamp: new Date(comment.creation_date),
          link: `/tasks/${task.id}`
        });
      }
    });
  
  // Add project comments
  projectComments
    .filter(comment => comment.creation_date)
    .forEach(comment => {
      const project = projects.find(p => p.id === comment.project_id);
      const user = users.find(u => u.id === comment.user_id) || { id: 0, name: 'Sistema' };
      
      if (project) {
        events.push({
          id: `project-comment-${comment.id}`,
          type: 'create',
          objectType: 'comment',
          objectId: comment.id,
          title: `Comentário em: ${project.name}`,
          description: 'comentou no projeto',
          user,
          timestamp: new Date(comment.creation_date),
          link: `/projects/${project.id}`
        });
      }
    });
  
  // Add paid documents
  documents
    .filter(doc => doc.paid && doc.payment_date)
    .forEach(doc => {
      // Find user who marked it as paid (using system as fallback)
      const user = { id: 0, name: 'Sistema' };
      
      events.push({
        id: `document-paid-${doc.id}`,
        type: 'pay',
        objectType: 'document',
        objectId: doc.id,
        title: doc.description || `Documento #${doc.id}`,
        description: 'registrou pagamento de documento',
        user,
        timestamp: new Date(doc.payment_date),
        link: `/financial?document=${doc.id}`
      });
    });
  
  // Sort events by timestamp, descending
  const sortedEvents = events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10); // Only show 10 most recent events

  return (
    <DashboardCard title="Atividade recente" description="Log dos últimos 10 eventos">
      <div className="mt-4 space-y-2">
        {sortedEvents.length > 0 ? (
          sortedEvents.map(event => (
            <ActivityItem key={event.id} event={event} />
          ))
        ) : (
          <div className="text-center py-6">
            <FileClock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma atividade recente</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}