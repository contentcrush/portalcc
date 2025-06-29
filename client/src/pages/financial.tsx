import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { initWebSocket, onWebSocketMessage } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { showSuccessToast } from "@/lib/utils";
import { 
  format, 
  addDays, 
  subDays,
  subMonths, 
  subQuarters,
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear, 
  isBefore, 
  isAfter, 
  isSameMonth,
  isSameYear,
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  CreditCard,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Wallet,
  DollarSign,
  FileText,
  Banknote,
  TrendingUp,
  AlertCircle,
  Clock,
  LineChart,
  PieChart,
  Users,
  BarChart,
  CheckCircle,
  Receipt,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn, formatCurrency, calculatePercentChange } from "@/lib/utils";
import FinancialChart from "@/components/FinancialChart";
import { NewFinancialRecordDialog } from "@/components/financial/NewFinancialRecordDialog";
import { FinancialRecordActions } from "@/components/financial/FinancialRecordActions";
import { FinancialRecordDetails } from "@/components/financial/FinancialRecordDetails";
import { PaymentRegistrationDialog } from "@/components/financial/PaymentRegistrationDialog";
import { EditExpenseDialog } from "@/components/financial/EditExpenseDialog";
import { FinancialTableHeader } from "@/components/financial/FinancialTableHeader";
import { FinancialStatusBadge } from "@/components/financial/FinancialStatusBadge";
import { FinancialQuickStats } from "@/components/financial/FinancialQuickStats";

// Definição de tipos
interface Transaction {
  id: number;
  description: string;
  date: Date;
  dueDate?: Date;
  amount: number;
  status: "pending" | "paid" | "overdue";
  client: string;
  project: string;
  type: "income" | "expense";
  category?: string;
}

interface FinancialKPI {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  description: string;
  variant?: "green" | "red" | "blue" | "amber" | "default";
}

