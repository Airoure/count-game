import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket, disconnectSocket } from '@/services/socket'
import type {
  BattleConfig,
  BattlePlayer,
  OpponentProgress,
  BattleResultEntry,
  Question,
  AnswerStatus,
} from '@/types'
import { BATTLE_WRONG_PENALTY } from '@/types'

/** 对战阶段 */
export type BattlePhase = 'idle' | 'lobby' | 'playing' | 'finished'

/** useBattle Hook 的返回值 */
export interface UseBattleReturn {
  /** 当前阶段 */
  phase: BattlePhase
  /** 房间号 */
  roomId: string | null
  /** 当前玩家 ID */
  playerId: string | null
  /** 是否为房主 */
  isHost: boolean
  /** 房间内所有玩家 */
  players: BattlePlayer[]
  /** 对战配置 */
  config: BattleConfig | null
  /** 当前题目列表 */
  questions: Question[]
  /** 当前题目索引 */
  currentIndex: number
  /** 当前题目 */
  currentQuestion: Question | null
  /** 正确数 */
  correctCount: number
  /** 错误数 */
  wrongCount: number
  /** 答题状态 */
  answerStatus: AnswerStatus
  /** 是否已答题（当前题） */
  isAnswered: boolean
  /** 游戏开始时间戳 */
  startTime: number | null
  /** 对手进度列表 */
  opponents: OpponentProgress[]
  /** 对战结果 */
  results: BattleResultEntry[] | null
  /** 错误消息 */
  error: string | null

  // 操作方法
  createRoom: (name: string, config: BattleConfig) => void
  joinRoom: (roomId: string, name: string) => void
  startGame: () => void
  submitAnswer: (answer: number) => void
  leaveRoom: () => void
  clearError: () => void
}

/**
 * 对战模式核心 Hook
 *
 * 管理 Socket 连接、房间生命周期、游戏状态、对手进度同步
 */
