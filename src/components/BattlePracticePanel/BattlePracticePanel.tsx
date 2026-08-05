import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/shared/Card'
import { useSound } from '@/hooks/useSound'
import { formatTime } from '@/utils/format'
import type { Question, AnswerStatus, OpponentProgress } from '@/types'
import { BATTLE_WRONG_PENALTY } from '@/types'
import styles from './BattlePracticePanel.module.css'
import correctSound from '../../../sound/right.wav'
import wrongSound from '../../../sound/wrong.wav'

interface BattlePracticePanelProps {
  question: Question
  currentIndex: number
  totalCount: number
  correctCount: number
  wrongCount: number
  answerStatus: AnswerStatus
  startTime: number
  opponents: OpponentProgress[]
  onSubmit: (answer: number) => void
  onQuit: () => void
}

/**
 * 对战练习面板
 *
 * 与单人练习的区别：
 * - 答错不跳过，需重新作答
 * - 答错罚时 +10 秒
 * - 实时显示对手进度
 */
export function BattlePracticePanel({
  question,
  currentIndex,
  totalCount,
  correctCount,
  wrongCount,
  answerStatus,
  startTime,
  opponents,
  onSubmit,
  onQuit,
}: BattlePracticePanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const playCorrect = useSound(correctSound)
  const playWrong = useSound(wrongSound)

  // 正计时（每秒更新）
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  // 答题反馈音效
  useEffect(() => {
    if (answerStatus === 'correct') {
      playCorrect()
    } else if (answerStatus === 'wrong') {
      playWrong()
    }
  }, [answerStatus, playCorrect, playWrong])

  // 题目切换时清空输入并聚焦
  useEffect(() => {
    setInputValue('')
    inputRef.current?.focus()
  }, [currentIndex])

  const isAnswered = answerStatus !== 'idle'

  const handleSubmit = () => {
    if (isAnswered) return
    const userAns = parseInt(inputValue, 10)
    if (Number.isNaN(userAns)) {
      inputRef.current?.focus()
      return
    }
    onSubmit(userAns)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  // 进度条
  const progressPercent = ((currentIndex) / totalCount) * 100

  // 有效时间（含罚时）
  const effectiveTime = elapsed + wrongCount * BATTLE_WRONG_PENALTY

  // 反馈文案
  let feedbackText = ''
  let feedbackClass = styles.feedback
  if (answerStatus === 'correct') {
    feedbackText = '✓ 正确'
    feedbackClass = `${styles.feedback} ${styles.show} ${styles.correct}`
  } else if (answerStatus === 'wrong') {
    feedbackText = `✗ 错误 +${BATTLE_WRONG_PENALTY}秒 罚时`
    feedbackClass = `${styles.feedback} ${styles.show} ${styles.wrong}`
  }

  // 输入框状态
  const inputClass = `${styles.answerInput} ${
    answerStatus === 'correct' ? styles.inputCorrect : ''
  } ${answerStatus === 'wrong' ? styles.inputWrong : ''}`

  return (
    <Card className={styles.battlePanel}>
      {/* 顶部状态栏 */}
      <div className={styles.topBar}>
        <div className={styles.myStatus}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>进度</span>
            <span className={styles.statusValue}>
              {currentIndex + 1}/{totalCount}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>正确</span>
            <span className={`${styles.statusValue} ${styles.jadeColor}`}>{correctCount}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>用时</span>
            <span className={styles.statusValue}>{formatTime(effectiveTime)}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>错误</span>
            <span className={`${styles.statusValue} ${styles.wrongColor}`}>{wrongCount}</span>
          </div>
        </div>
        <button className={styles.quitBtn} onClick={onQuit} type="button">
          退出
        </button>
      </div>

      {/* 进度条 */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>

      {/* 对手进度 */}
      <div className={styles.opponentsArea}>
        {opponents.map((opp) => {
          const oppProgress = (opp.currentIndex / totalCount) * 100
          const oppFinished = opp.finished
          return (
            <div key={opp.playerId} className={styles.oppCard}>
              <div className={styles.oppHeader}>
                <span className={styles.oppName}>{opp.name}</span>
                {oppFinished ? (
                  <span className={styles.oppFinished}>已完成</span>
                ) : (
                  <span className={styles.oppProgress}>
                    第 {opp.currentIndex + 1} 题
                  </span>
                )}
              </div>
              <div className={styles.oppBar}>
                <div
                  className={`${styles.oppBarFill} ${oppFinished ? styles.oppBarDone : ''}`}
                  style={{ width: `${oppProgress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* 题目区 */}
      <div className={styles.questionArea}>
        <div className={styles.questionNumber}>第 {currentIndex + 1} 题</div>
        <div className={styles.questionDisplay}>
          <span className={styles.num}>{question.a}</span>
          <span className={styles.op}>{question.symbol}</span>
          <span className={styles.num}>{question.b}</span>
          <span className={styles.equals}>=</span>
          <span className={styles.num}>?</span>
        </div>
      </div>

      {/* 答案输入 */}
      <div className={styles.answerRow}>
        <input
          ref={inputRef}
          type="number"
          className={inputClass}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入答案"
          autoComplete="off"
          disabled={isAnswered}
        />
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          type="button"
          disabled={isAnswered}
        >
          提交
        </button>
      </div>

      {/* 反馈 */}
      <div className={feedbackClass}>{feedbackText}</div>
    </Card>
  )
}
