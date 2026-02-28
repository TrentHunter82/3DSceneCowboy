import { WebSocketServer, WebSocket } from 'ws'
import { createServer, IncomingMessage, ServerResponse } from 'http'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Room {
  id: string
  clients: Map<string, ClientInfo>
  hostPeerId: string | null
}

interface ClientInfo {
  ws: WebSocket
  peerId: string
  userName: string
  joinedAt: number
}

interface WSMessage {
  type: string
  roomId: string
  peerId: string
  timestamp: number
  payload: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '8787', 10)
const MAX_CLIENTS_PER_ROOM = 10
const HEARTBEAT_TIMEOUT_MS = 60_000
const HEARTBEAT_INTERVAL_MS = 30_000

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>()

/**
 * Track liveness per socket. Updated on every pong; checked periodically.
 */
const alive = new WeakMap<WebSocket, boolean>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId)
  if (!room) {
    room = { id: roomId, clients: new Map(), hostPeerId: null }
    rooms.set(roomId, room)
    console.log(`[room] created: ${roomId}`)
  }
  return room
}

function removeClientFromRoom(peerId: string, roomId: string): void {
  const room = rooms.get(roomId)
  if (!room) return

  const removed = room.clients.delete(peerId)
  if (!removed) return

  console.log(`[room] ${peerId} left ${roomId} (${room.clients.size} remaining)`)

  // If room is now empty, clean it up
  if (room.clients.size === 0) {
    rooms.delete(roomId)
    console.log(`[room] deleted: ${roomId}`)
    return
  }

  // Reassign host if the leaving client was the host
  if (room.hostPeerId === peerId) {
    const firstClient = room.clients.values().next()
    if (!firstClient.done) {
      room.hostPeerId = firstClient.value.peerId
      console.log(`[room] new host for ${roomId}: ${room.hostPeerId}`)

      // Notify the new host
      sendTo(firstClient.value.ws, {
        type: 'host-assigned',
        roomId,
        peerId: firstClient.value.peerId,
        timestamp: Date.now(),
        payload: null,
      })
    } else {
      room.hostPeerId = null
    }
  }

  // Broadcast departure to remaining clients
  broadcast(room, peerId, {
    type: 'peer-left',
    roomId,
    peerId,
    timestamp: Date.now(),
    payload: { peerId },
  })
}

function sendTo(ws: WebSocket, msg: WSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg))
    } catch (err) {
      console.error('[send] failed:', err)
    }
  }
}

function sendError(ws: WebSocket, roomId: string, peerId: string, message: string): void {
  sendTo(ws, {
    type: 'error',
    roomId,
    peerId,
    timestamp: Date.now(),
    payload: { message },
  })
}

function broadcast(room: Room, excludePeerId: string, msg: WSMessage): void {
  for (const [id, client] of room.clients) {
    if (id !== excludePeerId) {
      sendTo(client.ws, msg)
    }
  }
}

function parseRoomIdFromUrl(url: string | undefined): string | null {
  if (!url) return null
  // Expect /ws/:roomId
  const match = url.match(/^\/ws\/([a-zA-Z0-9_-]+)$/)
  return match ? match[1] : null
}

// ---------------------------------------------------------------------------
// HTTP server (health check + upgrade)
// ---------------------------------------------------------------------------

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'GET' && req.url === '/health') {
    const body = JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      uptime: process.uptime(),
    })
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(body)
    return
  }

  // Everything else gets a 404
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ noServer: true })

httpServer.on('upgrade', (req, socket, head) => {
  const roomId = parseRoomIdFromUrl(req.url)

  if (!roomId) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
    socket.destroy()
    return
  }

  // Check room capacity before accepting the upgrade
  const existingRoom = rooms.get(roomId)
  if (existingRoom && existingRoom.clients.size >= MAX_CLIENTS_PER_ROOM) {
    socket.write('HTTP/1.1 403 Room Full\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, roomId)
  })
})

wss.on('connection', (ws: WebSocket, _req: IncomingMessage, roomId: string) => {
  // The client must send a 'join' message with their peerId and userName
  // before they can participate. Track the association once joined.
  let clientPeerId: string | null = null
  let clientRoomId: string = roomId

  alive.set(ws, true)

  ws.on('pong', () => {
    alive.set(ws, true)
  })

  ws.on('message', (data) => {
    let msg: WSMessage

    try {
      const raw = typeof data === 'string' ? data : data.toString('utf-8')
      msg = JSON.parse(raw) as WSMessage
    } catch {
      sendError(ws, clientRoomId, clientPeerId ?? 'unknown', 'Invalid JSON')
      return
    }

    // Basic validation
    if (!msg.type || !msg.peerId) {
      sendError(ws, clientRoomId, clientPeerId ?? 'unknown', 'Missing required fields: type, peerId')
      return
    }

    // Ensure the roomId in the message matches the connection path
    if (msg.roomId && msg.roomId !== clientRoomId) {
      sendError(ws, clientRoomId, msg.peerId, 'roomId mismatch with connection path')
      return
    }

    switch (msg.type) {
      case 'join':
        handleJoin(ws, clientRoomId, msg)
        clientPeerId = msg.peerId
        break

      case 'leave':
        handleLeave(clientRoomId, msg)
        clientPeerId = null
        break

      case 'presence':
        handleRelay(clientRoomId, msg)
        break

      case 'scene-diff':
        handleRelay(clientRoomId, msg)
        break

      case 'scene-full':
        handleSceneFull(clientRoomId, msg)
        break

      case 'request-full':
        handleRequestFull(ws, clientRoomId, msg)
        break

      default:
        sendError(ws, clientRoomId, msg.peerId, `Unknown message type: ${msg.type}`)
    }
  })

  ws.on('close', () => {
    if (clientPeerId) {
      removeClientFromRoom(clientPeerId, clientRoomId)
      clientPeerId = null
    }
  })

  ws.on('error', (err) => {
    console.error(`[ws] error for peer ${clientPeerId ?? 'unknown'}:`, err.message)
    if (clientPeerId) {
      removeClientFromRoom(clientPeerId, clientRoomId)
      clientPeerId = null
    }
  })
})

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

