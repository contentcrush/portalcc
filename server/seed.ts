import { db } from "./db";
import { 
  users, clients, projects, projectMembers, projectStages, 
  tasks, taskComments, taskAttachments, clientInteractions,
  financialDocuments, expenses, events
} from "../shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  try {
    // Check if users already exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already seeded. Skipping seed process.");
      return;
    }

    // Importar a função hashPassword
    const { hashPassword } = await import('./auth');

    // Users
    const [user1] = await db.insert(users).values({
      username: "bruno.silva",
      password: await hashPassword("password"), // Hashear a senha
      name: "Bruno Silva",
      email: "bruno.silva@contentcrush.com",
      role: "admin",
      permissions: ["manage_users", "manage_projects", "manage_clients", "manage_finances"],
      department: "Production",
      position: "Director of Production",
      bio: "Director of production with more than 10 years of experience in audiovisual projects for national and international brands.",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      phone: "(11) 98765-4321",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    const [user2] = await db.insert(users).values({
      username: "ana.oliveira",
      password: await hashPassword("password"), // Hashear a senha
      name: "Ana Oliveira",
      email: "ana.oliveira@contentcrush.com",
      role: "editor",
      permissions: ["view_projects", "edit_tasks"],
      department: "Post-production",
      position: "Editor",
      bio: "Video editor specialized in advertising and institutional content.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      phone: "(11) 98765-1234",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    const [user3] = await db.insert(users).values({
      username: "carlos.mendes",
      password: await hashPassword("password"), // Hashear a senha
      name: "Carlos Mendes",
      email: "carlos.mendes@contentcrush.com",
      role: "editor",
      permissions: ["view_projects", "edit_tasks"],
      department: "Production",
      position: "Photographer",
      bio: "Photographer with expertise in corporate photography.",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
      phone: "(11) 91234-5678",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    const [user4] = await db.insert(users).values({
      username: "julia.santos",
      password: await hashPassword("password"), // Hashear a senha
      name: "Julia Santos",
      email: "julia.santos@contentcrush.com",
      role: "manager",
      permissions: ["manage_projects", "manage_tasks", "manage_clients"],
      department: "Creative",
      position: "Graphic Designer",
      bio: "Graphic designer with expertise in brand identity and motion graphics.",
      avatar: "https://randomuser.me/api/portraits/women/23.jpg",
      phone: "(11) 91234-9876",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    // Clients
    const [client1] = await db.insert(clients).values({
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
    }).returning();

    const [client2] = await db.insert(clients).values({
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
    }).returning();

    const [client3] = await db.insert(clients).values({
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
    }).returning();

    const [client4] = await db.insert(clients).values({
      name: "Marca X",
      shortName: "MX", 
      type: "Corporate",
      category: "Standard",
      cnpj: "77.888.999/0001-12",
      website: "www.marcax.com.br",
      contactName: "Sandra Lima",
      contactPosition: "Marketing Director",
      contactEmail: "sandra@marcax.com.br",
      contactPhone: "(11) 98877-6655",
      address: "Rua Faria Lima, 200 - São Paulo",
      city: "São Paulo", 
      since: new Date("2024-02-20"),
      notes: "New client, potential for long-term partnership."
    }).returning();

    // Projects
    const [project1] = await db.insert(projects).values({
      name: "Comercial Banco Azul",
      description: "Campanha institucional para o Banco Azul com foco em segurança digital.",
      client_id: client1.id,
      status: "em_andamento",
      budget: 34000,
      startDate: new Date("2025-03-15"),
      endDate: new Date("2025-04-28"),
      progress: 65,
      thumbnail: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    }).returning();

    const [project2] = await db.insert(projects).values({
      name: "Documentário Natureza",
      description: "Documentário sobre preservação ambiental e espécies ameaçadas da Mata Atlântica.",
      client_id: client3.id,
      status: "em_producao",
      budget: 28750,
      startDate: new Date("2025-02-20"),
      endDate: new Date("2025-06-10"),
      progress: 30,
      thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    }).returning();

    const [project3] = await db.insert(projects).values({
      name: "Curso Online Tech",
      description: "Série de vídeos educacionais sobre programação e desenvolvimento web.",
      client_id: client2.id,
      status: "pre_producao",
      budget: 12500,
      startDate: new Date("2025-04-05"),
      endDate: new Date("2025-05-20"),
      progress: 15,
      thumbnail: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    }).returning();

    const [project4] = await db.insert(projects).values({
      name: "Projeto Marca X",
      description: "Rebrand completo e vídeo corporativo para lançamento da nova identidade.",
      client_id: client4.id,
      status: "novo",
      budget: 15000,
      startDate: new Date("2025-04-10"),
      endDate: new Date("2025-05-30"),
      progress: 0,
      thumbnail: "https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=300&q=80"
    }).returning();

    // Project Members
    await db.insert(projectMembers).values([
      {
        project_id: project1.id,
        user_id: user1.id,
        role: "project_manager"
      },
      {
        project_id: project1.id,
        user_id: user2.id,
        role: "team_member"
      },
      {
        project_id: project1.id,
        user_id: user3.id,
        role: "team_member"
      },
      {
        project_id: project2.id,
        user_id: user1.id,
        role: "project_manager"
      },
      {
        project_id: project2.id,
        user_id: user2.id,
        role: "team_member"
      },
      {
        project_id: project3.id,
        user_id: user4.id,
        role: "project_manager"
      },
      {
        project_id: project3.id,
        user_id: user2.id,
        role: "team_member"
      }
    ]);

    // Project Stages
    await db.insert(projectStages).values([
      {
        project_id: project1.id,
        name: "Pré-produção",
        description: "Planejamento e roteiro",
        order: 1,
        completed: true
      },
      {
        project_id: project1.id,
        name: "Produção",
        description: "Filmagem das cenas",
        order: 2,
        completed: true
      },
      {
        project_id: project1.id,
        name: "Pós-produção",
        description: "Edição e finalização",
        order: 3,
        completed: false
      },
      {
        project_id: project2.id,
        name: "Pesquisa",
        description: "Levantamento de informações sobre a Mata Atlântica",
        order: 1,
        completed: true
      },
      {
        project_id: project2.id,
        name: "Captação",
        description: "Filmagem em campo",
        order: 2,
        completed: false
      },
      {
        project_id: project2.id,
        name: "Edição",
        description: "Montagem do documentário",
        order: 3,
        completed: false
      },
      {
        project_id: project3.id,
        name: "Planejamento",
        description: "Definição de conteúdo programático",
        order: 1,
        completed: true
      },
      {
        project_id: project3.id,
        name: "Produção",
        description: "Gravação das aulas",
        order: 2,
        completed: false
      }
    ]);

    // Tasks
    const [task1] = await db.insert(tasks).values({
      title: "Finalizar edição do teaser - Banco Azul",
      description: "Finalizar o corte do teaser promocional para aprovação do cliente.",
      project_id: project1.id,
      assigned_to: user2.id,
      status: "in_progress",
      priority: "high",
      due_date: new Date("2025-04-10"),
      start_date: new Date("2025-04-05"),
      estimated_hours: 12,
      completed: false
    }).returning();

    const [task2] = await db.insert(tasks).values({
      title: "Aprovar storyboard - Documentário Natureza",
      description: "Revisar e aprovar storyboard final para o documentário.",
      project_id: project2.id,
      assigned_to: user1.id,
      status: "pending",
      priority: "high",
      due_date: new Date("2025-04-15"),
      start_date: null,
      estimated_hours: 4,
      completed: false
    }).returning();

    const [task3] = await db.insert(tasks).values({
      title: "Reunião de pré-produção - Curso Online Tech",
      description: "Definir cronograma de gravação e estrutura das aulas.",
      project_id: project3.id,
      assigned_to: user1.id,
      status: "pending",
      priority: "medium",
      due_date: new Date("2025-04-08"),
      start_date: null,
      estimated_hours: 2,
      completed: false
    }).returning();

    const [task4] = await db.insert(tasks).values({
      title: "Revisar orçamento - Projeto Marca X",
      description: "Revisar e ajustar orçamento conforme solicitações do cliente.",
      project_id: project4.id,
      assigned_to: user1.id,
      status: "pending",
      priority: "medium",
      due_date: new Date("2025-04-12"),
      start_date: null,
      estimated_hours: 3,
      completed: false
    }).returning();

    // Financial Documents
    await db.insert(financialDocuments).values([
      {
        project_id: project1.id,
        client_id: client1.id,
        document_type: "invoice",
        document_number: "NF-2025-0125",
        amount: 18000,
        due_date: new Date("2025-04-30"),
        paid: true,
        payment_date: new Date("2025-04-25"),
        status: "paid"
      },
      {
        project_id: project2.id,
        client_id: client3.id,
        document_type: "invoice",
        document_number: "NF-2025-0126",
        amount: 12500,
        due_date: new Date("2025-05-05"),
        paid: false,
        payment_date: null,
        status: "pending"
      },
      {
        project_id: project3.id,
        client_id: client2.id,
        document_type: "invoice",
        document_number: "NF-2025-0127",
        amount: 12500,
        due_date: new Date("2025-05-15"),
        paid: false,
        payment_date: null,
        status: "pending"
      }
    ]);

    // Expenses
    await db.insert(expenses).values([
      {
        project_id: project1.id,
        category: "equipment",
        description: "Aluguel de equipamento de iluminação",
        amount: 2500,
        date: new Date("2025-03-25"),
        paid_by: user1.id,
        reimbursement: false,
        receipt: "receipt-001.pdf",
        approved: true
      },
      {
        project_id: project2.id,
        category: "travel",
        description: "Hospedagem para filmagem em campo",
        amount: 1800,
        date: new Date("2025-04-15"),
        paid_by: user3.id,
        reimbursement: true,
        receipt: "receipt-002.pdf",
        approved: true
      },
      {
        project_id: project3.id,
        category: "software",
        description: "Licenças de software para edição",
        amount: 650,
        date: new Date("2025-04-02"),
        paid_by: user2.id,
        reimbursement: false,
        receipt: "receipt-003.pdf",
        approved: true
      }
    ]);

    // Events
    await db.insert(events).values([
      {
        title: "Reunião com Cliente - Banco Azul",
        description: "Apresentação do corte preliminar",
        user_id: user1.id,
        project_id: project1.id,
        client_id: client1.id,
        task_id: null,
        type: "meeting",
        start_date: new Date("2025-04-12T14:00:00"),
        end_date: new Date("2025-04-12T16:00:00"),
        all_day: false,
        location: "Escritório do cliente",
        color: "#4285F4"
      },
      {
        title: "Filmagem - Documentário Natureza",
        description: "Captação de imagens na Mata Atlântica",
        user_id: user3.id,
        project_id: project2.id,
        client_id: client3.id,
        task_id: null,
        type: "production",
        start_date: new Date("2025-04-20T08:00:00"),
        end_date: new Date("2025-04-22T18:00:00"),
        all_day: true,
        location: "Parque Estadual da Serra do Mar",
        color: "#0F9D58"
      },
      {
        title: "Gravação - Curso Online Tech",
        description: "Gravação dos primeiros módulos",
        user_id: user2.id,
        project_id: project3.id,
        client_id: client2.id,
        task_id: null,
        type: "production",
        start_date: new Date("2025-04-15T09:00:00"),
        end_date: new Date("2025-04-15T17:00:00"),
        all_day: false,
        location: "Estúdio Content Crush",
        color: "#F4B400"
      },
      {
        title: "Reunião Inicial - Projeto Marca X",
        description: "Apresentação do briefing e kick-off",
        user_id: user1.id,
        project_id: project4.id,
        client_id: client4.id,
        task_id: null,
        type: "meeting",
        start_date: new Date("2025-04-11T10:00:00"),
        end_date: new Date("2025-04-11T12:00:00"),
        all_day: false,
        location: "Escritório Content Crush",
        color: "#DB4437"
      }
    ]);

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Export for use in index.ts
export { seedDatabase };