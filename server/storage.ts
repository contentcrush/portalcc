import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, clients, projects, projectMembers, projectStages, tasks,
  taskComments, taskAttachments, clientInteractions, financialDocuments,
  expenses, events, refreshTokens,
  type User, type Client, type Project, type ProjectMember, type ProjectStage, 
  type Task, type TaskComment, type TaskAttachment, type ClientInteraction,
  type FinancialDocument, type Expense, type Event, 
  type InsertUser, type InsertClient, type InsertProject, type InsertProjectMember,
  type InsertProjectStage, type InsertTask, type InsertTaskComment, type InsertTaskAttachment,
  type InsertClientInteraction, type InsertFinancialDocument, type InsertExpense, type InsertEvent
} from "../shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsers(): Promise<User[]>;
  
  // Clients
  getClient(id: number): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  getProjectsByClient(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  duplicateProject(id: number): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Project Members
  getProjectMembers(projectId: number): Promise<ProjectMember[]>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  removeProjectMember(projectId: number, userId: number): Promise<boolean>;
  
  // Project Stages
  getProjectStages(projectId: number): Promise<ProjectStage[]>;
  createProjectStage(stage: InsertProjectStage): Promise<ProjectStage>;
  updateProjectStage(id: number, stage: Partial<InsertProjectStage>): Promise<ProjectStage | undefined>;
  deleteProjectStage(id: number): Promise<boolean>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasks(): Promise<Task[]>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByUser(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Task Comments
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  deleteTaskComment(id: number): Promise<boolean>;
  
  // Task Attachments
  getTaskAttachments(taskId: number): Promise<TaskAttachment[]>;
  createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment>;
  deleteTaskAttachment(id: number): Promise<boolean>;
  
  // Client Interactions
  getClientInteractions(clientId: number): Promise<ClientInteraction[]>;
  createClientInteraction(interaction: InsertClientInteraction): Promise<ClientInteraction>;
  deleteClientInteraction(id: number): Promise<boolean>;
  
  // Financial Documents
  getFinancialDocument(id: number): Promise<FinancialDocument | undefined>;
  getFinancialDocuments(): Promise<FinancialDocument[]>;
  getFinancialDocumentsByClient(clientId: number): Promise<FinancialDocument[]>;
  getFinancialDocumentsByProject(projectId: number): Promise<FinancialDocument[]>;
  createFinancialDocument(document: InsertFinancialDocument): Promise<FinancialDocument>;
  updateFinancialDocument(id: number, document: Partial<InsertFinancialDocument>): Promise<FinancialDocument | undefined>;
  deleteFinancialDocument(id: number): Promise<boolean>;
  
  // Expenses
  getExpense(id: number): Promise<Expense | undefined>;
  getExpenses(): Promise<Expense[]>;
  getExpensesByProject(projectId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Events
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(): Promise<Event[]>;
  getEventsByUser(userId: number): Promise<Event[]>;
  getEventsByProject(projectId: number): Promise<Event[]>;
  getEventsByClient(clientId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private clientsData: Map<number, Client>;
  private projectsData: Map<number, Project>;
  private projectMembersData: Map<number, ProjectMember>;
  private projectStagesData: Map<number, ProjectStage>;
  private tasksData: Map<number, Task>;
  private taskCommentsData: Map<number, TaskComment>;
  private taskAttachmentsData: Map<number, TaskAttachment>;
  private clientInteractionsData: Map<number, ClientInteraction>;
  private financialDocumentsData: Map<number, FinancialDocument>;
  private expensesData: Map<number, Expense>;
  private eventsData: Map<number, Event>;
  
  private userId: number = 1;
  private clientId: number = 1;
  private projectId: number = 1;
  private projectMemberId: number = 1;
  private projectStageId: number = 1;
  private taskId: number = 1;
  private taskCommentId: number = 1;
  private taskAttachmentId: number = 1;
  private clientInteractionId: number = 1;
  private financialDocumentId: number = 1;
  private expenseId: number = 1;
  private eventId: number = 1;

  constructor() {
    this.usersData = new Map();
    this.clientsData = new Map();
    this.projectsData = new Map();
    this.projectMembersData = new Map();
    this.projectStagesData = new Map();
    this.tasksData = new Map();
    this.taskCommentsData = new Map();
    this.taskAttachmentsData = new Map();
    this.clientInteractionsData = new Map();
    this.financialDocumentsData = new Map();
    this.expensesData = new Map();
    this.eventsData = new Map();

    // Add some initial data
    this.seedData();
  }

  private seedData() {
    // Create users
    const user1 = this.createUser({
      username: "bruno.silva",
      password: "password",
      name: "Bruno Silva",
      email: "bruno.silva@contentcrush.com",
      role: "director",
      department: "Production",
      position: "Director of Production",
      bio: "Director of production with more than 10 years of experience in audiovisual projects for national and international brands.",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      phone: "(11) 98765-4321"
    });

    const user2 = this.createUser({
      username: "ana.oliveira",
      password: "password",
      name: "Ana Oliveira",
      email: "ana.oliveira@contentcrush.com",
      role: "editor",
      department: "Post-production",
      position: "Editor",
      bio: "Video editor specialized in advertising and institutional content.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      phone: "(11) 98765-1234"
    });

    const user3 = this.createUser({
      username: "carlos.mendes",
      password: "password",
      name: "Carlos Mendes",
      email: "carlos.mendes@contentcrush.com",
      role: "photographer",
      department: "Production",
      position: "Photographer",
      bio: "Photographer with expertise in corporate photography.",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg",
      phone: "(11) 91234-5678"
    });

    // Create clients
    const client1 = this.createClient({
      name: "Banco Azul",
      shortName: "BA",
      type: "Corporate",
      category: "Premium",
      cnpj: "12.345.678/0001-90",
      website: "www.bancoazul.com.br",
      contactName: "Ricardo Mendes",
      contactPosition: "Marketing Manager",
      contactEmail: "ricardo.mendes@bancoazul.com.br",
      contactPhone: "(11) 98765-4321",
      address: "Av. Paulista, 1000 - São Paulo",
      city: "São Paulo",
      since: new Date("2023-01-01"),
      notes: "High priority client. Prefers quick communication. Has budget for several premium projects."
    });

    const client2 = this.createClient({
      name: "Tech Courses Inc.",
      shortName: "TC",
      type: "Education",
      category: "Standard",
      cnpj: "98.765.432/0001-10",
      website: "www.techcourses.com",
      contactName: "Mariana Santos",
      contactPosition: "Content Director",
      contactEmail: "mariana@techcourses.com",
      contactPhone: "(11) 97654-3210",
      address: "Rua Augusta, 500 - São Paulo",
      city: "São Paulo",
      since: new Date("2024-01-15"),
      notes: ""
    });

    const client3 = this.createClient({
      name: "Eco Preserve",
      shortName: "EP",
      type: "NGO",
      category: "Standard",
      cnpj: "45.678.901/0001-23",
      website: "www.ecopreserve.org.br",
      contactName: "Paulo Andrade",
      contactPosition: "Communications Director",
      contactEmail: "paulo@ecopreserve.org.br",
      contactPhone: "(11) 92345-6789",
      address: "Av. Rebouças, 200 - São Paulo",
      city: "São Paulo",
      since: new Date("2023-09-10"),
      notes: "Focus on environmental documentation."
    });

    // Create projects
    const project1 = this.createProject({
      name: "Comercial Banco Azul",
      description: "Campanha institucional para o Banco Azul com foco em segurança digital.",
      client_id: client1.id,
      status: "em_andamento",
      budget: 34000,
      startDate: new Date("2025-03-15"),
      endDate: new Date("2025-04-28"),
      progress: 65,
      thumbnail: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    });

    const project2 = this.createProject({
      name: "Documentário Natureza",
      description: "Documentário sobre preservação ambiental e espécies ameaçadas da Mata Atlântica.",
      client_id: client3.id,
      status: "em_producao",
      budget: 28750,
      startDate: new Date("2025-02-20"),
      endDate: new Date("2025-06-10"),
      progress: 30,
      thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    });

    const project3 = this.createProject({
      name: "Curso Online Tech",
      description: "Série de vídeos educacionais sobre programação e desenvolvimento web.",
      client_id: client2.id,
      status: "pre_producao",
      budget: 12500,
      startDate: new Date("2025-04-05"),
      endDate: new Date("2025-05-20"),
      progress: 15,
      thumbnail: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    });

    // Add project members
    this.addProjectMember({
      project_id: project1.id,
      user_id: user1.id,
      role: "director"
    });

    this.addProjectMember({
      project_id: project1.id,
      user_id: user2.id,
      role: "editor"
    });

    this.addProjectMember({
      project_id: project1.id,
      user_id: user3.id,
      role: "photographer"
    });

    this.addProjectMember({
      project_id: project2.id,
      user_id: user1.id,
      role: "director"
    });

    this.addProjectMember({
      project_id: project2.id,
      user_id: user2.id,
      role: "editor"
    });

    this.addProjectMember({
      project_id: project3.id,
      user_id: user2.id,
      role: "editor"
    });

    this.addProjectMember({
      project_id: project3.id,
      user_id: user3.id,
      role: "photographer"
    });

    // Add project stages
    this.createProjectStage({
      project_id: project1.id,
      name: "Pré-produção",
      description: "Planejamento, storyboard, roteiro",
      order: 1,
      completed: true,
      completion_date: new Date("2025-03-25")
    });

    this.createProjectStage({
      project_id: project1.id,
      name: "Produção",
      description: "Gravação, captação de material",
      order: 2,
      completed: false
    });

    this.createProjectStage({
      project_id: project1.id,
      name: "Pós-produção",
      description: "Edição, finalização",
      order: 3,
      completed: false
    });

    // Create tasks
    this.createTask({
      title: "Finalizar edição do teaser - Banco Azul",
      description: "Revisar cortes, ajustar cores e finalizar áudio para aprovação do cliente",
      project_id: project1.id,
      assigned_to: user2.id,
      status: "em_andamento",
      priority: "alta",
      due_date: new Date("2025-04-14"),
      start_date: new Date("2025-04-08"),
      estimated_hours: 4,
      completed: false
    });

    this.createTask({
      title: "Aprovar storyboard - Documentário Natureza",
      description: "Reunião com cliente para aprovação do storyboard final e cronograma de filmagens",
      project_id: project2.id,
      assigned_to: user1.id,
      status: "pendente",
      priority: "alta",
      due_date: new Date("2025-04-15"),
      start_date: new Date("2025-04-12"),
      estimated_hours: 2,
      completed: false
    });

    this.createTask({
      title: "Reunião de pré-produção - Curso Online Tech",
      description: "Definir locações, equipamentos e cronograma de gravação com a equipe",
      project_id: project3.id,
      assigned_to: user1.id,
      status: "pendente",
      priority: "baixa",
      due_date: new Date("2025-04-18"),
      start_date: new Date("2025-04-17"),
      estimated_hours: 1.5,
      completed: false
    });

    this.createTask({
      title: "Revisar orçamento - Projeto Marca X",
      description: "Ajustar orçamento de equipamentos e equipe para apresentação ao cliente",
      project_id: null,
      assigned_to: user1.id,
      status: "pendente",
      priority: "media",
      due_date: new Date("2025-04-15"),
      start_date: new Date("2025-04-13"),
      estimated_hours: 3,
      completed: false
    });

    this.createTask({
      title: "Roteiro inicial - Curso Online Tech",
      description: "Elaborar primeiro rascunho do roteiro para aprovação interna",
      project_id: project3.id,
      assigned_to: user1.id,
      status: "concluida",
      priority: "media",
      due_date: new Date("2025-04-10"),
      start_date: new Date("2025-04-05"),
      estimated_hours: 5,
      completed: true,
      completion_date: new Date("2025-04-10")
    });

    this.createTask({
      title: "Booking de equipamentos - Banco Azul",
      description: "Reservar câmeras, iluminação e equipamentos de áudio para as filmagens",
      project_id: project1.id,
      assigned_to: user3.id,
      status: "concluida",
      priority: "media",
      due_date: new Date("2025-04-06"),
      start_date: new Date("2025-04-04"),
      estimated_hours: 2,
      completed: true,
      completion_date: new Date("2025-04-05")
    });

    // Create events
    this.createEvent({
      title: "Reunião de Equipe",
      description: "Reunião semanal da equipe de produção",
      user_id: user1.id,
      project_id: null,
      client_id: null,
      task_id: null,
      type: "reuniao",
      start_date: new Date("2025-04-11T10:00:00"),
      end_date: new Date("2025-04-11T11:30:00"),
      all_day: false,
      location: "Sala de Reuniões",
      color: "#3B82F6"
    });

    this.createEvent({
      title: "Gravação - Banco Azul",
      description: "Gravação do comercial para o Banco Azul",
      user_id: user1.id,
      project_id: project1.id,
      client_id: client1.id,
      task_id: null,
      type: "gravacao",
      start_date: new Date("2025-04-13T09:30:00"),
      end_date: new Date("2025-04-13T15:00:00"),
      all_day: false,
      location: "Estúdio Principal",
      color: "#F59E0B"
    });

    this.createEvent({
      title: "Reunião de Cliente",
      description: "Reunião com o time de marketing do Banco Azul",
      user_id: user1.id,
      project_id: project1.id,
      client_id: client1.id,
      task_id: null,
      type: "reuniao",
      start_date: new Date("2025-04-12T13:00:00"),
      end_date: new Date("2025-04-12T14:45:00"),
      all_day: false,
      location: "Sala de Reuniões",
      color: "#10B981"
    });

    this.createEvent({
      title: "Edição Final - Marca X",
      description: "Finalização da edição do vídeo para Marca X",
      user_id: user2.id,
      project_id: null,
      client_id: null,
      task_id: null,
      type: "edicao",
      start_date: new Date("2025-04-12T12:00:00"),
      end_date: new Date("2025-04-12T15:00:00"),
      all_day: false,
      location: "Sala de Edição 2",
      color: "#EF4444"
    });

    this.createEvent({
      title: "Entrega - Tech Courses",
      description: "Entrega do arquivo final da aula introdutória",
      user_id: user2.id,
      project_id: project3.id,
      client_id: client2.id,
      task_id: null,
      type: "entrega",
      start_date: new Date("2025-04-12T15:30:00"),
      end_date: new Date("2025-04-12T16:30:00"),
      all_day: false,
      location: null,
      color: "#6366F1"
    });

    this.createEvent({
      title: "Reunião - Marca X",
      description: "Apresentação de proposta criativa",
      user_id: user1.id,
      project_id: null,
      client_id: null,
      task_id: null,
      type: "reuniao",
      start_date: new Date("2025-04-15T14:00:00"),
      end_date: new Date("2025-04-15T15:30:00"),
      all_day: false,
      location: "Virtual",
      color: "#8B5CF6"
    });

    // Create financial documents
    this.createFinancialDocument({
      project_id: 1,
      client_id: 1,
      document_type: "invoice",
      document_number: "F2025-0103",
      amount: 24000,
      due_date: new Date("2025-04-15"),
      paid: true,
      payment_date: new Date("2025-04-02"),
      status: "pago"
    });

    this.createFinancialDocument({
      project_id: 1,
      client_id: 1,
      document_type: "contract",
      document_number: "F2025-BA-02",
      amount: 32000,
      due_date: new Date("2025-05-03"),
      paid: false,
      status: "assinado"
    });

    this.createFinancialDocument({
      project_id: 3,
      client_id: 2,
      document_type: "proposal",
      document_number: "F2025-0025",
      amount: 18000,
      due_date: new Date("2025-04-15"),
      paid: false,
      status: "aprovado"
    });

    // Create expenses
    this.createExpense({
      project_id: 1,
      category: "equipment",
      description: "Aluguel de cameras e equipamentos de iluminação",
      amount: 3500,
      date: new Date("2025-04-05"),
      paid_by: 1,
      receipt: "receipt-equip-001.pdf"
    });

    this.createExpense({
      project_id: 2,
      category: "travel",
      description: "Deslocamento para locações de filmagem",
      amount: 1200,
      date: new Date("2025-04-02"),
      paid_by: 1,
      receipt: "receipt-travel-001.pdf"
    });

    this.createExpense({
      project_id: 3,
      category: "software",
      description: "Licença anual do software de edição",
      amount: 2800,
      date: new Date("2025-03-15"),
      paid_by: 2,
      receipt: "receipt-software-001.pdf"
    });

    // Client interactions
    this.createClientInteraction({
      client_id: 1,
      user_id: 1,
      type: "reuniao",
      title: "Reunião de Alinhamento",
      description: "Discutimos os detalhes para a nova campanha de vídeos para redes sociais. O cliente aprovou o orçamento inicial e o cronograma proposto.",
      date: new Date("2025-04-05T14:30:00")
    });

    this.createClientInteraction({
      client_id: 1,
      user_id: 2,
      type: "documento",
      title: "Aprovação de Orçamento",
      description: "Cliente aprovou formalmente o orçamento para a campanha do Cartão Premium no valor de R$ 32.000.",
      date: new Date("2025-04-05T16:15:00")
    });

    this.createClientInteraction({
      client_id: 1,
      user_id: 1,
      type: "feedback",
      title: "Feedback sobre Roteiro",
      description: "O cliente solicitou algumas alterações no roteiro da Campanha Cartão Premium. Preferem uma abordagem mais emocional e menos focada em números.",
      date: new Date("2025-04-25T16:45:00")
    });

    this.createClientInteraction({
      client_id: 1,
      user_id: 2,
      type: "email",
      title: "Email de Apresentação",
      description: "Enviamos proposta inicial para a campanha de vídeos para redes sociais. Destacamos nossa abordagem criativa e casos de sucesso anteriores.",
      date: new Date("2025-04-01T09:30:00")
    });

    this.createClientInteraction({
      client_id: 1,
      user_id: 1,
      type: "reuniao",
      title: "Primeira Reunião",
      description: "Reunião inicial com a time de marketing do Banco Azul. Discutimos objetivos para 2025 e possíveis projetos de vídeo.",
      date: new Date("2025-01-10T11:00:00")
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.usersData.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.usersData.values());
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.usersData.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.usersData.delete(id);
  }

  // Clients
  async getClient(id: number): Promise<Client | undefined> {
    return this.clientsData.get(id);
  }

  async getClients(): Promise<Client[]> {
    return Array.from(this.clientsData.values());
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientId++;
    const client: Client = { ...insertClient, id };
    this.clientsData.set(id, client);
    return client;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clientsData.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient = { ...existingClient, ...client };
    this.clientsData.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clientsData.delete(id);
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    return this.projectsData.get(id);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projectsData.values());
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return Array.from(this.projectsData.values()).filter(
      (project) => project.client_id === clientId,
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const project: Project = { 
      ...insertProject, 
      id, 
      creation_date: new Date()
    };
    this.projectsData.set(id, project);
    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projectsData.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject = { ...existingProject, ...project };
    this.projectsData.set(id, updatedProject);
    return updatedProject;
  }

  async duplicateProject(id: number): Promise<Project | undefined> {
    const existingProject = this.projectsData.get(id);
    if (!existingProject) return undefined;
    
    // Criar uma cópia do projeto com algumas modificações
    const duplicatedProject = await this.createProject({
      name: `${existingProject.name} (Cópia)`,
      description: existingProject.description,
      client_id: existingProject.client_id,
      status: "pre_producao", // Sempre começa em pré-produção
      budget: existingProject.budget,
      startDate: new Date(), // Data de início atual
      endDate: existingProject.endDate ? new Date(existingProject.endDate) : undefined,
      progress: 0, // Inicia com progresso zero
      thumbnail: existingProject.thumbnail
    });
    
    // Duplicar os estágios do projeto
    const stages = await this.getProjectStages(id);
    for (const stage of stages) {
      await this.createProjectStage({
        project_id: duplicatedProject.id,
        name: stage.name,
        description: stage.description,
        order: stage.order,
        completed: false // Todos os estágios começam como não concluídos
      });
    }
    
    // Duplicar os membros do projeto
    const members = await this.getProjectMembers(id);
    for (const member of members) {
      await this.addProjectMember({
        project_id: duplicatedProject.id,
        user_id: member.user_id,
        role: member.role
      });
    }
    
    // Duplicar as tarefas do projeto, mas sem completar nenhuma
    const tasks = await this.getTasksByProject(id);
    for (const task of tasks) {
      await this.createTask({
        title: task.title,
        description: task.description,
        project_id: duplicatedProject.id,
        assigned_to: task.assigned_to,
        status: "pendente", // Todas as tarefas começam como pendentes
        priority: task.priority,
        due_date: task.due_date ? new Date(task.due_date) : undefined,
        start_date: new Date(), // Data de início atual
        estimated_hours: task.estimated_hours,
        completed: false
      });
    }
    
    return duplicatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projectsData.delete(id);
  }

  // Project Members
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return Array.from(this.projectMembersData.values()).filter(
      (member) => member.project_id === projectId,
    );
  }

  async addProjectMember(insertMember: InsertProjectMember): Promise<ProjectMember> {
    const id = this.projectMemberId++;
    const member: ProjectMember = { ...insertMember, id };
    this.projectMembersData.set(id, member);
    return member;
  }

  async removeProjectMember(projectId: number, userId: number): Promise<boolean> {
    const member = Array.from(this.projectMembersData.values()).find(
      (m) => m.project_id === projectId && m.user_id === userId,
    );
    if (!member) return false;
    return this.projectMembersData.delete(member.id);
  }

  // Project Stages
  async getProjectStages(projectId: number): Promise<ProjectStage[]> {
    return Array.from(this.projectStagesData.values())
      .filter((stage) => stage.project_id === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async createProjectStage(insertStage: InsertProjectStage): Promise<ProjectStage> {
    const id = this.projectStageId++;
    const stage: ProjectStage = { ...insertStage, id };
    this.projectStagesData.set(id, stage);
    return stage;
  }

  async updateProjectStage(id: number, stage: Partial<InsertProjectStage>): Promise<ProjectStage | undefined> {
    const existingStage = this.projectStagesData.get(id);
    if (!existingStage) return undefined;
    
    const updatedStage = { ...existingStage, ...stage };
    if (stage.completed && !existingStage.completed) {
      updatedStage.completion_date = new Date();
    }
    this.projectStagesData.set(id, updatedStage);
    return updatedStage;
  }

  async deleteProjectStage(id: number): Promise<boolean> {
    return this.projectStagesData.delete(id);
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasksData.get(id);
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasksData.values());
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return Array.from(this.tasksData.values()).filter(
      (task) => task.project_id === projectId,
    );
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return Array.from(this.tasksData.values()).filter(
      (task) => task.assigned_to === userId,
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const task: Task = { 
      ...insertTask, 
      id, 
      creation_date: new Date() 
    };
    this.tasksData.set(id, task);
    return task;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasksData.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { ...existingTask, ...task };
    if (task.completed && !existingTask.completed) {
      updatedTask.completion_date = new Date();
    }
    this.tasksData.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasksData.delete(id);
  }

  // Task Comments
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return Array.from(this.taskCommentsData.values())
      .filter((comment) => comment.task_id === taskId)
      .sort((a, b) => {
        if (a.creation_date && b.creation_date) {
          return a.creation_date.getTime() - b.creation_date.getTime();
        }
        return 0;
      });
  }

  async createTaskComment(insertComment: InsertTaskComment): Promise<TaskComment> {
    const id = this.taskCommentId++;
    const comment: TaskComment = { 
      ...insertComment, 
      id, 
      creation_date: new Date() 
    };
    this.taskCommentsData.set(id, comment);
    return comment;
  }

  async deleteTaskComment(id: number): Promise<boolean> {
    return this.taskCommentsData.delete(id);
  }

  // Task Attachments
  async getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
    return Array.from(this.taskAttachmentsData.values()).filter(
      (attachment) => attachment.task_id === taskId,
    );
  }

  async createTaskAttachment(insertAttachment: InsertTaskAttachment): Promise<TaskAttachment> {
    const id = this.taskAttachmentId++;
    const attachment: TaskAttachment = { 
      ...insertAttachment, 
      id, 
      upload_date: new Date() 
    };
    this.taskAttachmentsData.set(id, attachment);
    return attachment;
  }

  async deleteTaskAttachment(id: number): Promise<boolean> {
    return this.taskAttachmentsData.delete(id);
  }

  // Client Interactions
  async getClientInteractions(clientId: number): Promise<ClientInteraction[]> {
    return Array.from(this.clientInteractionsData.values())
      .filter((interaction) => interaction.client_id === clientId)
      .sort((a, b) => {
        if (a.date && b.date) {
          return b.date.getTime() - a.date.getTime();
        }
        return 0;
      });
  }

  async createClientInteraction(insertInteraction: InsertClientInteraction): Promise<ClientInteraction> {
    const id = this.clientInteractionId++;
    const interaction: ClientInteraction = { 
      ...insertInteraction, 
      id, 
      date: new Date() 
    };
    this.clientInteractionsData.set(id, interaction);
    return interaction;
  }

  async deleteClientInteraction(id: number): Promise<boolean> {
    return this.clientInteractionsData.delete(id);
  }

  // Financial Documents
  async getFinancialDocument(id: number): Promise<FinancialDocument | undefined> {
    return this.financialDocumentsData.get(id);
  }

  async getFinancialDocuments(): Promise<FinancialDocument[]> {
    return Array.from(this.financialDocumentsData.values());
  }

  async getFinancialDocumentsByClient(clientId: number): Promise<FinancialDocument[]> {
    return Array.from(this.financialDocumentsData.values()).filter(
      (doc) => doc.client_id === clientId,
    );
  }

  async getFinancialDocumentsByProject(projectId: number): Promise<FinancialDocument[]> {
    return Array.from(this.financialDocumentsData.values()).filter(
      (doc) => doc.project_id === projectId,
    );
  }

  async createFinancialDocument(insertDocument: InsertFinancialDocument): Promise<FinancialDocument> {
    const id = this.financialDocumentId++;
    const document: FinancialDocument = { 
      ...insertDocument, 
      id, 
      creation_date: new Date() 
    };
    this.financialDocumentsData.set(id, document);
    return document;
  }

  async updateFinancialDocument(id: number, document: Partial<InsertFinancialDocument>): Promise<FinancialDocument | undefined> {
    const existingDocument = this.financialDocumentsData.get(id);
    if (!existingDocument) return undefined;
    
    const updatedDocument = { ...existingDocument, ...document };
    if (document.paid && !existingDocument.paid) {
      updatedDocument.payment_date = new Date();
    }
    this.financialDocumentsData.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteFinancialDocument(id: number): Promise<boolean> {
    return this.financialDocumentsData.delete(id);
  }

  // Expenses
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expensesData.get(id);
  }

  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expensesData.values());
  }

  async getExpensesByProject(projectId: number): Promise<Expense[]> {
    return Array.from(this.expensesData.values()).filter(
      (expense) => expense.project_id === projectId,
    );
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseId++;
    const expense: Expense = { 
      ...insertExpense, 
      id, 
      creation_date: new Date() 
    };
    this.expensesData.set(id, expense);
    return expense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existingExpense = this.expensesData.get(id);
    if (!existingExpense) return undefined;
    
    const updatedExpense = { ...existingExpense, ...expense };
    this.expensesData.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expensesData.delete(id);
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    return this.eventsData.get(id);
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.eventsData.values());
  }

  async getEventsByUser(userId: number): Promise<Event[]> {
    return Array.from(this.eventsData.values()).filter(
      (event) => event.user_id === userId,
    );
  }

  async getEventsByProject(projectId: number): Promise<Event[]> {
    return Array.from(this.eventsData.values()).filter(
      (event) => event.project_id === projectId,
    );
  }

  async getEventsByClient(clientId: number): Promise<Event[]> {
    return Array.from(this.eventsData.values()).filter(
      (event) => event.client_id === clientId,
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventId++;
    const event: Event = { 
      ...insertEvent, 
      id, 
      creation_date: new Date() 
    };
    this.eventsData.set(id, event);
    return event;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const existingEvent = this.eventsData.get(id);
    if (!existingEvent) return undefined;
    
    const updatedEvent = { ...existingEvent, ...event };
    this.eventsData.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.eventsData.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Primeiro, exclui todos os tokens de atualização relacionados ao usuário
      await db.delete(refreshTokens).where(eq(refreshTokens.user_id, id));
      
      // Depois, remove o usuário
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error; // Lança o erro para tratamento adequado na camada de controle
    }
  }
  
  // Clients
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return true; // Drizzle doesn't return affected rows, so we assume success
  }
  
  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.client_id, clientId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async duplicateProject(id: number): Promise<Project | undefined> {
    const existingProject = await this.getProject(id);
    if (!existingProject) return undefined;
    
    // Criar uma cópia do projeto com algumas modificações
    const duplicatedProject = await this.createProject({
      name: `${existingProject.name} (Cópia)`,
      description: existingProject.description,
      client_id: existingProject.client_id,
      status: "pre_producao", // Sempre começa em pré-produção
      budget: existingProject.budget,
      startDate: new Date(), // Data de início atual
      endDate: existingProject.endDate,
      progress: 0, // Inicia com progresso zero
      thumbnail: existingProject.thumbnail
    });
    
    // Duplicar os estágios do projeto
    const stages = await this.getProjectStages(id);
    for (const stage of stages) {
      await this.createProjectStage({
        project_id: duplicatedProject.id,
        name: stage.name,
        description: stage.description,
        order: stage.order,
        completed: false // Todos os estágios começam como não concluídos
      });
    }
    
    // Duplicar os membros do projeto
    const members = await this.getProjectMembers(id);
    for (const member of members) {
      await this.addProjectMember({
        project_id: duplicatedProject.id,
        user_id: member.user_id,
        role: member.role
      });
    }
    
    // Duplicar as tarefas do projeto, mas sem completar nenhuma
    const tasks = await this.getTasksByProject(id);
    for (const task of tasks) {
      await this.createTask({
        title: task.title,
        description: task.description,
        project_id: duplicatedProject.id,
        assigned_to: task.assigned_to,
        status: "pendente", // Todas as tarefas começam como pendentes
        priority: task.priority,
        due_date: task.due_date,
        start_date: new Date(), // Data de início atual
        estimated_hours: task.estimated_hours,
        completed: false
      });
    }
    
    return duplicatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return true;
  }
  
  // Project Members
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return await db.select().from(projectMembers).where(eq(projectMembers.project_id, projectId));
  }

  async addProjectMember(insertMember: InsertProjectMember): Promise<ProjectMember> {
    const [member] = await db.insert(projectMembers).values(insertMember).returning();
    return member;
  }

  async removeProjectMember(projectId: number, userId: number): Promise<boolean> {
    const result = await db.delete(projectMembers)
      .where(and(
        eq(projectMembers.project_id, projectId),
        eq(projectMembers.user_id, userId)
      ));
    return true;
  }
  
  // Project Stages
  async getProjectStages(projectId: number): Promise<ProjectStage[]> {
    return await db.select()
      .from(projectStages)
      .where(eq(projectStages.project_id, projectId))
      .orderBy(projectStages.order);
  }

  async createProjectStage(insertStage: InsertProjectStage): Promise<ProjectStage> {
    const [stage] = await db.insert(projectStages).values(insertStage).returning();
    return stage;
  }

  async updateProjectStage(id: number, stage: Partial<InsertProjectStage>): Promise<ProjectStage | undefined> {
    const [updated] = await db.update(projectStages)
      .set(stage)
      .where(eq(projectStages.id, id))
      .returning();
    return updated;
  }

  async deleteProjectStage(id: number): Promise<boolean> {
    const result = await db.delete(projectStages).where(eq(projectStages.id, id));
    return true;
  }
  
  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.project_id, projectId));
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigned_to, userId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }
  
  // Task Comments
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return await db.select().from(taskComments).where(eq(taskComments.task_id, taskId));
  }

  async createTaskComment(insertComment: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db.insert(taskComments).values(insertComment).returning();
    return comment;
  }

  async deleteTaskComment(id: number): Promise<boolean> {
    const result = await db.delete(taskComments).where(eq(taskComments.id, id));
    return true;
  }
  
  // Task Attachments
  async getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
    return await db.select().from(taskAttachments).where(eq(taskAttachments.task_id, taskId));
  }

  async createTaskAttachment(insertAttachment: InsertTaskAttachment): Promise<TaskAttachment> {
    const [attachment] = await db.insert(taskAttachments).values(insertAttachment).returning();
    return attachment;
  }

  async deleteTaskAttachment(id: number): Promise<boolean> {
    const result = await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
    return true;
  }
  
  // Client Interactions
  async getClientInteractions(clientId: number): Promise<ClientInteraction[]> {
    return await db.select().from(clientInteractions).where(eq(clientInteractions.client_id, clientId));
  }

  async createClientInteraction(insertInteraction: InsertClientInteraction): Promise<ClientInteraction> {
    const [interaction] = await db.insert(clientInteractions).values(insertInteraction).returning();
    return interaction;
  }

  async deleteClientInteraction(id: number): Promise<boolean> {
    const result = await db.delete(clientInteractions).where(eq(clientInteractions.id, id));
    return true;
  }
  
  // Financial Documents
  async getFinancialDocument(id: number): Promise<FinancialDocument | undefined> {
    const [document] = await db.select().from(financialDocuments).where(eq(financialDocuments.id, id));
    return document || undefined;
  }

  async getFinancialDocuments(): Promise<FinancialDocument[]> {
    return await db.select().from(financialDocuments);
  }

  async getFinancialDocumentsByClient(clientId: number): Promise<FinancialDocument[]> {
    return await db.select().from(financialDocuments).where(eq(financialDocuments.client_id, clientId));
  }

  async getFinancialDocumentsByProject(projectId: number): Promise<FinancialDocument[]> {
    return await db.select().from(financialDocuments).where(eq(financialDocuments.project_id, projectId));
  }

  async createFinancialDocument(insertDocument: InsertFinancialDocument): Promise<FinancialDocument> {
    const [document] = await db.insert(financialDocuments).values(insertDocument).returning();
    return document;
  }

  async updateFinancialDocument(id: number, document: Partial<InsertFinancialDocument>): Promise<FinancialDocument | undefined> {
    const [updated] = await db.update(financialDocuments)
      .set(document)
      .where(eq(financialDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteFinancialDocument(id: number): Promise<boolean> {
    const result = await db.delete(financialDocuments).where(eq(financialDocuments.id, id));
    return true;
  }
  
  // Expenses
  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpensesByProject(projectId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.project_id, projectId));
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }
  
  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEventsByUser(userId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.user_id, userId));
  }

  async getEventsByProject(projectId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.project_id, projectId));
  }

  async getEventsByClient(clientId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.client_id, clientId));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events)
      .set(event)
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return true;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
