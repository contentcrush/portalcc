import express from 'express';
import { insertClientMeetingSchema, insertEventSchema } from '@shared/schema';
import { storage } from '../storage';
import { authenticateJWT } from '../auth';

const router = express.Router();

// Get all meetings for a client
router.get('/client/:clientId/meetings', authenticateJWT, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'ID do cliente inválido' });
    }

    const meetings = await storage.getClientMeetings(clientId);
    res.json(meetings);
  } catch (error) {
    console.error('Erro ao buscar reuniões do cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar reuniões' });
  }
});

// Get a specific meeting
router.get('/client-meetings/:id', authenticateJWT, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      return res.status(400).json({ message: 'ID da reunião inválido' });
    }
    
    const meeting = await storage.getClientMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Reunião não encontrada' });
    }
    
    res.json(meeting);
  } catch (error) {
    console.error('Erro ao buscar reunião:', error);
    res.status(500).json({ message: 'Erro ao buscar reunião' });
  }
});

// Create a new meeting
router.post('/client-meetings', authenticateJWT, async (req, res) => {
  try {
    // Validate the request body using the meeting schema
    const validatedData = insertClientMeetingSchema.parse({
      ...req.body,
      organized_by: req.user.id // From JWT authentication
    });
    
    // Calculate end date based on meeting date and duration
    const meetingDate = new Date(validatedData.meeting_date);
    const endDate = new Date(meetingDate);
    endDate.setMinutes(endDate.getMinutes() + validatedData.duration_minutes);
    
    // Create calendar event for this meeting
    const newEvent = await storage.createEvent({
      title: validatedData.title,
      description: validatedData.notes || '',
      client_id: validatedData.client_id,
      user_id: req.user.id,
      event_type: 'meeting',
      all_day: false,
      start_date: meetingDate,
      end_date: endDate,
      status: 'scheduled',
      location: validatedData.location || '',
      color: '#4CAF50' // Green color for meetings
    });
    
    // Create meeting record in database and link it to the calendar event
    const newMeeting = await storage.createClientMeeting({
      ...validatedData,
      related_event_id: newEvent.id
    });
    
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ message: 'Erro ao criar reunião' });
  }
});

// Update a meeting
router.patch('/client-meetings/:id', authenticateJWT, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      return res.status(400).json({ message: 'ID da reunião inválido' });
    }
    
    const meeting = await storage.getClientMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Reunião não encontrada' });
    }
    
    // Update the meeting
    const updatedMeeting = await storage.updateClientMeeting(meetingId, req.body);
    
    // If meeting date or duration changed, update the associated calendar event
    if (req.body.meeting_date || req.body.duration_minutes) {
      const eventId = meeting.related_event_id;
      if (eventId) {
        const event = await storage.getEvent(eventId);
        if (event) {
          // Calculate new start and end dates
          const meetingDate = req.body.meeting_date ? new Date(req.body.meeting_date) : new Date(meeting.meeting_date);
          const duration = req.body.duration_minutes || meeting.duration_minutes;
          const endDate = new Date(meetingDate);
          endDate.setMinutes(endDate.getMinutes() + duration);
          
          // Update event
          await storage.updateEvent(eventId, {
            title: req.body.title || event.title,
            description: req.body.notes || event.description,
            start_date: meetingDate,
            end_date: endDate,
            location: req.body.location || event.location
          });
        }
      }
    }
    
    res.json(updatedMeeting);
  } catch (error) {
    console.error('Erro ao atualizar reunião:', error);
    res.status(500).json({ message: 'Erro ao atualizar reunião' });
  }
});

// Delete a meeting
router.delete('/client-meetings/:id', authenticateJWT, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      return res.status(400).json({ message: 'ID da reunião inválido' });
    }
    
    const meeting = await storage.getClientMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Reunião não encontrada' });
    }
    
    // Delete the associated calendar event
    if (meeting.related_event_id) {
      await storage.deleteEvent(meeting.related_event_id);
    }
    
    // Delete the meeting
    const result = await storage.deleteClientMeeting(meetingId);
    
    if (result) {
      res.json({ success: true, message: 'Reunião excluída com sucesso' });
    } else {
      res.status(500).json({ message: 'Erro ao excluir reunião' });
    }
  } catch (error) {
    console.error('Erro ao excluir reunião:', error);
    res.status(500).json({ message: 'Erro ao excluir reunião' });
  }
});

export default router;