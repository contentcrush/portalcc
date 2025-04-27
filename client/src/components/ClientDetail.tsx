import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency, getInitials, calculatePercentChange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  CalendarClock, 
  Plus, 
  FileText,
  Download,
  Eye,
  Filter
} from "lucide-react";
import type { ClientWithDetails } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { getInteractionIcon } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UserAvatar from "./UserAvatar";

interface ClientDetailProps {
  clientId: number;
}

export default function ClientDetail({ clientId }: ClientDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId
  });

  const { data: projects } = useQuery({
    queryKey: [`/api/clients/${clientId}/projects`],
    enabled: !!clientId
  });

  const { data: interactions } = useQuery({
    queryKey: [`/api/clients/${clientId}/interactions`],
    enabled: !!clientId
  });

  const { data: financialDocuments } = useQuery({
    queryKey: [`/api/clients/${clientId}/financial-documents`],
    enabled: !!clientId
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users']
  });

  if (isLoadingClient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium">Cliente não encontrado</h3>
        <p className="text-muted-foreground">O cliente solicitado não existe ou foi removido.</p>
      </div>
    );
  }

  // Calculate financial metrics
  const totalRevenue = financialDocuments?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
  const paidRevenue = financialDocuments?.filter(doc => doc.paid)
    .reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
  const pendingRevenue = totalRevenue - paidRevenue;
  
  const percentPaidRevenue = totalRevenue > 0 
    ? Math.round((paidRevenue / totalRevenue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Cliente</h1>
          <p className="text-sm text-gray-500">Visualizando informações completas do cliente</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <img src={client.avatar || ''} alt="" className="w-4 h-4 mr-2 rounded-full" />
            Editar
          </Button>
          <Button size="sm" className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6">
                <div className="bg-blue-100 text-blue-600 rounded-full w-16 h-16 flex items-center justify-center font-semibold text-2xl">
                  {getInitials(client.name)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{client.name}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>Cliente desde {formatDate(client.since)}</span>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                INFORMAÇÕES DE CONTATO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contato Principal</p>
                    <p className="font-medium">{client.contactName || 'Não informado'}</p>
                    <p className="text-sm text-gray-500">{client.contactPosition || ''}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{client.contactEmail || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium">{client.contactPhone || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Endereço</p>
                    <p className="font-medium">{client.address || 'Não informado'}</p>
                    <p className="text-sm text-gray-500">{client.city || ''}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                DADOS ADICIONAIS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Cliente</p>
                    <p className="font-medium">{client.type || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Badge className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Categoria</p>
                    <p className="font-medium">{client.category || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CNPJ</p>
                    <p className="font-medium">{client.cnpj || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <p className="font-medium">
                      {client.website ? (
                        <a href={`https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {client.website}
                        </a>
                      ) : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {client.notes && (
                <>
                  <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">
                    NOTAS
                  </h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200">
                    {client.notes}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Projects section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Projetos</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todos os projetos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PROJETO</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>PRAZO</TableHead>
                    <TableHead className="text-right">VALOR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects?.length > 0 ? (
                    projects.map(project => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={project.status === 'concluido' ? 'success' : 'secondary'}
                            className="capitalize"
                          >
                            {project.status === 'concluido' ? 'Concluído' : project.status === 'em_andamento' ? 'Em andamento' : project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(project.endDate)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.budget)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhum projeto encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="interactions">Histórico de Interações</TabsTrigger>
              <TabsTrigger value="financial">Documentos Financeiros</TabsTrigger>
            </TabsList>
            
            <TabsContent value="interactions" className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Histórico de Interações</h3>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Interação
                </Button>
              </div>
              
              <div className="space-y-4">
                {interactions?.length > 0 ? (
                  interactions.map(interaction => {
                    const user = users?.find(u => u.id === interaction.user_id);
                    const iconName = getInteractionIcon(interaction.type as any);
                    
                    return (
                      <div key={interaction.id} className="flex gap-3">
                        <div className={`mt-1 p-2 rounded-full bg-${interaction.type === 'feedback' ? 'yellow' : interaction.type === 'documento' ? 'green' : 'blue'}-100 text-${interaction.type === 'feedback' ? 'yellow' : interaction.type === 'documento' ? 'green' : 'blue'}-600`}>
                          <div className="h-4 w-4" dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="${iconName === 'video' ? 'M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z' : iconName === 'mail' ? 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' : iconName === 'message-square' ? 'M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' : 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'}" /></svg>` }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium">{interaction.title}</span>
                              <Badge variant={interaction.type === 'reuniao' ? 'blue' : interaction.type === 'feedback' ? 'warning' : 'success'} className="ml-2 capitalize">
                                {interaction.type === 'reuniao' ? 'Reunião' : 
                                  interaction.type === 'email' ? 'Email' : 
                                  interaction.type === 'feedback' ? 'Feedback' : 
                                  'Documento'}
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(interaction.date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {interaction.description}
                          </p>
                          <div className="flex items-center mt-2">
                            <UserAvatar user={user} className="h-5 w-5 mr-2" />
                            <span className="text-xs text-gray-500">{user?.name || 'Usuário'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma interação registrada para este cliente.
                  </div>
                )}
              </div>
              
              <Button variant="ghost" size="sm" className="w-full mt-4">
                Ver histórico completo
              </Button>
            </TabsContent>
            
            <TabsContent value="financial">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Documentos Financeiros</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DOCUMENTO</TableHead>
                    <TableHead>PROJETO</TableHead>
                    <TableHead>DATA</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">VALOR</TableHead>
                    <TableHead className="text-right">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialDocuments?.length > 0 ? (
                    financialDocuments.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`p-1 rounded mr-2 ${doc.document_type === 'invoice' ? 'bg-red-100 text-red-600' : doc.document_type === 'contract' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{doc.document_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {doc.document_type === 'invoice' ? 'Fatura' : 
                                 doc.document_type === 'contract' ? 'Contrato' : 
                                 doc.document_type === 'proposal' ? 'Proposta' : 'Recibo'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{projects?.find(p => p.id === doc.project_id)?.name || '-'}</TableCell>
                        <TableCell>{formatDate(doc.due_date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              doc.status === 'pago' ? 'success' : 
                              doc.status === 'pendente' ? 'warning' : 
                              'secondary'
                            }
                            className="capitalize"
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(doc.amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Nenhum documento financeiro encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* KPIs */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Projetos Totais</p>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-bold">{projects?.length || 0}</span>
                    {projects?.length > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
                        +{projects.filter(p => p.creation_date && new Date(p.creation_date) > new Date(new Date().setMonth(new Date().getMonth() - 3))).length} nos últimos 3 meses
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Valor Faturado</p>
                  <div className="mt-1">
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-green-600">
                      + 30% vs anterior
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Tempo de Retenção</p>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-bold">
                      {client.since ? (
                        `${Math.max(1, Math.floor(
                          (new Date().getTime() - new Date(client.since).getTime()) / (1000 * 60 * 60 * 24 * 30)
                        ) / 12).toFixed(1)} anos`
                      ) : 'N/A'}
                    </span>
                    {client.since && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                        Cliente desde {format(new Date(client.since), 'MMM yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Status Financeiro</p>
                  <Badge variant="outline">{formatCurrency(pendingRevenue)} a receber</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentPaidRevenue}%` }}></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{formatCurrency(paidRevenue)} pago</span>
                  <span>{percentPaidRevenue}% do total</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Responsible internal contacts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase text-gray-500">
                RESPONSÁVEIS INTERNOS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((_, index) => (
                <div key={index} className="flex items-center">
                  <img 
                    src={`https://randomuser.me/api/portraits/${index === 0 ? 'men' : 'women'}/${index === 0 ? '32' : index === 1 ? '44' : '29'}.jpg`}
                    alt="Responsável" 
                    className="w-8 h-8 rounded-full mr-3" 
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {index === 0 ? 'Bruno Silva' : index === 1 ? 'Ana Oliveira' : 'Carlos Mendes'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {index === 0 ? 'Gerente de Marketing' : index === 1 ? 'Produtora' : 'Designer'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Documents section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium uppercase text-gray-500">
                  DOCUMENTOS RECENTES
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1.5 bg-red-100 text-red-600 rounded mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Contrato_BancoAzul_2025.pdf</p>
                    <p className="text-xs text-gray-500">323 KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Proposta_Videos_Redes.pdf</p>
                    <p className="text-xs text-gray-500">1.5 MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1.5 bg-green-100 text-green-600 rounded mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Orçamento_Detalhado.xlsx</p>
                    <p className="text-xs text-gray-500">258 KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Storyboard_Campanha.pdf</p>
                    <p className="text-xs text-gray-500">4.2 MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Upcoming meetings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase text-gray-500">
                PRÓXIMAS REUNIÕES
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Amanhã, 14:00</p>
                  <Badge variant="outline" className="text-xs">
                    20 min
                  </Badge>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <p className="text-sm">Apresentação do Storyboard</p>
                </div>
                <div className="flex items-center mt-1 ml-4 text-xs text-gray-500">
                  <img 
                    src="https://randomuser.me/api/portraits/men/32.jpg" 
                    alt="Responsável" 
                    className="w-5 h-5 rounded-full mr-1" 
                  />
                  <span>RM: Ricardo Mendes</span>
                  <span className="ml-2 px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-600">Zoom</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">26/04, 15:30</p>
                  <Badge variant="outline" className="text-xs">
                    1h
                  </Badge>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <p className="text-sm">Aprovação Final - Cartão Premium</p>
                </div>
                <div className="flex items-center mt-1 ml-4 text-xs text-gray-500">
                  <img 
                    src="https://randomuser.me/api/portraits/men/32.jpg" 
                    alt="Responsável" 
                    className="w-5 h-5 rounded-full mr-1" 
                  />
                  <span>BA: Banco Azul</span>
                  <span className="ml-2 px-1 py-0.5 rounded text-xs bg-green-100 text-green-600">Presencial</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
