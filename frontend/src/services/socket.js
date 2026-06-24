import { io } from 'socket.io-client'

let socket

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:3333', {
      transports: ['websocket', 'polling'],
    })
  }

  return socket
}
