import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Download, 
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useState } from "react";

interface FinancialTableHeaderProps {
  title: string;
  type: "receivables" | "payables";
  totalCount: number;
  pendingCount: number;
  pendingAmount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortConfig: {
    field: string;
    direction: 'asc' | 'desc';
  };
  onSort: (field: string) => void;
  onAddNew: () => void;
  onExport?: () => void;
  formatCurrency: (value: number) => string;
}

export function FinancialTableHeader({
  title,
  type,
  totalCount,
  pendingCount,
  pendingAmount,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortConfig,
  onSort,
  onAddNew,
  onExport,
  formatCurrency
}: FinancialTableHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const statusOptions = type === "receivables" 
    ? [
        { value: "all", label: "Todos os Status", icon: null },
        { value: "pending", label: "Pendentes", icon: <Clock className="h-4 w-4" /> },
        { value: "overdue", label: "Vencidas", icon: <AlertCircle className="h-4 w-4" /> },
        { value: "paid", label: "Pagas", icon: <CheckCircle className="h-4 w-4" /> }
      ]
    : [
        { value: "all", label: "Todos os Status", icon: null },
        { value: "pending", label: "Pendentes", icon: <Clock className="h-4 w-4" /> },
        { value: "approved", label: "Aprovadas", icon: <CheckCircle className="h-4 w-4" /> },
        { value: "rejected", label: "Rejeitadas", icon: <AlertCircle className="h-4 w-4" /> }
      ];

  const sortOptions = [
    { value: "id", label: "Data de Criação" },
    { value: "amount", label: "Valor" },
    { value: "due_date", label: type === "receivables" ? "Vencimento" : "Data" },
    { value: "client_name", label: type === "receivables" ? "Cliente" : "Categoria" }
  ];

  return (
    <div className="space-y-4">
      {/* Header with title and summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="text-sm">
              {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} • {formatCurrency(pendingAmount)}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
          <Button onClick={onAddNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar {type === "receivables" ? "Fatura" : "Despesa"}
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar ${type === "receivables" ? "faturas" : "despesas"}...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {sortConfig.direction === 'asc' ? (
                <SortAsc className="h-4 w-4 mr-2" />
              ) : (
                <SortDesc className="h-4 w-4 mr-2" />
              )}
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSort(option.value)}
                className="flex items-center justify-between"
              >
                {option.label}
                {sortConfig.field === option.value && (
                  sortConfig.direction === 'asc' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Advanced Filters */}
        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Período</label>
                <Select defaultValue="all">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    <SelectItem value="this-month">Este mês</SelectItem>
                    <SelectItem value="last-month">Mês passado</SelectItem>
                    <SelectItem value="this-quarter">Este trimestre</SelectItem>
                    <SelectItem value="this-year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Valor</label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Min" type="number" />
                  <Input placeholder="Max" type="number" />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm">Aplicar</Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}