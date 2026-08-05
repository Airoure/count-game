import { io, type Socket } from 'socket.io-client'
import type {
  BattleConfig,
  BattlePlayer,
  OpponentProgress,
  BattleResultEntry,
  Question,
} from '@/types'

/**
 * 服务器地址
 *
 * 开发环境：直连本地后端 localhost:3001
 * 生产环境：同源（空字符串），由 Nginx 反向代理 /socket.io/ 到后端
 */
const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3001' : ''

/** Socket 单例 */
let socket: Socket | null = null

/** 获取 Socket 单例 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

/** 断开 Socket 连接 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

// ===== 事件类型定义 =====

export interface ServerToClientEvents {
  'battle:player_joined': (payload: { playerId: string; name: string }) => void
  'battle:player_left': (payload: { playerId: string; name: string }) => void
  'battle:started': (payload: {
    questions: Question[]
    startTime: number
    config: BattleConfig
  }) => void
  'battle:progress': (progress: OpponentProgress) => void
  'battle:game_over': (payload: { results: BattleResultEntry[] }) => void
}

export interface ClientToServerEvents {
  'battle:create': (
    payload: { name: string; config: BattleConfig },
    ack: (res: {
      roomId: string
      playerId: string
      players: BattlePlayer[]
      config: BattleConfig
      isHost: boolean
      error?: string
    }) => void,
  ) => void
  'battle:join': (
    payload: { roomId: string; name: string },
    ack: (res: {
      roomId: string
      playerId: string
      players: BattlePlayer[]
      config: BattleConfig
      isHost: boolean
      error?: string
    }) => void,
  ) => void
  'battle:start': (
    payload: { roomId: string },
    ack: (res: { ok?: boolean; error?: string }) => void,
  ) => void
  'battle:answer': (
    payload: { roomId: string; answer: number },
    ack: (res: {
      correct: boolean
      correctAnswer: number
      playerFinished: boolean
      error?: string
    }) => void,
  ) => void
  'battle:leave': (payload: { roomId: string }) => void
}
