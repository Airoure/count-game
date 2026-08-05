// ===== 共享类型定义 =====

/** 运算类型 */
export type Operation = 'add' | 'sub' | 'mul' | 'div'

/** 难度等级 */
export type Difficulty = 'easy' | 'hard'

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished'

/** 单道题目 */
export interface Question {
  a: number
  b: number
  op: Operation
  symbol: string
  answer: number
}

/** 对战配置 */
export interface BattleConfig {
  operations: Operation[]
  difficulty: Difficulty
  totalCount: number
}

/** 玩家状态 */
export interface PlayerState {
  id: string
  name: string
  isHost: boolean
  currentIndex: number
  correctCount: number
  wrongCount: number
  finished: boolean
  finishTime: number | null
}

/** 玩家进度（广播给对手） */
export interface PlayerProgress {
  playerId: string
  name: string
  currentIndex: number
  correctCount: number
  wrongCount: number
  finished: boolean
  finishTime: number | null
}

/** 对战结果条目 */
export interface BattleResultEntry {
  playerId: string
  name: string
  correctCount: number
  wrongCount: number
  finished: boolean
  finishTime: number | null
  /** 实际耗时（秒） */
  elapsed: number
  /** 含罚时的总时间（秒） */
  totalTime: number
  rank: number
}

/** 答错罚时（秒） */
export const WRONG_PENALTY_SECONDS = 10
