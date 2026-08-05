import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/shared/Card'
import { useSound } from '@/hooks/useSound'
import { formatTime, formatQuestionNumber } from '@/utils/format'
import type { Question, AnswerStatus, GameMode } from '@/types'
import styles from './PracticePanel.module.css'
import correctSound from '../../../sound/right.wav'
import wrongSound from '../../../sound/wrong.wav'

interface PracticePanelProps {
  mode: GameMode
  currentQuestion: Question
  currentIndex: number
  totalCount: number
  totalAnswered: number
  correctCount: number
  elapsed: number
  remainingTime: number
  initialTime: number
  correctBonus: number
  wrongPenalty: number
  answerStatus: AnswerStatus
  isAnswered: boolean
  feedbackDelay: number
  onSubmit: (answer: number) => boolean
  onNext: () => void
  onQuit: () => void
}

/**
 * 练习面板
 *
 * 展示题目、接收答案输入、显示即时反馈
 * 提交后延迟自动进入下一题，也可手动跳过
 *
 * 固定模式：显示题号进度与正计时
 * 无尽模式：显示倒计时与已答题数，答对加时/答错扣时
 */
export function PracticePanel({
  mode,
  currentQuestion,
  currentIndex,
  totalCount,
  totalAnswered,
  correctCount,
  elapsed,
  remainingTime,
  initialTime,
  correctBonus,
  wrongPenalty,
  answerStatus,
  isAnswered,
  feedbackDelay,
  onSubmit,
  onNext,
  onQuit,
}: PracticePanelProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playCorrect = useSound(correctSound)
  const playWrong = useSound(wrongSound)

  const isEndless = mode === 'endless'
  // 题目切换 key：固定模式用 currentIndex，无尽模式用 totalAnswered
  const questionKey = isEndless ? totalAnswered : currentIndex

  // 题目切换时清空输入并聚焦
  useEffect(() => {
    setInputValue('')
    inputRef.current?.focus()
  }, [questionKey])

  // 答题反馈音效
  useEffect(() => {
    if (answerStatus === 'correct') {
      playCorrect()
    } else if (answerStatus === 'wrong') {
      playWrong()
    }
  }, [answerStatus, playCorrect, playWrong])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const handleSubmit = () => {
    // 已答题：手动跳过等待，立即下一题
    if (isAnswered) {
      clearTimer()
      onNext()
      return
    }

    const userAns = parseInt(inputValue, 10)
    if (Number.isNaN(userAns)) {
      inputRef.current?.focus()
      return
    }

    onSubmit(userAns)

    // 延迟后自动进入下一题
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      onNext()
    }, feedbackDelay)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  // 进度条：固定模式按题目进度，无尽模式按剩余时间占比
  const progressPercent = isEndless
    ? Math.min(100, (remainingTime / initialTime) * 100)
    : ((currentIndex + 1) / totalCount) * 100

  // 倒计时紧急状态（剩余 ≤ 10 秒）
  const isUrgent = isEndless && remainingTime <= 10

  // 反馈文案
  let feedbackText = ''
  let feedbackClass = ''
  if (answerStatus === 'correct') {
    feedbackText = '✓ 正确'
    if (isEndless && correctBonus > 0) {
      feedbackText += `  +${correctBonus}秒`
    }
    feedbackClass = `${styles.feedback} ${styles.show} ${styles.correct}`
  } else if (answerStatus === 'wrong') {
    feedbackText = `✗ 正确答案：${currentQuestion.answer}`
    if (isEndless && wrongPenalty > 0) {
      feedbackText += `  −${wrongPenalty}秒`
    }
    feedbackClass = `${styles.feedback} ${styles.show} ${styles.wrong}`
  } else {
    feedbackClass = styles.feedback
  }

  // 输入框状态类
  const inputClass = `${styles.answerInput} ${
    answerStatus === 'correct' ? styles.inputCorrect : ''
  } ${answerStatus === 'wrong' ? styles.inputWrong : ''}`

  return (
    <Card className={styles.practicePanel}>
      {/* 进度条 */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${isUrgent ? styles.progressUrgent : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 状态栏 */}
      <div className={styles.statusBar}>
        {isEndless ? (
          <>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>剩余</span>
              <span
                className={`${styles.statusValue} ${isUrgent ? styles.urgent : ''}`}
              >
                {remainingTime}s
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>已答</span>
              <span className={styles.statusValue}>{totalAnswered}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>正确</span>
              <span className={`${styles.statusValue} ${styles.jade}`}>
                {correctCount}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>进度</span>
              <span className={styles.statusValue}>
                {currentIndex + 1}/{totalCount}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>正确</span>
              <span className={`${styles.statusValue} ${styles.jade}`}>
                {correctCount}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>用时</span>
              <span className={styles.statusValue}>{formatTime(elapsed)}</span>
            </div>
          </>
        )}
      </div>

      {/* 题目区 */}
      <div className={styles.questionArea}>
        <div className={styles.questionNumber}>
          {isEndless
            ? `第 ${totalAnswered + 1} 题`
            : formatQuestionNumber(currentIndex)}
        </div>
        <div className={styles.questionDisplay}>
          <span className={styles.num} key={`a-${questionKey}`}>
            {currentQuestion.a}
          </span>
          <span className={styles.op}>{currentQuestion.symbol}</span>
          <span className={styles.num} key={`b-${questionKey}`}>
            {currentQuestion.b}
          </span>
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
        />
        <button className={styles.submitBtn} onClick={handleSubmit} type="button">
          {isAnswered ? '下一题' : '提交'}
        </button>
      </div>

      {/* 反馈 */}
      <div className={feedbackClass}>{feedbackText}</div>

      {/* 退出 */}
      <button className={styles.quitBtn} onClick={onQuit} type="button">
        — 退出练习 —
      </button>
    </Card>
  )
}
