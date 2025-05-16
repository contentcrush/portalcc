import React, { useState } from 'react';
import { Copy, Check, X, Link, Lock, Share, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

interface User {
  id: number;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
}

interface SharedPermission {
  type: 'user' | 'team' | 'public';
  id?: number;
  name?: string;
  accessLevel: 'view' | 'edit' | 'admin';
}

interface FileShareDialogProps {
  open: boolean;
  onClose: () => void;
  file: {
    id: number | string;
    name: string;
    type: string;
  };
  users: User[];
  teams?: { id: number; name: string }[];
  currentPermissions?: SharedPermission[];
  onUpdatePermissions: (permissions: SharedPermission[]) => Promise<void>;
  onGenerateLink: () => Promise<string>;
}

const FileShareDialog: React.FC<FileShareDialogProps> = ({
  open,
  onClose,
  file,
  users,
  teams = [],
  currentPermissions = [],
  onUpdatePermissions,
  onGenerateLink,
}) => {
  const [activeTab, setActiveTab] = useState('users');
  const [permissions, setPermissions] = useState<SharedPermission[]>(currentPermissions);
  const [linkAccess, setLinkAccess] = useState<'none' | 'view' | 'edit'>('none');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedUserAccess, setSelectedUserAccess] = useState<'view' | 'edit' | 'admin'>('view');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId);
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
  };

  const handleAddUserPermission = () => {
    if (!selectedUser) return;
    
    const userId = parseInt(selectedUser);
    const user = users.find(u => u.id === userId);
    
    // Verificar se o usuário já tem permissões
    if (permissions.some(p => p.type === 'user' && p.id === userId)) {
      toast({
        title: "Usuário já adicionado",
        description: "Este usuário já possui permissões para este arquivo",
        variant: "destructive",
      });
      return;
    }
    
    setPermissions([
      ...permissions,
      {
        type: 'user',
        id: userId,
        name: user?.name,
        accessLevel: selectedUserAccess,
      }
    ]);
    
    setSelectedUser('');
  };

  const handleAddTeamPermission = () => {
    if (!selectedTeam) return;
    
    const teamId = parseInt(selectedTeam);
    const team = teams.find(t => t.id === teamId);
    
    // Verificar se o time já tem permissões
    if (permissions.some(p => p.type === 'team' && p.id === teamId)) {
      toast({
        title: "Equipe já adicionada",
        description: "Esta equipe já possui permissões para este arquivo",
        variant: "destructive",
      });
      return;
    }
    
    setPermissions([
      ...permissions,
      {
        type: 'team',
        id: teamId,
        name: team?.name,
        accessLevel: selectedUserAccess,
      }
    ]);
    
    setSelectedTeam('');
  };

  const handleRemovePermission = (index: number) => {
    const newPermissions = [...permissions];
    newPermissions.splice(index, 1);
    setPermissions(newPermissions);
  };

  const handleUpdateAccessLevel = (index: number, accessLevel: 'view' | 'edit' | 'admin') => {
    const newPermissions = [...permissions];
    newPermissions[index].accessLevel = accessLevel;
    setPermissions(newPermissions);
  };

  const handleGenerateLink = async () => {
    if (linkAccess === 'none') {
      toast({
        title: "Selecione um nível de acesso",
        description: "Selecione o nível de acesso para o link antes de gerar",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Adicionar permissão pública se não existir
      const hasPublicPermission = permissions.some(p => p.type === 'public');
      
      if (!hasPublicPermission) {
        setPermissions([
          ...permissions,
          {
            type: 'public',
            accessLevel: linkAccess,
          }
        ]);
      } else {
        // Atualizar permissão pública existente
        const newPermissions = permissions.map(p => 
          p.type === 'public' ? { ...p, accessLevel: linkAccess } : p
        );
        setPermissions(newPermissions);
      }
      
      const link = await onGenerateLink();
      setShareLink(link);
    } catch (error) {
      toast({
        title: "Erro ao gerar link",
        description: "Ocorreu um erro ao gerar o link de compartilhamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareLink) return;
    
    navigator.clipboard.writeText(shareLink);
    setIsLinkCopied(true);
    
    setTimeout(() => {
      setIsLinkCopied(false);
    }, 2000);
    
    toast({
      title: "Link copiado",
      description: "Link de compartilhamento copiado para a área de transferência",
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      await onUpdatePermissions(permissions);
      
      toast({
        title: "Permissões atualizadas",
        description: "As permissões de compartilhamento foram atualizadas com sucesso",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao atualizar permissões",
        description: "Ocorreu um erro ao atualizar as permissões de compartilhamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Compartilhar arquivo
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-2">
          <h3 className="text-sm font-medium mb-2">Arquivo:</h3>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
            <div className="p-2 bg-primary/10 rounded">
              <FileIconComponent file={file} />
            </div>
            <div className="overflow-hidden">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{file.type}</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Pessoas
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-1">
              <Link className="h-4 w-4" />
              Link compartilhável
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-grow">
                  <Select value={selectedUser} onValueChange={handleSelectUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Select 
                  value={selectedUserAccess} 
                  onValueChange={(value) => setSelectedUserAccess(value as any)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Visualizar</SelectItem>
                    <SelectItem value="edit">Editar</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={handleAddUserPermission} disabled={!selectedUser}>
                  Adicionar
                </Button>
              </div>
              
              {teams.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <div className="flex-grow">
                    <Select value={selectedTeam} onValueChange={handleSelectTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Select 
                    value={selectedUserAccess} 
                    onValueChange={(value) => setSelectedUserAccess(value as any)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">Visualizar</SelectItem>
                      <SelectItem value="edit">Editar</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleAddTeamPermission} disabled={!selectedTeam}>
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Pessoas com acesso</h3>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2">
                  {permissions.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Nenhuma pessoa ou equipe com acesso
                    </p>
                  ) : (
                    permissions.map((permission, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/40 rounded-md">
                        <div className="flex items-center gap-2">
                          {permission.type === 'user' && (
                            <Avatar className="h-7 w-7">
                              <AvatarImage 
                                src={users.find(u => u.id === permission.id)?.avatar} 
                                alt={permission.name || 'Usuário'} 
                              />
                              <AvatarFallback>
                                {(permission.name || 'U').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          {permission.type === 'team' && (
                            <Users className="h-5 w-5" />
                          )}
                          
                          {permission.type === 'public' && (
                            <Globe className="h-5 w-5" />
                          )}
                          
                          <div>
                            <p className="text-sm font-medium">
                              {permission.type === 'public' 
                                ? 'Compartilhamento público' 
                                : permission.name || 'Usuário'}
                            </p>
                            {permission.type !== 'public' && (
                              <p className="text-xs text-muted-foreground">
                                {permission.type === 'user' ? 'Usuário' : 'Equipe'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Select 
                            value={permission.accessLevel} 
                            onValueChange={(value) => handleUpdateAccessLevel(index, value as any)}
                          >
                            <SelectTrigger className="h-8 w-[90px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">Visualizar</SelectItem>
                              <SelectItem value="edit">Editar</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => handleRemovePermission(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Gerar link de compartilhamento</h3>
              <p className="text-sm text-muted-foreground">
                Qualquer pessoa com o link poderá acessar este arquivo com o nível de permissão selecionado.
              </p>
              
              <RadioGroup 
                value={linkAccess} 
                onValueChange={(value) => setLinkAccess(value as any)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="flex items-center gap-1">
                    <Lock className="h-4 w-4" /> Desativado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="view" id="view" />
                  <Label htmlFor="view">Somente visualização</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="edit" id="edit" />
                  <Label htmlFor="edit">Edição</Label>
                </div>
              </RadioGroup>
            </div>
            
            {linkAccess !== 'none' && (
              <div className="pt-2">
                {shareLink ? (
                  <div className="flex space-x-2">
                    <Input 
                      value={shareLink} 
                      readOnly 
                      className="flex-grow font-mono text-sm"
                    />
                    <Button 
                      onClick={handleCopyLink} 
                      className="shrink-0"
                    >
                      {isLinkCopied ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copiar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleGenerateLink} 
                    disabled={linkAccess === 'none' || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>Gerando link...</>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Gerar link
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componente auxiliar para renderizar ícone para o tipo de arquivo
const FileIconComponent = ({ file }: { file: { type: string, name: string } }) => {
  if (file.type.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  } else if (file.type === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  } else {
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  }
};

export default FileShareDialog;