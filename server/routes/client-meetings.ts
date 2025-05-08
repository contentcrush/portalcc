import { Router } from 'express';
import { storage } from '../storage';
import { insertClientMeetingSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Obter todas as reuniões de um cliente
router.get('/:clientId/meetings', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const meetings = await storage.getClientMeetings(clientId);
    res.json(meetings);
  } catch (error) {
    console.error('Erro ao buscar reuniões do cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar reuniões do cliente' });
  }
});

// Obter uma reunião específica
router.get('/meetings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const meeting = await storage.getClientMeeting(id);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    res.json(meeting);
  } catch (error) {
    console.error('Erro ao buscar reunião:', error);
    res.status(500).json({ error: 'Erro ao buscar reunião' });
  }
});

// Criar uma nova reunião
router.post('/:clientId/meetings', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const clientId = parseInt(req.params.clientId);
    
    // Validar os dados do corpo da requisição usando o schema
    try {
      const meetingData = insertClientMeetingSchema.parse({
        client_id: clientId,
        title: req.body.title,
        description: req.body.description,
        meeting_date: req.body.meeting_date,
        duration_minutes: req.body.duration_minutes,
        location: req.body.location,
        meeting_type: req.body.meeting_type,
        organized_by: req.user.id
      });
      
      // Criar a reunião no banco
      const meeting = await storage.createClientMeeting(meetingData);
      
      // TODO: Criar evento no calendário se necessário
      // Isso seria feito através de uma função que cria um evento no calendário
      // e então atualiza a reunião com o ID do evento
      
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ error: 'Erro ao criar reunião' });
  }
});

// Atualizar uma reunião
router.patch('/meetings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const meeting = await storage.getClientMeeting(id);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    // Campos permitidos para atualização
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      meeting_date: req.body.meeting_date ? new Date(req.body.meeting_date) : undefined,
      duration_minutes: req.body.duration_minutes,
      location: req.body.location,
      meeting_type: req.body.meeting_type
    };
    
    const updatedMeeting = await storage.updateClientMeeting(id, updateData);
    
    // TODO: Atualizar evento no calendário se a reunião tiver um evento associado
    
    res.json(updatedMeeting);
  } catch (error) {
    console.error('Erro ao atualizar reunião:', error);
    res.status(500).json({ error: 'Erro ao atualizar reunião' });
  }
});

// Deletar uma reunião
router.delete('/meetings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const meeting = await storage.getClientMeeting(id);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    
    // TODO: Deletar evento no calendário se a reunião tiver um evento associado
    
    const success = await storage.deleteClientMeeting(id);
    
    if (success) {
      res.status(200).json({ message: 'Reunião removida com sucesso' });
    } else {
      res.status(500).json({ error: 'Erro ao remover reunião do banco de dados' });
    }
  } catch (error) {
    console.error('Erro ao deletar reunião:', error);
    res.status(500).json({ error: 'Erro ao deletar reunião' });
  }
});

export default router;