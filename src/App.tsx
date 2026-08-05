import { useState } from 'react'
import { Header } from '@/components/Header/Header'
import { SetupPanel } from '@/components/SetupPanel/SetupPanel'
import { PracticePanel } from '@/components/PracticePanel/PracticePanel'
import { ResultPanel } from '@/components/ResultPanel/ResultPanel'
import { MusicToggle } from '@/components/MusicToggle/MusicToggle'
import { BattleLobby } from '@/components/BattleLobby/BattleLobby'
import { BattleWaitingRoom } from '@/components/BattleWaitingRoom/BattleWaitingRoom'
import { BattlePracticePanel } from '@/components/BattlePracticePanel/BattlePracticePanel'
import { BattleResultPanel } from '@/components/BattleResultPanel/BattleResultPanel'
import { CornerOrnaments } from '@/components/shared/CornerOrnaments'
import { usePractice } from '@/hooks/usePractice'
import { useBattle } from '@/hooks/useBattle'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'
import type { PracticeConfig, Phase } from '@/types'
import styles from './App.module.css'
import bgMusic from '../sound/bg.mp3'

/** 默认练习配置 */
const DEFAULT_CONFIG: PracticeConfig = {
  mode: 'fixed',
  operations: ['add', 'sub', 'mul', 'div'],
  difficulty: 'easy',
  totalCount: 20,
  endless: {
    initialTime: 60,
    correctBonus: 3,
    wrongPenalty: 3,
  },
}

/**
 * 应用根组件
 *
 * 单人模式：setup → practice → result（由 usePractice 推断阶段）
 * 对战模式：setup → battle-lobby → battle-practice → battle-result（由 useBattle 管理）
 */
export default function App() {
  const [config, setConfig] = useState<PracticeConfig>(DEFAULT_CONFIG)
  const [battleEntry, setBattleEntry] = useState(false)
  const practice = usePractice()
  const battle = useBattle()
  const { isMuted, toggleMute } = useBackgroundMusic(bgMusic)

  // 判断是否处于对战模式（已创建/加入房间）
  const inBattle = battle.phase !== 'idle'

  // 确定当前阶段
  let phase: Phase
  if (inBattle) {
    // 对战模式阶段
    switch (battle.phase) {
      case 'lobby':
        phase = 'battle-lobby'
        break
      case 'playing':
        phase = 'battle-practice'
        break
      case 'finished':
        phase = 'battle-result'
        break
      default:
        phase = 'setup'
    }
  } else if (battleEntry) {
    // 对战入口（BattleLobby）
    phase = 'setup' // 占位，实际由 battleEntry 控制渲染
  } else if (practice.result) {
    phase = 'result'
  } else if (practice.isActive) {
    phase = 'practice'
  } else {
    phase = 'setup'
  }

  // 从对战模式返回设置
  const handleBackToSetup = () => {
    if (battle.phase !== 'idle') {
      battle.leaveRoom()
    }
    setBattleEntry(false)
    setConfig({ ...config, mode: 'fixed' })
  }

  return (
    <div className={styles.app}>
      <MusicToggle isMuted={isMuted} onToggle={toggleMute} />
      <CornerOrnaments />
      <Header />

      {/* ===== 单人模式：设置 ===== */}
      {phase === 'setup' && !battleEntry && (
        <SetupPanel
          config={config}
          onConfigChange={setConfig}
          onStart={() => {
            if (config.mode === 'battle') {
              setBattleEntry(true)
            } else {
              practice.start(config)
            }
          }}
        />
      )}

      {/* ===== 对战模式入口 ===== */}
      {phase === 'setup' && battleEntry && !inBattle && (
        <BattleLobby
          onCreateRoom={battle.createRoom}
          onJoinRoom={battle.joinRoom}
          onBack={() => {
            setBattleEntry(false)
            setConfig({ ...config, mode: 'fixed' })
          }}
          error={battle.error}
          onClearError={battle.clearError}
        />
      )}

      {/* ===== 对战等待室 ===== */}
      {phase === 'battle-lobby' && battle.roomId && battle.config && (
        <BattleWaitingRoom
          roomId={battle.roomId}
          players={battle.players}
          isHost={battle.isHost}
          config={battle.config}
          onStart={battle.startGame}
          onLeave={handleBackToSetup}
        />
      )}

      {/* ===== 对战练习 ===== */}
      {phase === 'battle-practice' &&
        battle.currentQuestion &&
        battle.config &&
        battle.startTime && (
          <BattlePracticePanel
            question={battle.currentQuestion}
            currentIndex={battle.currentIndex}
            totalCount={battle.config.totalCount}
            correctCount={battle.correctCount}
            wrongCount={battle.wrongCount}
            answerStatus={battle.answerStatus}
            startTime={battle.startTime}
            opponents={battle.opponents}
            onSubmit={battle.submitAnswer}
            onQuit={handleBackToSetup}
          />
        )}

      {/* ===== 对战结果 ===== */}
      {phase === 'battle-result' && battle.results && battle.playerId && (
        <BattleResultPanel
          results={battle.results}
          playerId={battle.playerId}
          onLeave={handleBackToSetup}
        />
      )}

      {/* ===== 单人模式：练习 ===== */}
      {phase === 'practice' && practice.currentQuestion && (
        <PracticePanel
          mode={practice.mode}
          currentQuestion={practice.currentQuestion}
          currentIndex={practice.currentIndex}
          totalCount={practice.questions.length}
          totalAnswered={practice.totalAnswered}
          correctCount={practice.correctCount}
          elapsed={practice.elapsed}
          remainingTime={practice.remainingTime}
          initialTime={config.endless.initialTime}
          correctBonus={config.endless.correctBonus}
          wrongPenalty={config.endless.wrongPenalty}
          answerStatus={practice.answerStatus}
          isAnswered={practice.isAnswered}
          feedbackDelay={practice.FEEDBACK_DELAY}
          onSubmit={practice.submitAnswer}
          onNext={practice.next}
          onQuit={practice.quit}
        />
      )}

      {/* ===== 单人模式：结果 ===== */}
      {phase === 'result' && practice.result && (
        <ResultPanel
          result={practice.result}
          onRetry={() => practice.start(config)}
          onHome={practice.quit}
        />
      )}
    </div>
  )
}