function handleJoin(ws: WebSocket, roomId: string, msg: WSMessage): void {
  const room = getOrCreateRoom(roomId)
  const { peerId } = msg
  const userName = (msg.payload as { userName?: string })?.userName ?? 'Anonymous'

  // Reject if room is at capacity (double-check after upgrade)
  if (room.clients.size >= MAX_CLIENTS_PER_ROOM) {
    sendError(ws, roomId, peerId, 'Room is full')
    ws.close(4001, 'Room full')
    return
  }

  // Reject duplicate peerId in same room
  if (room.clients.has(peerId)) {
    sendError(ws, roomId, peerId, 'Peer ID already exists in room')
    ws.close(4002, 'Duplicate peer ID')
    return
  }

  const clientInfo: ClientInfo = {
    ws,
    peerId,
    userName,
    joinedAt: Date.now(),
  }

  room.clients.set(peerId, clientInfo)

  // First client becomes the host
  const isHost = room.hostPeerId === null
  if (isHost) {
    room.hostPeerId = peerId
  }

  console.log(`[room] ${peerId} (${userName}) joined ${roomId} [${room.clients.size} clients, host=${room.hostPeerId}]`)

  // Build current peer list for the joiner
  const peers = Array.from(room.clients.entries())
    .filter(([id]) => id !== peerId)
    .map(([id, info]) => ({
      peerId: id,
      userName: info.userName,
      isHost: id === room.hostPeerId,
    }))

  // Confirm join to the new client
  sendTo(ws, {
    type: 'joined',
    roomId,
    peerId,
    timestamp: Date.now(),
    payload: {
      isHost,
      peers,
      hostPeerId: room.hostPeerId,
    },
  })

  // Broadcast to existing clients
  broadcast(room, peerId, {
    type: 'peer-joined',
    roomId,
    peerId,
    timestamp: Date.now(),
    payload: { peerId, userName },
  })

  // If this client is not the host, request full scene from the host
  if (!isHost && room.hostPeerId) {
    const hostClient = room.clients.get(room.hostPeerId)
    if (hostClient) {
      sendTo(hostClient.ws, {
        type: 'request-full',
        roomId,
        peerId,
        timestamp: Date.now(),
        payload: { requesterPeerId: peerId },
      })
    }
  }
}

function handleLeave(roomId: string, msg: WSMessage): void {
  removeClientFromRoom(msg.peerId, roomId)
}

function handleRelay(roomId: string, msg: WSMessage): void {
  const room = rooms.get(roomId)
  if (!room) return

  // Only allow messages from clients actually in the room
  if (!room.clients.has(msg.peerId)) return

  broadcast(room, msg.peerId, msg)
}

function handleSceneFull(roomId: string, msg: WSMessage): void {
  const room = rooms.get(roomId)
  if (!room) return

  // scene-full is directed at a specific requester
  const targetPeerId = (msg.payload as { targetPeerId?: string })?.targetPeerId
  if (!targetPeerId) return

  const targetClient = room.clients.get(targetPeerId)
  if (!targetClient) return

  sendTo(targetClient.ws, msg)
}

function handleRequestFull(ws: WebSocket, roomId: string, msg: WSMessage): void {
  const room = rooms.get(roomId)
  if (!room) return

  // Forward request to the host
  if (!room.hostPeerId) {
    sendError(ws, roomId, msg.peerId, 'No host available')
    return
  }

  const hostClient = room.clients.get(room.hostPeerId)
  if (!hostClient) {
    sendError(ws, roomId, msg.peerId, 'Host not connected')
    return
  }

  sendTo(hostClient.ws, {
    type: 'request-full',
    roomId,
    peerId: msg.peerId,
    timestamp: Date.now(),
    payload: { requesterPeerId: msg.peerId },
  })
}

// ---------------------------------------------------------------------------
// Heartbeat - detect stale connections
// ---------------------------------------------------------------------------

const heartbeatInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (alive.get(ws) === false) {
      console.log('[heartbeat] terminating stale connection')
      ws.terminate()
      continue
    }
    alive.set(ws, false)
    ws.ping()
  }
}, HEARTBEAT_INTERVAL_MS)

wss.on('close', () => {
  clearInterval(heartbeatInterval)
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(): void {
  console.log('\n[server] shutting down...')

  // Close all WebSocket connections
  for (const ws of wss.clients) {
    ws.close(1001, 'Server shutting down')
  }

  wss.close(() => {
    httpServer.close(() => {
      console.log('[server] stopped')
      process.exit(0)
    })
  })

  // Force exit after timeout
  setTimeout(() => {
    console.error('[server] forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`Collaboration server running on port ${PORT}`)
  console.log(`  WebSocket: ws://localhost:${PORT}/ws/:roomId`)
  console.log(`  Health:    http://localhost:${PORT}/health`)
})
