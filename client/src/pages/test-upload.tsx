import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState<string>('1'); // Default client ID = 1
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Documentos Gerais');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);

  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [meetingDescription, setMeetingDescription] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [meetingDuration, setMeetingDuration] = useState<string>('60');
  const [meetingLocation, setMeetingLocation] = useState<string>('');
  const [meetingType, setMeetingType] = useState<string>('Presencial');
  const [meetings, setMeetings] = useState<any[]>([]);

  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadDocument = async () => {
    if (!file || !clientId) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo e um cliente",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);
      
      if (description) {
        formData.append('description', description);
      }
      
      if (category) {
        formData.append('category', category);
      }

      const response = await fetch('/api/clients/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar documento: ${response.statusText}`);
      }

      const data = await response.json();

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso",
      });

      // Reload documents
      fetchDocuments();

      // Reset form
      setFile(null);
      setDescription('');
      setUploadProgress(0);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: `Falha ao enviar documento: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const createMeeting = async () => {
    if (!clientId || !meetingTitle || !meetingDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os campos obrigatórios (título e data)",
        variant: "destructive",
      });
      return;
    }

    try {
      const meetingData = {
        title: meetingTitle,
        description: meetingDescription || null,
        meeting_date: new Date(meetingDate).toISOString(),
        duration_minutes: parseInt(meetingDuration),
        location: meetingLocation || null,
        meeting_type: meetingType
      };

      const response = await apiRequest('POST', `/api/clients/${clientId}/meetings`, meetingData);
      
      if (!response.ok) {
        throw new Error(`Erro ao criar reunião: ${response.statusText}`);
      }

      const data = await response.json();

      toast({
        title: "Sucesso",
        description: "Reunião agendada com sucesso",
      });

      // Reload meetings
      fetchMeetings();

      // Reset form
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDate('');
      setMeetingDuration('60');
      setMeetingLocation('');
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast({
        title: "Erro",
        description: `Falha ao agendar reunião: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const fetchDocuments = async () => {
    try {
      if (!clientId) return;
      
      const response = await fetch(`/api/clients/${clientId}/documents`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar documentos: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUploadedDocs(data);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({
        title: "Erro",
        description: `Falha ao carregar documentos: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const fetchMeetings = async () => {
    try {
      if (!clientId) return;
      
      const response = await fetch(`/api/clients/${clientId}/meetings`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar reuniões: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMeetings(data);
    } catch (error) {
      console.error('Erro ao buscar reuniões:', error);
      toast({
        title: "Erro",
        description: `Falha ao carregar reuniões: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Inicialmente carregar documentos e reuniões quando o ID do cliente mudar
  React.useEffect(() => {
    fetchDocuments();
    fetchMeetings();
  }, [clientId]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Teste de Upload e Agendamento</h1>

      <div className="mb-4">
        <label htmlFor="clientId" className="block text-sm font-medium mb-1">
          ID do Cliente
        </label>
        <Input
          id="clientId"
          type="number"
          min="1"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full md:w-64"
        />
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="meetings">Reuniões</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Documento</CardTitle>
              <CardDescription>
                Adicione documentos para o cliente selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium mb-1">
                    Arquivo
                  </label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {file.name} ({formatFileSize(file.size)})
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Descrição
                  </label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição do documento"
                    disabled={isUploading}
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-1">
                    Categoria
                  </label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Categoria do documento"
                    disabled={isUploading}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={uploadDocument} disabled={isUploading}>
                {isUploading ? 'Enviando...' : 'Enviar Documento'}
              </Button>
            </CardFooter>
          </Card>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Documentos Enviados</h2>
            {uploadedDocs.length === 0 ? (
              <p className="text-muted-foreground">Nenhum documento encontrado para este cliente.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {uploadedDocs.map((doc) => (
                  <Card key={doc.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{doc.file_name}</CardTitle>
                      <CardDescription>
                        {doc.category || 'Sem categoria'} • {formatFileSize(doc.file_size || 0)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{doc.description || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Enviado em {formatDate(doc.upload_date)}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Baixar arquivo
                      </a>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <CardTitle>Agendar Reunião</CardTitle>
              <CardDescription>
                Agende uma nova reunião com o cliente selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="meeting-title" className="block text-sm font-medium mb-1">
                    Título *
                  </label>
                  <Input
                    id="meeting-title"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Título da reunião"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="meeting-description" className="block text-sm font-medium mb-1">
                    Descrição
                  </label>
                  <Input
                    id="meeting-description"
                    value={meetingDescription}
                    onChange={(e) => setMeetingDescription(e.target.value)}
                    placeholder="Descrição da reunião"
                  />
                </div>

                <div>
                  <label htmlFor="meeting-date" className="block text-sm font-medium mb-1">
                    Data e Hora *
                  </label>
                  <Input
                    id="meeting-date"
                    type="datetime-local"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="meeting-duration" className="block text-sm font-medium mb-1">
                    Duração (minutos)
                  </label>
                  <Input
                    id="meeting-duration"
                    type="number"
                    min="15"
                    step="15"
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="meeting-location" className="block text-sm font-medium mb-1">
                    Local
                  </label>
                  <Input
                    id="meeting-location"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    placeholder="Local da reunião"
                  />
                </div>

                <div>
                  <label htmlFor="meeting-type" className="block text-sm font-medium mb-1">
                    Tipo
                  </label>
                  <select
                    id="meeting-type"
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Online">Online</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={createMeeting}>
                Agendar Reunião
              </Button>
            </CardFooter>
          </Card>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Reuniões Agendadas</h2>
            {meetings.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma reunião encontrada para este cliente.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {meetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{meeting.title}</CardTitle>
                      <CardDescription>
                        {meeting.meeting_type} • {meeting.duration_minutes} minutos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium mb-1">
                        Data: {formatDate(meeting.meeting_date)}
                      </p>
                      {meeting.location && (
                        <p className="text-sm mb-2">Local: {meeting.location}</p>
                      )}
                      <p className="text-sm">{meeting.description || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Criada em {formatDate(meeting.created_at || meeting.meeting_date)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}