import { Server as SocketIOServer } from "socket.io";

// Inicializada como nula e depois será atribuída pelo routes.ts
export let io: SocketIOServer;

// Função para configurar o socket.io
export function setupSocketIO(socketIOInstance: SocketIOServer) {
  io = socketIOInstance;
}