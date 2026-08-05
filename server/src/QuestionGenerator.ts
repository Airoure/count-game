import type { Operation, Difficulty, Question, BattleConfig } from './types.js'

/** 运算符号映射 */
const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
}

/** 生成 [min, max] 范围内的随机整数 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 根据配置生成单道题目 */
function generateOne(config: BattleConfig): Question {
  const ops = config.operations
  const op = ops[randInt(0, ops.length - 1)]
  const isEasy = config.difficulty === 'easy'
  const symbol = OPERATION_SYMBOLS[op]

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

  return { a, b, op, symbol, answer }
}

/** 批量生成题目（避免连续重复） */
export function generateQuestions(config: BattleConfig): Question[] {
  const questions: Question[] = []
  let last: Question | null = null

  for (let i = 0; i < config.totalCount; i++) {
    let q: Question
    do {
      q = generateOne(config)
    } while (last && q.a === last.a && q.b === last.b && q.op === last.op)
    questions.push(q)
    last = q
  }

  return questions
}
