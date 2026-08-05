import type {
  Operation,
  OperationMeta,
  Difficulty,
  DifficultyMeta,
  Question,
  PracticeConfig,
  GameMode,
  GradeInfo,
  PracticeResult,
} from '@/types'

/** 运算符号与标签映射 */
export const OPERATION_META: Record<Operation, OperationMeta> = {
  add: { op: 'add', symbol: '+', label: '加法' },
  sub: { op: 'sub', symbol: '−', label: '减法' },
  mul: { op: 'mul', symbol: '×', label: '乘法' },
  div: { op: 'div', symbol: '÷', label: '除法' },
}

/** 运算选项（按固定顺序） */
export const OPERATION_LIST: OperationMeta[] = [
  OPERATION_META.add,
  OPERATION_META.sub,
  OPERATION_META.mul,
  OPERATION_META.div,
]

/** 难度元数据 */
export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    diff: 'easy',
    title: '入门 · 一位数',
    desc: '一位数 与 一位数 运算',
    example: '7 + 8 = ?',
  },
  hard: {
    diff: 'hard',
    title: '进阶 · 两位数',
    desc: '两位数 与 两位数 运算',
    example: '36 + 47 = ?',
  },
}

/** 难度选项（按固定顺序） */
export const DIFFICULTY_LIST: DifficultyMeta[] = [
  DIFFICULTY_META.easy,
  DIFFICULTY_META.hard,
]

/** 固定模式题量选项 */
export const COUNT_OPTIONS = [10, 20, 30, 50] as const

/** 无尽模式初始时间选项（秒） */
export const TIME_OPTIONS = [60, 120, 180, 300] as const

/** 无尽模式答对加时选项（秒） */
export const BONUS_OPTIONS = [0, 3, 5, 10] as const

/** 无尽模式答错扣时选项（秒） */
export const PENALTY_OPTIONS = [0, 3, 5, 10] as const

/** 评级阈值配置 */
const GRADE_THRESHOLDS = [
  { min: 90, grade: { symbol: '优', title: '算无遗漏', subtitle: 'EXCELLENT' } },
  { min: 75, grade: { symbol: '良', title: '颇有功底', subtitle: 'GOOD' } },
  { min: 60, grade: { symbol: '中', title: '尚需修炼', subtitle: 'FAIR' } },
  { min: 0, grade: { symbol: '勉', title: '再接再厉', subtitle: 'KEEP GOING' } },
] as const

/**
 * 生成 [min, max] 范围内的随机整数
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 根据配置生成单道题目
 */
function generateOne(config: PracticeConfig): Question {
  const ops = config.operations
  const op = ops[randInt(0, ops.length - 1)]
  const isEasy = config.difficulty === 'easy'
  const meta = OPERATION_META[op]

  let a: number
  let b: number
  let answer: number

  if (isEasy) {
    a = randInt(1, 9)
    b = randInt(1, 9)
  } else {
    a = randInt(10, 99)
    b = randInt(10, 99)
  }

  switch (op) {
    case 'add':
      answer = a + b
      break
    case 'sub':
      if (a < b) [a, b] = [b, a]
      answer = a - b
      break
    case 'mul':
      answer = a * b
      break
    case 'div':
      b = isEasy ? randInt(1, 9) : randInt(2, 12)
      answer = isEasy ? randInt(1, 9) : randInt(2, 15)
      a = b * answer
      break
  }

  return { a, b, op, symbol: meta.symbol, answer }
}

/**
 * 判断两道题是否完全相同
 */
function isSameQuestion(q1: Question, q2: Question | null): boolean {
  if (!q2) return false
  return q1.a === q2.a && q1.b === q2.b && q1.op === q2.op
}

/**
 * 生成单道题目（避免与上一题重复）
 */
export function generateSingleQuestion(
  config: PracticeConfig,
  lastQuestion?: Question | null,
): Question {
  let q: Question
  do {
    q = generateOne(config)
  } while (lastQuestion && isSameQuestion(q, lastQuestion))
  return q
}

/**
 * 批量生成题目（避免连续重复）
 */
export function generateQuestions(config: PracticeConfig): Question[] {
  const questions: Question[] = []
  let last: Question | null = null

  for (let i = 0; i < config.totalCount; i++) {
    const q = generateSingleQuestion(config, last)
    questions.push(q)
    last = q
  }

  return questions
}

/**
 * 根据正确率计算评级
 */
export function calculateGrade(accuracy: number): GradeInfo {
  for (const threshold of GRADE_THRESHOLDS) {
    if (accuracy >= threshold.min) {
      return { ...threshold.grade }
    }
  }
  return { ...GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1].grade }
}

/**
 * 汇总练习结果
 */
export function buildPracticeResult(
  mode: GameMode,
  correctCount: number,
  totalCount: number,
  timeElapsed: number,
): PracticeResult {
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  return {
    mode,
    correctCount,
    totalCount,
    accuracy,
    timeElapsed,
    grade: calculateGrade(accuracy),
  }
}
