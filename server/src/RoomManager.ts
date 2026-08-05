import { Room } from './Room.js'
import type { BattleConfig } from './types.js'

/**
 * 房间管理器
 *
 * 负责房间的创建、查找、移除。
 * 房间号为 4 位大写字母+数字，避免易混淆字符（0/O, 1/I）。
 */
export class RoomManager {
  private rooms = new Map<string, Room>()
  /** playerId → roomId 的映射，用于断线重连时查找房间 */
  private playerRooms = new Map<string, string>()

  /** 生成唯一房间号 */
  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let id: string
    do {
      id = ''
      for (let i = 0; i < 4; i++) {
        id += chars[Math.floor(Math.random() * chars.length)]
      }
    } while (this.rooms.has(id))
    return id
  }

  /** 创建房间 */
  createRoom(hostId: string, hostName: string, config: BattleConfig): Room {
    const id = this.generateRoomId()
    const room = new Room(id, hostId, hostName, config)
    this.rooms.set(id, room)
    this.playerRooms.set(hostId, id)
    return room
  }

  /** 查找房间 */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  /** 根据玩家 ID 查找房间 */
  getRoomByPlayer(playerId: string): Room | undefined {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return undefined
    return this.rooms.get(roomId)
  }

  /** 玩家加入房间 */
  joinRoom(roomId: string, playerId: string, name: string): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (!room.isWaiting) return null
    if (!room.addPlayer(playerId, name, false)) return null
    this.playerRooms.set(playerId, roomId)
    return room
  }

  /** 移除玩家 */
  removePlayer(playerId: string): { room: Room; player: import('./types.js').PlayerState } | null {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return null
    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.removePlayer(playerId)
    this.playerRooms.delete(playerId)

    if (player) {
      // 如果房主离开，转移房主或销毁房间
      if (playerId === room.hostId && room.playerCount > 0) {
        // 将第一个玩家设为新房主（需要 Room 支持，这里简单处理）
      }
      // 如果房间空了，清理
      if (room.isEmpty) {
        this.rooms.delete(roomId)
      }
      return { room, player }
    }
    return null
  }

  /** 获取所有房间（调试用） */
  getRoomCount(): number {
    return this.rooms.size
  }
}