export function useBattle(): UseBattleReturn {
  const [phase, setPhase] = useState<BattlePhase>('idle')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<BattlePlayer[]>([])
  const [config, setConfig] = useState<BattleConfig | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('idle')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [opponents, setOpponents] = useState<OpponentProgress[]>([])
  const [results, setResults] = useState<BattleResultEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 用 ref 存 roomId，供事件回调使用
  const roomIdRef = useRef<string | null>(null)

  // ===== 创建房间 =====
  const createRoom = useCallback((name: string, battleConfig: BattleConfig) => {
    const socket = getSocket()
    socket.emit('battle:create', { name, config: battleConfig }, (res: {
      roomId: string
      playerId: string
      players: BattlePlayer[]
      config: BattleConfig
      isHost: boolean
      error?: string
    }) => {
      if (res.error) {
        setError(res.error)
        return
      }
      setRoomId(res.roomId)
      setPlayerId(res.playerId)
      setIsHost(res.isHost)
      setPlayers(res.players)
      setConfig(res.config)
      roomIdRef.current = res.roomId
      setPhase('lobby')
    })
  }, [])

  // ===== 加入房间 =====
  const joinRoom = useCallback((id: string, name: string) => {
    const socket = getSocket()
    socket.emit('battle:join', { roomId: id, name }, (res: {
      roomId: string
      playerId: string
      players: BattlePlayer[]
      config: BattleConfig
      isHost: boolean
      error?: string
    }) => {
      if (res.error) {
        setError(res.error)
        return
      }
      setRoomId(res.roomId)
      setPlayerId(res.playerId)
      setIsHost(res.isHost)
      setPlayers(res.players)
      setConfig(res.config)
      roomIdRef.current = res.roomId
      setPhase('lobby')
    })
  }, [])

  // ===== 开始游戏 =====
  const startGame = useCallback(() => {
    if (!roomIdRef.current) return
    const socket = getSocket()
    socket.emit('battle:start', { roomId: roomIdRef.current }, (res: { ok?: boolean; error?: string }) => {
      if (res.error) {
        setError(res.error)
      }
    })
  }, [])

  // ===== 提交答案 =====
  const submitAnswer = useCallback(
    (answer: number) => {
      if (!roomIdRef.current || phase !== 'playing') return
      if (answerStatus !== 'idle') return // 防止重复提交

      const socket = getSocket()
      socket.emit(
        'battle:answer',
        { roomId: roomIdRef.current, answer },
        (res: {
          correct: boolean
          correctAnswer: number
          playerFinished: boolean
          error?: string
        }) => {
          if (res.error) {
            setError(res.error)
            return
          }

          if (res.correct) {
            setCorrectCount((c) => c + 1)
            setAnswerStatus('correct')

            if (res.playerFinished) {
              // 自己完成了所有题目
              setCurrentIndex((idx) => idx + 1) // 越界表示完成
            } else {
              // 延迟后进入下一题
              setTimeout(() => {
                setCurrentIndex((idx) => idx + 1)
                setAnswerStatus('idle')
              }, 500)
            }
          } else {
            setWrongCount((w) => w + 1)
            setAnswerStatus('wrong')

            // 对战模式答错不跳过，短暂反馈后重置状态
            setTimeout(() => {
              setAnswerStatus('idle')
            }, 800)
          }
        },
      )
    },
    [phase, answerStatus],
  )

  // ===== 离开房间 =====
  const leaveRoom = useCallback(() => {
    if (roomIdRef.current) {
      const socket = getSocket()
      socket.emit('battle:leave', { roomId: roomIdRef.current })
    }
    disconnectSocket()
    setPhase('idle')
    setRoomId(null)
    setPlayerId(null)
    setIsHost(false)
    setPlayers([])
    setConfig(null)
    setQuestions([])
    setCurrentIndex(0)
    setCorrectCount(0)
    setWrongCount(0)
    setAnswerStatus('idle')
    setStartTime(null)
    setOpponents([])
    setResults(null)
    roomIdRef.current = null
  }, [])

  const clearError = useCallback(() => setError(null), [])

  // ===== 注册 Socket 事件监听 =====
  useEffect(() => {
    if (phase === 'idle') return

    const socket = getSocket()

    // 其他玩家加入
    const onPlayerJoined = (payload: { playerId: string; name: string }) => {
      setPlayers((prev) => [
        ...prev,
        { id: payload.playerId, name: payload.name, isHost: false },
      ])
    }

    // 其他玩家离开
    const onPlayerLeft = (payload: { playerId: string; name: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== payload.playerId))
      setOpponents((prev) => prev.filter((o) => o.playerId !== payload.playerId))
    }

    // 游戏开始
    const onGameStarted = (payload: {
      questions: Question[]
      startTime: number
      config: BattleConfig
    }) => {
      setQuestions(payload.questions)
      setStartTime(payload.startTime)
      setCurrentIndex(0)
      setCorrectCount(0)
      setWrongCount(0)
      setAnswerStatus('idle')
      setOpponents([])
      setResults(null)
      setPhase('playing')
    }

    // 对手进度更新
    const onProgress = (progress: OpponentProgress) => {
      setOpponents((prev) => {
        const others = prev.filter((o) => o.playerId !== progress.playerId)
        return [...others, progress]
      })
    }

    // 游戏结束
    const onGameOver = (payload: { results: BattleResultEntry[] }) => {
      setResults(payload.results)
      setPhase('finished')
    }

    socket.on('battle:player_joined', onPlayerJoined)
    socket.on('battle:player_left', onPlayerLeft)
    socket.on('battle:started', onGameStarted)
    socket.on('battle:progress', onProgress)
    socket.on('battle:game_over', onGameOver)

    return () => {
      socket.off('battle:player_joined', onPlayerJoined)
      socket.off('battle:player_left', onPlayerLeft)
      socket.off('battle:started', onGameStarted)
      socket.off('battle:progress', onProgress)
      socket.off('battle:game_over', onGameOver)
    }
  }, [phase === 'idle']) // 仅在进入/退出 idle 时重新注册

  // ===== 派生状态 =====
  const currentQuestion =
    currentIndex < questions.length ? questions[currentIndex] ?? null : null

  const isAnswered = answerStatus !== 'idle'

  return {
    phase,
    roomId,
    playerId,
    isHost,
    players,
    config,
    questions,
    currentIndex,
    currentQuestion,
    correctCount,
    wrongCount,
    answerStatus,
    isAnswered,
    startTime,
    opponents,
    results,
    error,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    leaveRoom,
    clearError,
  }
}

export { BATTLE_WRONG_PENALTY }