export default function Financial() {
  const [selectedTab, setSelectedTab] = useState<string>("dashboard");
  const [period, setPeriod] = useState<string>("year");
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [sortConfig, setSortConfig] = useState<{
    field: 'amount' | 'document_number' | 'issue_date' | 'due_date' | 'client_name' | 'id';
    direction: 'asc' | 'desc';
  }>({ field: 'id', direction: 'desc' });
  
  // Estados para filtros das abas A Receber e A Pagar
  const [receivablesSearchTerm, setReceivablesSearchTerm] = useState<string>("");
  const [receivablesStatusFilter, setReceivablesStatusFilter] = useState<string>("all");
  const [payablesSearchTerm, setPayablesSearchTerm] = useState<string>("");
  const [payablesStatusFilter, setPayablesStatusFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para controlar os diálogos de detalhes e pagamento
  const [detailsRecord, setDetailsRecord] = useState<{ record: any, type: "document" | "expense" } | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<{ record: any, type: "document" | "expense" } | null>(null);
  const [editExpense, setEditExpense] = useState<any | null>(null);
  const [newRecordDialog, setNewRecordDialog] = useState<{ open: boolean, type: 'invoice' | 'expense' }>({ open: false, type: 'invoice' });
  
  // Calcular o intervalo de datas com base no período selecionado
  const dateFilterRange = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(today);
    
    switch (period) {
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'quarter':
        startDate = startOfQuarter(today);
        endDate = endOfQuarter(today);
        break;
      case 'year':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
      case 'custom':
        // Se tivermos uma data de início e fim personalizadas, usamos elas
        if (customDateRange.from && customDateRange.to) {
          startDate = startOfDay(customDateRange.from);
          endDate = endOfDay(customDateRange.to);
        } else {
          // Caso contrário, usamos o mês atual como padrão
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
        }
        break;
      default:
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
    }
    
    return { startDate, endDate };
  }, [period, customDateRange]);
  
  // Função auxiliar para obter o início do dia (00:00:00)
  function startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }
  
  // Função auxiliar para obter o fim do dia (23:59:59)
  function endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }
  
  // Função para verificar se uma data está dentro do intervalo de filtro
  function isDateInRange(date: Date | string | null | undefined): boolean {
    if (!date) return false;
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return (
      isAfter(dateObj, subDays(dateFilterRange.startDate, 1)) && 
      isBefore(dateObj, addDays(dateFilterRange.endDate, 1))
    );
  }
  
  // Função para formatar o período selecionado para exibição
  const getPeriodLabel = (): string => {
    const { startDate, endDate } = dateFilterRange;
    
    switch (period) {
      case 'month':
        return `${format(startDate, 'MMMM yyyy', { locale: ptBR })}`;
      case 'quarter':
        return `${format(startDate, 'MMMM', { locale: ptBR })} - ${format(endDate, 'MMMM yyyy', { locale: ptBR })}`;
      case 'year':
        return `${format(startDate, 'yyyy')}`;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`;
        }
        return 'Período personalizado';
      default:
        return 'Período atual';
    }
  };
  
  // Efeito para escutar eventos financeiros via WebSocket
  useEffect(() => {
    console.log('Configurando listeners WebSocket na página financeira...');
    
    // Inicializar WebSocket se ainda não estiver conectado
    initWebSocket().catch(error => {
      console.error('Erro ao inicializar WebSocket na página financeira:', error);
    });
    
    // Registrar listeners para eventos financeiros (incluindo versões do formato antigo)
    // WebSocket deve processar tanto 'financial_updated' quanto 'financial_update'
    const unregisterFinancialUpdateHandler = onWebSocketMessage('financial_updated', (data) => {
      console.log('Recebida notificação de atualização financeira (format novo):', data);
      
      // Invalidar consultas financeiras para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      
      // Também invalidar eventos do calendário para garantir sincronização bidirecional
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // Notificar o usuário
      showSuccessToast({
        title: 'Dados financeiros atualizados',
        description: data.message || 'Os registros financeiros foram atualizados'
      });
    });
    
    // Suporte para formato antigo (financial_update sem o 'd')
    // Redundante com a correção no SocketContext, mas mantido por precaução
    const unregisterOldFormatHandler = onWebSocketMessage('financial_update', (data) => {
      console.log('Recebida notificação de atualização financeira (formato antigo):', data);
      
      // Invalidar consultas financeiras para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      
      // Também invalidar eventos do calendário para garantir sincronização bidirecional
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    });
    
    const unregisterCalendarUpdateHandler = onWebSocketMessage('calendar_updated', (data) => {
      console.log('Recebida notificação de atualização do calendário:', data);
      
      // Invalidar consultas financeiras para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    });
    
    // Limpar listeners quando o componente for desmontado
    return () => {
      console.log('Removendo listeners WebSocket da página financeira');
      unregisterFinancialUpdateHandler();
      unregisterOldFormatHandler();
      unregisterCalendarUpdateHandler();
    };
  }, [queryClient, toast]);

  // Fetch financial data
  const { data: financialDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/financial-documents']
  });
  
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['/api/expenses']
  });
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
  });
  
  const { data: clients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Função auxiliar para ordenação
  const handleSort = (field: typeof sortConfig.field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Prepare financial data
  // Agora incluímos todas as faturas, não apenas as não pagas
  // Ordenadas conforme seleção do usuário e filtradas por busca e status
  const receivablesData = useMemo(() => {
    let filtered = financialDocuments?.filter((doc: any) => 
      doc.document_type === 'invoice'
    ) || [];
    
    // Aplicar filtro de busca
    if (receivablesSearchTerm) {
      const searchLower = receivablesSearchTerm.toLowerCase();
      filtered = filtered.filter((doc: any) => {
        const client = clients?.find((c: any) => c.id === doc.client_id);
        const project = projects?.find((p: any) => p.id === doc.project_id);
        return (
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.document_number?.toLowerCase().includes(searchLower) ||
          client?.name?.toLowerCase().includes(searchLower) ||
          project?.name?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Aplicar filtro de status
    if (receivablesStatusFilter !== "all") {
      filtered = filtered.filter((doc: any) => {
        const isOverdue = !doc.paid && doc.due_date && isBefore(new Date(doc.due_date), now);
        
        switch (receivablesStatusFilter) {
          case "pending":
            return !doc.paid && !isOverdue;
          case "overdue":
            return isOverdue;
          case "paid":
            return doc.paid;
          default:
            return true;
        }
      });
    }
    
    const sorted = filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortConfig.field) {
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'document_number':
          aValue = a.document_number || a.id;
          bValue = b.document_number || b.id;
          break;
        case 'issue_date':
          aValue = a.issue_date ? new Date(a.issue_date).getTime() : 0;
          bValue = b.issue_date ? new Date(b.issue_date).getTime() : 0;
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'client_name':
          const clientA = clients?.find((c: any) => c.id === a.client_id);
          const clientB = clients?.find((c: any) => c.id === b.client_id);
          aValue = clientA?.name || '';
          bValue = clientB?.name || '';
          break;
        case 'id':
          aValue = a.id || 0;
          bValue = b.id || 0;
          break;
        default:
          aValue = a.id || 0;
          bValue = b.id || 0;
      }
      
      if (sortConfig.direction === 'desc') {
        return typeof aValue === 'string' ? bValue.localeCompare(aValue) : bValue - aValue;
      } else {
        return typeof aValue === 'string' ? aValue.localeCompare(bValue) : aValue - bValue;
      }
    });
    
    return sorted;
  }, [financialDocuments, sortConfig, clients, projects, receivablesSearchTerm, receivablesStatusFilter]);
  
  // Incluímos todas as despesas, não apenas as não aprovadas
  // Filtradas por busca e status
  const payablesData = useMemo(() => {
    let filtered = expenses || [];
    
    // Aplicar filtro de busca
    if (payablesSearchTerm) {
      const searchLower = payablesSearchTerm.toLowerCase();
      filtered = filtered.filter((expense: any) => 
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.category?.toLowerCase().includes(searchLower) ||
        expense.receipt_number?.toLowerCase().includes(searchLower)
      );
    }
    
    // Aplicar filtro de status
    if (payablesStatusFilter !== "all") {
      filtered = filtered.filter((expense: any) => {
        switch (payablesStatusFilter) {
          case "pending":
            return expense.approved === null || expense.approved === undefined;
          case "approved":
            return expense.approved === true;
          case "rejected":
            return expense.approved === false;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [expenses, payablesSearchTerm, payablesStatusFilter]);
  
  // Calculate KPIs
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  const sevenDaysFromNow = addDays(now, 7);
  
  // Calcula os valores previstos a receber divididos por períodos
  const calculateUpcomingReceivables = (documents: any[] = []) => {
    if (!documents || documents.length === 0) {
      return [
        { name: 'Hoje - 7 dias', value: 0 },
        { name: '8 - 15 dias', value: 0 },
        { name: '16 - 30 dias', value: 0 },
      ];
    }
    
    const today = new Date();
    const in7Days = addDays(today, 7);
    const in15Days = addDays(today, 15);
    const in30Days = addDays(today, 30);
    
    let nextWeek = 0;
    let next2Weeks = 0;
    let nextMonth = 0;
    
    documents.forEach((doc: any) => {
      if (!doc.paid && doc.due_date) {
        const dueDate = new Date(doc.due_date);
        const amount = doc.amount || 0;
        
        if (isBefore(dueDate, in7Days)) {
          nextWeek += amount;
        } else if (isBefore(dueDate, in15Days)) {
          next2Weeks += amount;
        } else if (isBefore(dueDate, in30Days)) {
          nextMonth += amount;
        }
      }
    });
    
    return [
      { name: 'Hoje - 7 dias', value: nextWeek },
      { name: '8 - 15 dias', value: next2Weeks },
      { name: '16 - 30 dias', value: nextMonth },
    ];
  };
  
  // Receivables total - considera apenas documentos não pagos
  console.log('Documentos financeiros (receivables):', receivablesData);
  
  // Filtra apenas documentos não pagos para "A Receber"
  const unpaidReceivables = receivablesData.filter((doc: any) => !doc.paid);
  
  const totalReceivables = unpaidReceivables.reduce((sum: number, doc: any) => {
    console.log(`Documento #${doc.id} (A Receber): R$${doc.amount}`);
    return sum + (doc.amount || 0);
  }, 0);
  console.log('Total calculado (soma real):', totalReceivables);
  
  // Payables total - with safety check
  const totalPayables = (payablesData || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  // Overdue receivables - with safety check
  const today = new Date();
  const overdueReceivables = (receivablesData || [])
    .filter((doc: any) => doc.due_date && isBefore(new Date(doc.due_date), today) && !doc.paid)
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  // Cash flow next 7 and 30 days - with safety checks
  const receivablesNext7Days = (receivablesData || [])
    .filter((doc: any) => 
      doc.due_date && 
      isBefore(new Date(doc.due_date), sevenDaysFromNow) && 
      !isBefore(new Date(doc.due_date), today) && // Não vencidas 
      !doc.paid // Ainda não pagas
    )
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);

  const receivablesNext30Days = (receivablesData || [])
    .filter((doc: any) => 
      doc.due_date && 
      isBefore(new Date(doc.due_date), thirtyDaysFromNow) && 
      !isBefore(new Date(doc.due_date), today) && // Não vencidas 
      !doc.paid // Ainda não pagas
    )
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
    
  const payablesNext30Days = payablesData
    .filter((exp: any) => exp.date && isBefore(new Date(exp.date), thirtyDaysFromNow))
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    
  const cashFlowNext30Days = receivablesNext30Days - payablesNext30Days;
  
  // Due alerts (next 7 days) - valor total em vez da contagem
  const dueFaturas = receivablesData
    .filter((doc: any) => 
      doc.due_date && 
      isBefore(new Date(doc.due_date), sevenDaysFromNow) && 
      !doc.paid // Mostrar apenas faturas pendentes
    );
  
  const dueAlertsCount = dueFaturas.length;
  
  // Total financeiro dos alertas
  const dueAlerts = dueFaturas
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
    
  // Payables next 7 days
  const payablesNext7Days = payablesData
    .filter((exp: any) => exp.date && isBefore(new Date(exp.date), sevenDaysFromNow))
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  // Receita - documentos pagos no período selecionado
  const { startDate, endDate } = dateFilterRange;
  
  // Documentos pagos no período selecionado
  const paidDocumentsInPeriod = financialDocuments?.filter((doc: any) => {
    if (!doc.paid || !doc.payment_date) return false;
    return isDateInRange(doc.payment_date);
  }) || [];
  
  console.log(`Documentos pagos no período ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}:`, paidDocumentsInPeriod.length);
  
  // Valor total dos documentos pagos no período selecionado
  const periodRevenue = paidDocumentsInPeriod
    .reduce((sum: number, doc: any) => {
      console.log(`Documento #${doc.id} (Receita ${getPeriodLabel()}): R$${doc.amount}`);
      return sum + (doc.amount || 0);
    }, 0);
  
  // Despesas no período selecionado - incluindo todas as despesas, mesmo as pendentes
  const periodExpenses = expenses
    ?.filter((exp: any) => {
      // Filtrar apenas as despesas dentro do período selecionado
      return isDateInRange(exp.date);
    })
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
    
  // Total de faturas recebidas (todas as que já foram pagas)
  const totalPaidInvoices = financialDocuments
    ?.filter((doc: any) => doc.paid === true)
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0) || 0;
    
  // Total de despesas aprovadas
  const totalApprovedExpenses = expenses
    ?.filter((exp: any) => exp.approved === true)
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
  
  // Gross margin para o período selecionado
  const grossMargin = periodRevenue > 0 
    ? ((periodRevenue - periodExpenses) / periodRevenue) * 100 
    : 0;
  
  // Calcular total de minutos de vídeo (com base nos projetos)
  const totalMinutes = projects
    ?.filter((p: any) => p.duration)
    .reduce((sum: number, p: any) => sum + (p.duration || 0), 0) || 1; // Usar 1 como mínimo para evitar divisão por zero
  
  const avgCostPerMinute = periodExpenses > 0 ? periodExpenses / totalMinutes : 0;
  
  // Average collection period (calculado dinamicamente)
  // A fórmula usada é: (Contas a receber / Receita do período) * 30 dias
  const dso = totalReceivables > 0 && periodRevenue > 0 
    ? Math.round((totalReceivables / periodRevenue) * 30) 
    : 0;

  // Dashboard KPIs reorganizados em grid 3x2
  const kpis: FinancialKPI[] = [
    {
      title: "A Receber",
      value: totalReceivables,
      icon: <CreditCard className="h-5 w-5" />,
      description: "Total de faturas a receber",
      variant: "blue"
    },
    {
      title: "A Pagar",
      value: totalPayables,
      icon: <Receipt className="h-5 w-5" />,
      description: "Total de despesas pendentes",
      variant: "red"
    },
    {
      title: "Fluxo de Caixa",
      value: cashFlowNext30Days,
      icon: <TrendingUp className="h-5 w-5" />,
      description: "Próximos 30 dias",
      variant: cashFlowNext30Days >= 0 ? "green" : "red"
    },
    {
      title: "Receita",
      value: periodRevenue,
      icon: <DollarSign className="h-5 w-5" />,
      description: `${paidDocumentsInPeriod.length} pagamento(s) - ${getPeriodLabel()}`,
      variant: "green"
    },
    {
      title: "Despesas",
      value: periodExpenses,
      icon: <FileText className="h-5 w-5" />,
      description: `Total despesas - ${getPeriodLabel()}`,
      variant: "red"
    },
    {
      title: "Margem Bruta",
      value: `${grossMargin.toFixed(1)}%`,
      icon: <BarChart className="h-5 w-5" />,
      description: "Lucro antes de despesas fixas",
      variant: grossMargin >= 30 ? "green" : grossMargin >= 15 ? "blue" : "red"
    }
  ];

  // Chart data for dashboard - calculado a partir de dados reais
  // Cria último semestre de dados financeiros
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 5 + i);
    return {
      date: date,
      month: format(date, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + format(date, 'MMM', { locale: ptBR }).slice(1),
      year: date.getFullYear(),
      monthNumber: date.getMonth(),
      receita: 0,
      despesas: 0
    };
  });
  
  // Preenche com dados reais quando disponíveis
  if (financialDocuments && financialDocuments.length > 0) {
    financialDocuments.forEach((doc: any) => {
      if (doc.paid && doc.payment_date) {
        const paymentDate = new Date(doc.payment_date);
        const monthData = last6Months.find(m => 
          m.monthNumber === paymentDate.getMonth() && 
          m.year === paymentDate.getFullYear()
        );
        
        if (monthData) {
          monthData.receita += doc.amount || 0;
        }
      }
    });
  }
  
  if (expenses && expenses.length > 0) {
    expenses.forEach((exp: any) => {
      // Incluir todas as despesas, mesmo as que não são aprovadas
      if (exp.date) {
        const expenseDate = new Date(exp.date);
        const monthData = last6Months.find(m => 
          m.monthNumber === expenseDate.getMonth() && 
          m.year === expenseDate.getFullYear()
        );
        
        if (monthData) {
          monthData.despesas += exp.amount || 0;
        }
      }
    });
  }
  
  const monthlyData = last6Months.map(m => ({
    month: m.month,
    receita: m.receita,
    despesas: m.despesas
  }));

  // Expense categories data - calculado dinamicamente a partir dos dados reais
  // Identificando quais despesas são do processo de seed e quais foram criadas pelo usuário
  // Despesas do seed são as que têm description específica e foram criadas com paid_by = user específico
  const seedUserIds = [1, 2, 3]; // IDs dos usuários criados pelo seed
  const seedExpenseDescriptions = [
    "Aluguel de equipamento de iluminação",
    "Hospedagem para filmagem em campo",
    "Licenças de software para edição"
  ];
  
  const expenseCategoriesMap: Record<string, number> = {};
  
  if (expenses && expenses.length > 0) {
    // Filtrar para usar apenas despesas que NÃO são do seed
    const userExpenses = expenses.filter((exp: any) => {
      return !(
        seedUserIds.includes(exp.paid_by) && 
        seedExpenseDescriptions.includes(exp.description)
      );
    });
    
    // Se tiver alguma despesa criada pelo usuário, usamos apenas estas
    if (userExpenses.length > 0) {
      userExpenses.forEach((exp: any) => {
        if (exp.category) {
          const category = exp.category.charAt(0).toUpperCase() + exp.category.slice(1);
          if (!expenseCategoriesMap[category]) {
            expenseCategoriesMap[category] = 0;
          }
          expenseCategoriesMap[category] += exp.amount || 0;
        }
      });
    }
  }
  
  const expenseCategoriesData = Object.keys(expenseCategoriesMap).map(category => ({
    name: category,
    value: expenseCategoriesMap[category]
  }));

  // Client distribution data - calculado a partir de dados reais
  const clientDistributionMap: Record<string, number> = {};
  
  if (financialDocuments && financialDocuments.length > 0 && clients && clients.length > 0) {
    financialDocuments.forEach((doc: any) => {
      if (doc.client_id) {
        const client = clients.find((c: any) => c.id === doc.client_id);
        if (client && client.name) {
          if (!clientDistributionMap[client.name]) {
            clientDistributionMap[client.name] = 0;
          }
          clientDistributionMap[client.name] += doc.amount || 0;
        }
      }
    });
  }
  
  const clientDistributionData = Object.keys(clientDistributionMap).map(clientName => ({
    name: clientName,
    value: clientDistributionMap[clientName]
  })).sort((a, b) => b.value - a.value).slice(0, 5); // Apenas os 5 maiores clientes

  // Project margin data - incluindo projetos em andamento e concluídos
  const projectMarginData = projects?.filter((project: any) => {
    // Incluir apenas projetos ativos (em andamento ou concluídos)
    return project.status !== 'canceled' && project.status !== 'delayed' && project.status !== 'paused';
  }).map((project: any) => {
    const client = clients?.find((c: any) => c.id === project.client_id);
    
    const projectRevenue = financialDocuments
      ?.filter((doc: any) => doc.project_id === project.id && doc.document_type === 'invoice')
      .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0) || 0;
      
    const projectExpenses = expenses
      ?.filter((exp: any) => exp.project_id === project.id)
      .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
      
    const projectMargin = projectRevenue > 0 
      ? ((projectRevenue - projectExpenses) / projectRevenue) * 100 
      : 0;
      
    return {
      id: project.id,
      name: project.name,
      client: client?.name || "Cliente",
      revenue: projectRevenue,
      expenses: projectExpenses,
      margin: projectMargin,
      status: project.status
    };
  }).sort((a: any, b: any) => b.margin - a.margin) || []; // Removido o .slice(0, 5) para mostrar todos

  // Não usamos mais dados de exemplo - apenas dados reais do banco de dados

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Gerenciamento financeiro e análise de performance</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {period === "custom" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px]">
                  {customDateRange.from && customDateRange.to ? (
                    `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`
                  ) : (
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Selecionar período
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to
                  }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setCustomDateRange({
                        from: range.from,
                        to: range.to || range.from
                      });
                    }
                  }}
                  initialFocus
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3">
                  <div className="text-sm font-medium mb-2">
                    {getPeriodLabel()}
                  </div>
                  <Calendar
                    mode="single"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    disabled
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          
          <NewFinancialRecordDialog initialTab={selectedTab === "payables" ? "expense" : "income"} />
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <Tabs defaultValue="dashboard" className="w-full" onValueChange={setSelectedTab}>
        <div className="border-b mb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <TabsList className="h-10 mb-2 sm:mb-0">
              <TabsTrigger value="dashboard" className="rounded-none data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:shadow-none">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="receivables" className="rounded-none data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:shadow-none">
                A Receber
              </TabsTrigger>
              <TabsTrigger value="payables" className="rounded-none data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:shadow-none">
                A Pagar
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-8">
          {/* KPI Cards - Layout 3x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((kpi, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{kpi.title}</p>
                      <h2 className={cn("text-2xl font-bold", 
                        kpi.variant === "green" ? "text-green-600" : 
                        kpi.variant === "red" ? "text-red-600" : 
                        kpi.variant === "blue" ? "text-blue-600" : 
                        kpi.variant === "amber" ? "text-amber-600" : 
                        "text-foreground"
                      )}>
                        {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                    </div>
                    <div className={cn("p-2 rounded-full", 
                      kpi.variant === "green" ? "bg-green-100" : 
                      kpi.variant === "red" ? "bg-red-100" : 
                      kpi.variant === "blue" ? "bg-blue-100" : 
                      kpi.variant === "amber" ? "bg-amber-100" : 
                      "bg-gray-100"
                    )}>
                      {kpi.icon}
                    </div>
                  </div>
                  
                  {kpi.change !== undefined && (
                    <div className="flex items-center mt-4 text-sm">
                      {kpi.change > 0 ? (
                        <div className="flex items-center text-green-600">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          <span>+{kpi.change}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          <span>{kpi.change}%</span>
                        </div>
                      )}
                      <span className="text-muted-foreground ml-1.5">vs período anterior</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Informações sobre pagamentos recebidos e despesas pagas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Faturas Recebidas</CardTitle>
                <CardDescription>Total histórico de valores recebidos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-green-600">{formatCurrency(totalPaidInvoices)}</span>
                    <span className="text-sm text-muted-foreground mt-1">Total de {financialDocuments?.filter((doc: any) => doc.paid === true).length || 0} faturas pagas</span>
                  </div>
                  <div className="h-14 w-14 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Despesas Pagas</CardTitle>
                <CardDescription>Total histórico de despesas aprovadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-amber-600">{formatCurrency(totalApprovedExpenses)}</span>
                    <span className="text-sm text-muted-foreground mt-1">Total de {expenses?.filter((exp: any) => exp.approved === true).length || 0} despesas aprovadas</span>
                  </div>
                  <div className="h-14 w-14 bg-amber-100 rounded-full flex items-center justify-center">
                    <Receipt className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts and Tables */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Fluxo de Caixa Mensal</CardTitle>
                  <CardDescription>Receitas vs despesas por mês</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Exportar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Filtrar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <FinancialChart 
                  type="area"
                  title=""
                  data={monthlyData}
                  dataKeys={['receita', 'despesas']}
                  xAxisDataKey="month"
                  colors={['#10B981', '#EF4444']}
                  height={300}
                />
              </CardContent>
            </Card>
            
            <div className="grid gap-6 grid-cols-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">Distribuição de Despesas</CardTitle>
                    <CardDescription>Por categoria</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <FinancialChart 
                    type="pie"
                    title=""
                    data={expenseCategoriesData}
                    dataKeys={['value']}
                    xAxisDataKey="name"
                    colors={['#EF4444', '#F59E0B', '#6366F1', '#10B981']}
                    height={200}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">Receita por Cliente</CardTitle>
                    <CardDescription>Principais clientes</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <FinancialChart 
                    type="pie"
                    title=""
                    data={clientDistributionData}
                    dataKeys={['value']}
                    xAxisDataKey="name"
                    colors={['#10B981', '#6366F1', '#F59E0B']}
                    height={200}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Margin and DSO Metrics */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Margem por Projeto</CardTitle>
                <CardDescription>Todos os projetos ativos por margem de lucro</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">PROJETO</TableHead>
                        <TableHead>CLIENTE</TableHead>
                        <TableHead className="text-right">RECEITA</TableHead>
                        <TableHead className="text-right pr-6">MARGEM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectMarginData.map((project, index) => (
                        <TableRow key={project.id} className="group hover:bg-muted/50">
                          <TableCell className="font-medium pl-6">{project.name}</TableCell>
                          <TableCell>{project.client}</TableCell>
                          <TableCell className="text-right">{formatCurrency(project.revenue)}</TableCell>
                          <TableCell className="text-right pr-6">
                            <span className={`font-medium ${
                              project.margin > 40 ? 'text-green-600' : 
                              project.margin > 20 ? 'text-amber-600' : 
                              'text-red-600'
                            }`}>
                              {typeof project.margin === 'number' ? project.margin.toFixed(1) : project.margin}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Tempo Médio de Recebimento</CardTitle>
                <CardDescription>Dias entre emissão e pagamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center p-4">
                  <div className="text-5xl font-bold text-blue-600">{dso}</div>
                  <div className="text-sm text-muted-foreground mt-1">dias em média</div>
                  
                  <div className="w-full mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Ótimo (&lt;30 dias)</span>
                        <span>30</span>
                      </div>
                      <Progress value={dso > 30 ? 100 : (dso / 30) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Bom (30-45 dias)</span>
                        <span>45</span>
                      </div>
                      <Progress 
                        value={dso > 45 ? 100 : dso < 30 ? 0 : ((dso - 30) / 15) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Regular (45-60 dias)</span>
                        <span>60</span>
                      </div>
                      <Progress 
                        value={dso > 60 ? 100 : dso < 45 ? 0 : ((dso - 45) / 15) * 100} 
                        className="h-2" 
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      O tempo médio de recebimento (DSO) mede a eficiência do ciclo de cobrança. 
                      Quanto menor o valor, mais rápido a empresa está convertendo faturas em caixa.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="mt-6 space-y-6">
          <FinancialTableHeader
            title="A Receber"
            type="receivables"
            totalCount={receivablesData.length}
            pendingCount={receivablesData.filter((doc: any) => !doc.paid).length}
            pendingAmount={receivablesData.filter((doc: any) => !doc.paid).reduce((sum: number, doc: any) => sum + doc.amount, 0)}
            searchTerm={receivablesSearchTerm}
            onSearchChange={setReceivablesSearchTerm}
            statusFilter={receivablesStatusFilter}
            onStatusFilterChange={setReceivablesStatusFilter}
            sortConfig={sortConfig}
            onSort={handleSort}
            onAddNew={() => setNewRecordDialog({ open: true, type: 'invoice' })}
            formatCurrency={formatCurrency}
          />
          
          <FinancialQuickStats
            type="receivables"
            stats={{
              total: totalReceivables,
              overdue: overdueReceivables,
              next7Days: receivablesNext7Days,
              next30Days: receivablesNext30Days,
              overdueCount: receivablesData.filter((doc: any) => !doc.paid && doc.due_date && isBefore(new Date(doc.due_date), now)).length,
              next7DaysCount: receivablesData.filter((doc: any) => !doc.paid && doc.due_date && isBefore(new Date(doc.due_date), sevenDaysFromNow) && !isBefore(new Date(doc.due_date), now)).length,
            }}
            formatCurrency={formatCurrency}
          />
          
          {/* Receivables Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          FATURA
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleSort('document_number')}
                          >
                            {sortConfig.field === 'document_number' && sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          CLIENTE
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleSort('client_name')}
                          >
                            {sortConfig.field === 'client_name' && sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>PROJETO</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          EMISSÃO
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleSort('issue_date')}
                          >
                            {sortConfig.field === 'issue_date' && sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          VENCIMENTO
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleSort('due_date')}
                          >
                            {sortConfig.field === 'due_date' && sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          VALOR
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleSort('amount')}
                          >
                            {sortConfig.field === 'amount' && sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead className="text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData.length > 0 ? receivablesData.map((doc: any) => {
                      const client = clients?.find((c: any) => c.id === doc.client_id);
                      const project = projects?.find((p: any) => p.id === doc.project_id);
                      const isOverdue = !doc.paid && doc.due_date && isBefore(new Date(doc.due_date), now);
                      
                      return (
                        <TableRow 
                          key={doc.id} 
                          className={cn(
                            "group hover:bg-muted/50",
                            doc.paid && "bg-green-50/50 hover:bg-green-50/70" // Destacar linhas de itens pagos
                          )}
                        >
                          <TableCell className="font-medium">{doc.document_number || `${doc.id}`}</TableCell>
                          <TableCell>{client?.name || '-'}</TableCell>
                          <TableCell>{project?.name || '-'}</TableCell>
                          <TableCell>
                            {/* Formatação da data de emissão com dia/mês/ano - busca do projeto associado ou calcula com base no vencimento */}
                            {project?.issue_date ? 
                              format(new Date(project.issue_date), 'dd/MM/yyyy') : 
                              doc.due_date ? 
                                format(subDays(new Date(doc.due_date), (project?.payment_term || 30)), 'dd/MM/yyyy') : 
                                '-'}
                          </TableCell>
                          <TableCell>
                            {doc.due_date ? (
                              <div className="flex items-center">
                                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                  {/* Formatação da data de vencimento com dia/mês/ano */}
                                  {format(parseISO(doc.due_date), 'dd/MM/yyyy')}
                                </span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Vencida
                                  </Badge>
                                )}
                                {doc.invoice_file && (
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <FileText className="ml-2 h-4 w-4 text-green-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Nota fiscal anexada</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(doc.amount)}
                          </TableCell>
                          <TableCell>
                            <FinancialStatusBadge
                              status={doc.status}
                              paid={doc.paid}
                              dueDate={doc.due_date}
                              type="receivable"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <FinancialRecordActions 
                              record={doc} 
                              type="document"
                              onViewDetails={(record) => setDetailsRecord({ record, type: "document" })}
                              onRegisterPayment={(record) => setPaymentRecord({ record, type: "document" })}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          <p className="text-muted-foreground">Nenhum registro encontrado</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 border-t">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                <div className="text-sm text-muted-foreground">
                  Mostrando {receivablesData.length || 0} de {receivablesData.length || 0} registros
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Total pendente:</span>
                  <span className="font-bold">{formatCurrency(
                    receivablesData
                      .filter((doc: any) => !doc.paid)
                      .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0)
                  )}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Total recebido:</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalPaidInvoices)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Próxima
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Previsão de Recebimentos</CardTitle>
                <CardDescription>Fluxo de caixa previsto para os próximos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancialChart 
                  type="bar"
                  title=""
                  data={calculateUpcomingReceivables(financialDocuments)}
                  dataKeys={['value']}
                  xAxisDataKey="name"
                  colors={['#6366F1']}
                  height={230}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Distribuição por Cliente</CardTitle>
                <CardDescription>Valores a receber por cliente</CardDescription>
              </CardHeader>
              <CardContent>
                {clientDistributionData.length > 0 ? (
                  <FinancialChart 
                    type="pie"
                    title=""
                    data={clientDistributionData}
                    dataKeys={['value']}
                    xAxisDataKey="name"
                    colors={['#10B981', '#6366F1', '#F59E0B']}
                    height={230}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">Sem dados de clientes</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      Adicione faturas para visualizar a distribuição por cliente
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payables Tab */}
        <TabsContent value="payables" className="mt-6 space-y-6">
          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar despesa, fornecedor ou projeto..."
                className="w-full sm:w-[300px] pl-8"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filtros
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[220px] p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Status</h4>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="approved">Aprovados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Categoria</h4>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="equipment">Equipamentos</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="location">Locação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Data</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">De</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                <span>Selecionar</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Até</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                <span>Selecionar</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm">Limpar</Button>
                      <Button size="sm">Aplicar</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="outline" size="sm" className="h-9">
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
              </Button>
              
            </div>
          </div>
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">A Pagar (Total)</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPayables)}</p>
                </div>
                <Wallet className="h-8 w-8 text-amber-600" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Próximos 7 dias</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(payablesNext7Days)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Despesa Mensal</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(periodExpenses)}</p>
                </div>
                <BarChart className="h-8 w-8 text-blue-600" />
              </CardContent>
            </Card>
          </div>
          
          {/* Payables Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DESCRIÇÃO</TableHead>
                      <TableHead>CATEGORIA</TableHead>
                      <TableHead>PROJETO</TableHead>
                      <TableHead>DATA</TableHead>
                      <TableHead className="text-right">VALOR</TableHead>
                      <TableHead>RESPONSÁVEL</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead className="text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payablesData.length > 0 ? payablesData.map((exp: any) => {
                      const project = projects?.find((p: any) => p.id === exp.project_id);
                      const paidBy = expenses?.find((u: any) => u.id === exp.paid_by)?.name;
                      const isToday = exp.date && (new Date(exp.date).toDateString() === now.toDateString());
                      
                      return (
                        <TableRow 
                          key={exp.id} 
                          className={cn(
                            "group hover:bg-muted/50",
                            exp.approved && "bg-amber-50/50 hover:bg-amber-50/70" // Destacar linhas de itens aprovados
                          )}
                        >
                          <TableCell className="font-medium">{exp.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {exp.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{project?.name || '-'}</TableCell>
                          <TableCell>
                            {exp.date ? (
                              <div className="flex items-center">
                                <span>
                                  {format(new Date(exp.date), 'dd/MM/yyyy')}
                                </span>
                                {isToday && (
                                  <Badge variant="success" className="ml-2 text-xs">
                                    Hoje
                                  </Badge>
                                )}
                                {exp.invoice_file && (
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <FileText className="ml-2 h-4 w-4 text-green-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Nota fiscal anexada</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(exp.amount)}
                          </TableCell>
                          <TableCell>{paidBy || '-'}</TableCell>
                          <TableCell>
                            <FinancialStatusBadge
                              status="pending"
                              approved={exp.approved}
                              type="payable"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <FinancialRecordActions 
                              record={exp} 
                              type="expense"
                              onViewDetails={(record) => setDetailsRecord({ record, type: "expense" })}
                              onRegisterPayment={(record) => setPaymentRecord({ record, type: "expense" })}
                              onEditExpense={(expense) => setEditExpense(expense)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          <p className="text-muted-foreground">Nenhum registro encontrado</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 border-t">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                <div className="text-sm text-muted-foreground">
                  Mostrando {payablesData.length || 0} de {payablesData.length || 0} registros
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Total pendente:</span>
                  <span className="font-bold">{formatCurrency(
                    payablesData
                      .filter((exp: any) => !exp.approved)
                      .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
                  )}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Total aprovado:</span>
                  <span className="font-bold text-amber-600">{formatCurrency(totalApprovedExpenses)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Próxima
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição de gastos por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseCategoriesData.length > 0 ? (
                  <FinancialChart 
                    type="pie"
                    title=""
                    data={expenseCategoriesData}
                    dataKeys={['value']}
                    xAxisDataKey="name"
                    colors={['#EF4444', '#F59E0B', '#6366F1', '#10B981']}
                    height={250}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <PieChart className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">Sem despesas registradas</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      Adicione despesas para visualizar a distribuição por categoria
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Despesas por Projeto</CardTitle>
                <CardDescription>Gastos por projeto vs orçamento</CardDescription>
              </CardHeader>
              <CardContent>
                {expenses && expenses.length > 0 ? (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-5">
                      {projects && projects.length > 0 ? (
                        projects.map((project: any) => {
                          // Calcular o total de despesas desse projeto
                          const projectExpenses = expenses.filter((exp: any) => exp.project_id === project.id);
                          const totalExpenses = projectExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
                          
                          // Se não houver despesas neste projeto, não mostrar
                          if (totalExpenses === 0) return null;
                          
                          // Calcular a porcentagem em relação ao orçamento
                          const budget = project.budget || 1; // Para evitar divisão por zero
                          const percentUsed = Math.min(100, Math.round((totalExpenses / budget) * 100)) || 0;
                          
                          return (
                            <div className="space-y-1.5" key={project.id}>
                              <div className="flex justify-between">
                                <span className="font-medium text-sm">{project.name}</span>
                                <span className="text-sm text-muted-foreground">{percentUsed}% do orçamento</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={percentUsed} className="h-2" />
                                <span className={`text-xs font-medium ${percentUsed > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {formatCurrency(totalExpenses)}
                                </span>
                              </div>
                            </div>
                          );
                        }).filter(Boolean)
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-sm text-muted-foreground">Nenhum projeto com despesas encontrado</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center h-[250px]">
                    <BarChart className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">Sem despesas registradas</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      Adicione despesas para visualizar gastos por projeto
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Diálogos para exibir detalhes e registrar pagamentos */}
      {detailsRecord && (
        <FinancialRecordDetails
          open={!!detailsRecord}
          onOpenChange={(open) => !open && setDetailsRecord(null)}
          record={detailsRecord.record}
          type={detailsRecord.type}
        />
      )}
      
      {paymentRecord && (
        <PaymentRegistrationDialog
          open={!!paymentRecord}
          onOpenChange={(open) => !open && setPaymentRecord(null)}
          record={paymentRecord.record}
          type={paymentRecord.type}
        />
      )}

      {/* Diálogo de edição de despesa */}
      {editExpense && (
        <EditExpenseDialog
          expense={editExpense}
          open={!!editExpense}
          onOpenChange={(open) => !open && setEditExpense(null)}
        />
      )}
    </div>
  );
}