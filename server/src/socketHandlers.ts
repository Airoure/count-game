import type { Server, Socket } from 'socket.io'
import { RoomManager } from './RoomManager.js'
import type { BattleConfig } from './types.js'

/**
 * Socket 事件处理器
 *
 * 处理客户端的创建房间、加入房间、开始游戏、提交答案、离开房间等事件
 */
export function registerSocketHandlers(io: Server): void {
  const manager = new RoomManager()

  io.on('connection', (socket: Socket) => {
    console.log(`[连接] ${socket.id}`)

    // ===== 创建房间 =====
    socket.on('battle:create', (payload: { name: string; config: BattleConfig }, ack?: (res: unknown) => void) => {
      const { name, config } = payload
      if (!name || !config || !config.operations?.length || !config.totalCount) {
        ack?.({ error: '参数不合法' })
        return
      }

      const room = manager.createRoom(socket.id, name, config)
      socket.join(room.id)

      const result = {
        roomId: room.id,
        playerId: socket.id,
        players: room.getPlayers().map((p) => ({ id: p.id, name: p.name, isHost: p.isHost })),
        config: room.config,
        isHost: true,
      }

      ack?.(result)
      console.log(`[创建房间] ${room.id} by ${name}`)
    })

    // ===== 加入房间 =====
    socket.on('battle:join', (payload: { roomId: string; name: string }, ack?: (res: unknown) => void) => {
      const { roomId, name } = payload
      if (!roomId || !name) {
        ack?.({ error: '参数不合法' })
        return
      }

      const room = manager.getRoom(roomId.toUpperCase())
      if (!room) {
        ack?.({ error: '房间不存在' })
        return
      }
      if (!room.isWaiting) {
        ack?.({ error: '游戏已开始，无法加入' })
        return
      }

      const joined = manager.joinRoom(roomId.toUpperCase(), socket.id, name)
      if (!joined) {
        ack?.({ error: '加入失败' })
        return
      }

      socket.join(room.id)

      const result = {
        roomId: room.id,
        playerId: socket.id,
        players: room.getPlayers().map((p) => ({ id: p.id, name: p.name, isHost: p.isHost })),
        config: room.config,
        isHost: false,
      }

      ack?.(result)

      // 通知房间内其他玩家
      socket.to(room.id).emit('battle:player_joined', {
        playerId: socket.id,
        name,
      })

      console.log(`[加入房间] ${name} → ${room.id}`)
    })

    // ===== 开始游戏 =====
    socket.on('battle:start', (payload: { roomId: string }, ack?: (res: unknown) => void) => {
      const room = manager.getRoom(payload.roomId)
      if (!room) {
        ack?.({ error: '房间不存在' })
        return
      }
      if (socket.id !== room.hostId) {
        ack?.({ error: '只有房主可以开始游戏' })
        return
      }
      if (room.playerCount < 2) {
        ack?.({ error: '至少需要 2 名玩家' })
        return
      }

      const questions = room.startGame()
      if (!questions) {
        ack?.({ error: '无法开始游戏' })
        return
      }

      ack?.({ ok: true })

      // 广播给房间内所有玩家
      io.to(room.id).emit('battle:started', {
        questions,
        startTime: room.gameStartTime,
        config: room.config,
      })

      console.log(`[游戏开始] 房间 ${room.id}, ${questions.length} 题`)
    })

    // ===== 提交答案 =====
    socket.on('battle:answer', (payload: { roomId: string; answer: number }, ack?: (res: unknown) => void) => {
      const room = manager.getRoom(payload.roomId)
      if (!room || !room.isPlaying) {
        ack?.({ error: '游戏未在进行中' })
        return
      }

      const result = room.submitAnswer(socket.id, payload.answer)
      if (!result) {
        ack?.({ error: '无法提交答案' })
        return
      }

      // 回复提交者判定结果
      ack?.({
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        playerFinished: result.playerFinished,
      })

      // 广播进度给房间内其他玩家
      const progress = room.getPlayerProgress(socket.id)
      if (progress) {
        socket.to(room.id).emit('battle:progress', progress)
      }

      // 如果游戏结束（第一个完成）
      if (result.gameEnded) {
        const results = room.getResults()
        io.to(room.id).emit('battle:game_over', { results })
        console.log(`[游戏结束] 房间 ${room.id}, 胜者: ${results[0]?.name}`)
      }
    })

    // ===== 离开房间 =====
    const handleLeave = () => {
      const removed = manager.removePlayer(socket.id)
      if (removed) {
        const { room, player } = removed
        socket.to(room.id).emit('battle:player_left', {
          playerId: socket.id,
          name: player.name,
        })

        // 如果游戏正在进行且剩余玩家不足，结束游戏
        if (room.isPlaying && room.playerCount < 2) {
          const results = room.getResults()
          io.to(room.id).emit('battle:game_over', { results })
          console.log(`[游戏中断] 房间 ${room.id}, 玩家离开`)
        }

        console.log(`[离开房间] ${player.name} ← ${room.id}`)
      }
    }

    socket.on('battle:leave', handleLeave)
    socket.on('disconnect', handleLeave)

    console.log(`[连接建立] ${socket.id}`)
  })
}
