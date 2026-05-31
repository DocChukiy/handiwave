import { chats } from '../data/bookings.js'

export async function getMessages() {
  return {
    data: chats,
    error: null,
  }
}

export async function sendMessage(message) {
  return {
    data: {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...message,
    },
    error: null,
  }
}
