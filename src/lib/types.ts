// ── Page navigation ──────────────────────────────────────────────────────────
export type Page = 'home' | 'matches' | 'users' | 'questions' | 'match-questions' | 'transactions' | 'leaderboard'

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

/** User details without ApiKey — returned by GetAllUsersForAdmin (Admin + SuperAdmin) */
export interface UserSummary {
  id: string
  name: string
  email: string
  phoneNumber: string
  isActive: boolean
  role: UserRole
  credits: number
  createdDate: string
  lastLoginDate: string | null
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

export interface VoterInfo {
  userId: string
  userName: string
}

export interface OptionBettingStats {
  optionId: number
  voteCount: number
  voters: VoterInfo[]
  potentialWinCredits: number
}

export interface QuestionBettingStats {
  totalEligible: number
  totalVotes: number
  unansweredCount: number
  optionStats: OptionBettingStats[]
  lastCalculatedAt: string
}

export const OutcomeType = {
  Won:      0,
  Lost:     1,
  AutoLost: 2,
  Voided:   3,
} as const

export type OutcomeType = (typeof OutcomeType)[keyof typeof OutcomeType]

export const OUTCOME_LABELS: Record<OutcomeType, string> = {
  [OutcomeType.Won]:      'Won',
  [OutcomeType.Lost]:     'Lost',
  [OutcomeType.AutoLost]: 'Auto Lost',
  [OutcomeType.Voided]:   'Voided',
}

export interface QuestionFinalStats {
  correctOptionId: number
  winners: { userId: string; userName: string }[]
  losers: { userId: string; userName: string }[]
  autoLost: { userId: string; userName: string }[]
  isVoided: boolean
  creditChangePerWinner: number
  settledAt: string
}

export interface Question {
  id: string
  matchId: string
  questionText: string
  options: Option[]
  credits: number
  sequence: number
  correctOptionId: number | null
  bettingStats?: QuestionBettingStats | null
  finalStats?: QuestionFinalStats | null
}

export interface Answer {
  questionId: string
  selectedOption: number
  isCorrect?: boolean | null
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
  outcome: OutcomeType
}

export const TransactionStatus = {
  Pending:   0,
  Completed: 1,
} as const
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus]

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.Pending]:   'Pending',
  [TransactionStatus.Completed]: 'Completed',
}

export interface Transaction {
  id: string
  userId: string
  matchId?: string | null
  overallCreditChange: number
  changes?: Change[] | null
  status: TransactionStatus
  type: TransactionType
  createdAt: string
}

export interface TransactionWithUser extends Transaction {
  userName: string
}

// ── Request/Response shapes ──────────────────────────────────────────────────
export type CreateUserRequest = Omit<User, 'id' | 'apiKey' | 'createdDate' | 'updatedDate' | 'lastLoginDate'>

export interface UpdateUserRequest {
  id: string
  name: string
  email: string
  phoneNumber: string
  role: UserRole
  isActive: boolean
}

export type CreateMatchRequest = Omit<Match, 'id'>

export type UpdateMatchRequest = Match

export type CreateQuestionRequest = Omit<Question, 'id'>

export type UpdateQuestionRequest = Question

export type CreateUserAnswerRequest = Omit<UserAnswer, 'id'>

export type UpdateUserAnswerRequest = UserAnswer

export type CreateTransactionRequest = Omit<Transaction, 'id'>

export type UpdateTransactionRequest = Transaction

// ── Match Status ────────────────────────────────────────────────────────────
export const MatchStatusValue = {
  NotStarted:           0,
  ReadyForPicks:        1,
  PicksClosed:          2,
  BetsUpdated:          3,
  MatchCompleted:       4,
  BetsSettled:          5,
  TransactionsSettled:  6,
  Done:                 7,
  Archived:             8,
} as const

export type MatchStatusValue = (typeof MatchStatusValue)[keyof typeof MatchStatusValue]

export const MATCH_STATUS_LABELS: Record<MatchStatusValue, string> = {
  [MatchStatusValue.NotStarted]:          'Not Started',
  [MatchStatusValue.ReadyForPicks]:       'Ready for Picks',
  [MatchStatusValue.PicksClosed]:         'Picks Closed',
  [MatchStatusValue.BetsUpdated]:         'Bets Updated',
  [MatchStatusValue.MatchCompleted]:      'Match Completed',
  [MatchStatusValue.BetsSettled]:         'Bets Settled',
  [MatchStatusValue.TransactionsSettled]: 'Transactions Settled',
  [MatchStatusValue.Done]:                'Done',
  [MatchStatusValue.Archived]:            'Archived',
}

export interface MatchSummaryEntry {
  userId: string
  userName: string
  overallCreditChange: number
  changes: Change[]
}

export interface MatchStatusRecord {
  id: string
  matchId: string
  status: MatchStatusValue
  matchSummary?: MatchSummaryEntry[] | null
}

export const CreditsOperation = {
  Deposit: 0,
  Withdrawal: 1,
  Override: 2,
} as const

export type CreditsOperation = (typeof CreditsOperation)[keyof typeof CreditsOperation]

export const TransactionType = {
  Deposit: 0,
  Withdrawal: 1,
  MatchSettlement: 2,
  AdminOverride: 3,
} as const

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.Deposit]: 'Deposit',
  [TransactionType.Withdrawal]: 'Withdrawal',
  [TransactionType.MatchSettlement]: 'Match Settlement',
  [TransactionType.AdminOverride]: 'Admin Override',
}

export interface UpdateCreditsRequest {
  credits: number
  operation: CreditsOperation
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  userId: string
  userName: string
  totalCreditChange: number
  correctPredictions: number
  wrongPredictions: number
  unansweredQuestions: number
  voidedQuestions: number
  matchesPlayed: number
  winRate: number
  rank: number
}
