// ── Page navigation ──────────────────────────────────────────────────────────
export type Page = 'home' | 'matches' | 'users' | 'questions' | 'transactions'

// ── Enums ────────────────────────────────────────────────────────────────────
export const UserRole = {
  Player: 0,
  Moderator: 1,
  Admin: 2,
  SuperAdmin: 3,
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Player]: 'Player',
  [UserRole.Moderator]: 'Moderator',
  [UserRole.Admin]: 'Admin',
  [UserRole.SuperAdmin]: 'Super Admin',
}

// ── Core models ──────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  phoneNumber: string
  apiKey: string
  createdDate: string
  updatedDate: string
  isActive: boolean
  lastLoginDate: string | null
  role: UserRole
  credits: number
}

export interface Match {
  id: string
  matchDate: string
  matchName: string
  matchTime: string
  gmtMatchTime: string
  gmtMatchDate: string
  gmtMatchEndTime: string
  gmtMatchEndDate: string
  firstBattingTeamId: number
  firstBattingTeamName: string
  firstBattingTeamCode: string
  secondBattingTeamId: number
  secondBattingTeamName: string
  secondBattingTeamCode: string
  homeTeamId: number
  homeTeamName: string
  awayTeamId: number
  awayTeamName: string
  groundId: number
  groundName: string
  city: string
  matchCommenceStartDate: string
}

export interface Option {
  id: number
  optionText: string
}

export interface Question {
  id: string
  matchId: string
  questionText: string
  options: Option[]
  credits: number
  sequence: number
  correctOptionId: number | null
}

export interface Answer {
  questionId: string
  selectedOption: number
}

export interface UserAnswer {
  id: string
  matchId: string
  userId: string
  answers: Answer[]
}

export interface Change {
  questionId: string
  creditChange: number
}

export interface Transaction {
  id: string
  userId: string
  matchId: string
  overallCreditChange: number
  changes: Change[]
}

// ── Request/Response shapes ──────────────────────────────────────────────────
export type CreateUserRequest = Omit<User, 'id' | 'apiKey' | 'createdDate' | 'updatedDate' | 'lastLoginDate'>

export type UpdateUserRequest = User

export type CreateMatchRequest = Omit<Match, 'id'>

export type UpdateMatchRequest = Match

export type CreateQuestionRequest = Omit<Question, 'id'>

export type UpdateQuestionRequest = Question

export type CreateUserAnswerRequest = Omit<UserAnswer, 'id'>

export type UpdateUserAnswerRequest = UserAnswer

export type CreateTransactionRequest = Omit<Transaction, 'id'>

export type UpdateTransactionRequest = Transaction

export interface UpdateCreditsRequest {
  credits: number
}
