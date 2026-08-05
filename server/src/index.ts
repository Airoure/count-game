import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './socketHandlers.js'

const PORT = 3001

const app = express()
const httpServer = createServer(app)

// 健康检查接口
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sushu-daochang-server' })
})

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST'],
  },
})

registerSocketHandlers(io)

httpServer.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════╗`)
  console.log(`║  数感道场 · 对战服务器`)
  console.log(`║  端口: ${PORT}`)
  console.log(`║  WebSocket: ws://localhost:${PORT}`)
  console.log(`╚══════════════════════════════════════╝`)
})
