import type {
  User,
  Match,
  Question,
  UserAnswer,
  Transaction,
  TransactionWithUser,
  MatchStatusRecord,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateCreditsRequest,
  CreateMatchRequest,
  UpdateMatchRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateUserAnswerRequest,
  UpdateUserAnswerRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from './types'

// ── Storage ───────────────────────────────────────────────────────────────────
const API_KEY_STORAGE_KEY = 'ipl-admin-api-key'

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY)
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}

// ── Base fetch ────────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://localhost:44331'
// const BASE_URL = 'https://iplgaming20260322122951-axd9czg3bzewdeez.centralus-01.azurewebsites.net'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = getApiKey()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(key ? { 'X-Api-Key': key } : {}),
    ...(init.headers ?? {}),
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`[${response.status}] ${text}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>
  }
  return undefined as unknown as T
}

// ── Users ─────────────────────────────────────────────────────────────────────
const users = {
  getMe: () => request<User>('/api/users/me'),
  getAll: () => request<User[]>('/api/users'),
  getById: (id: string) => request<User>(`/api/users/${id}`),
  getByApiKey: (apiKey: string) => request<User>(`/api/users/GetUserByApiKey/${encodeURIComponent(apiKey)}`),
  create: (body: CreateUserRequest) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateUserRequest) =>
    request<User>('/api/users', { method: 'PUT', body: JSON.stringify(body) }),
  updateCredits: (id: string, body: UpdateCreditsRequest) =>
    request<User>(`/api/users/${id}/credits`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/api/users/${id}`, { method: 'DELETE' }),
  refreshCache: () => request<void>('/api/users/RefreshCache', { method: 'POST' }),
}

// ── Matches ───────────────────────────────────────────────────────────────────
const matches = {
  getAll: () => request<Match[]>('/api/matches/GetAllMatches'),
  getById: (id: string) => request<Match>(`/api/matches/GetMatchById/${id}`),
  getByTeam: (teamName: string) =>
    request<Match[]>(`/api/matches/GetMatchesByTeamName/${encodeURIComponent(teamName)}`),
  create: (body: CreateMatchRequest) =>
    request<Match>('/api/matches/CreateMatch', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateMatchRequest) =>
    request<Match>('/api/matches/UpdateMatch', { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/api/matches/DeleteMatch/${id}`, { method: 'DELETE' }),
}

// ── Questions ─────────────────────────────────────────────────────────────────
const questions = {
  getAll: () => request<Question[]>('/api/questions/GetAllQuestions'),
  getById: (id: string) => request<Question>(`/api/questions/GetQuestionById/${id}`),
  getByMatch: (matchId: string) =>
    request<Question[]>(`/api/questions/GetQuestionsByMatchId/${matchId}`),
  create: (body: CreateQuestionRequest) =>
    request<Question>('/api/questions/CreateQuestion', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateQuestionRequest) =>
    request<Question>('/api/questions/UpdateQuestion', { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string, matchId: string) =>
    request<void>(`/api/questions/DeleteQuestion/${id}/${matchId}`, { method: 'DELETE' }),
  setCorrectAnswer: (questionId: string, matchId: string, correctOptionId: number | null) =>
    request<Question>(`/api/questions/SetCorrectAnswer/${questionId}/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ correctOptionId }),
    }),
}

// ── User Answers ──────────────────────────────────────────────────────────────
const userAnswers = {
  getAll: () => request<UserAnswer[]>('/api/useranswers/GetAllUserAnswers'),
  getById: (id: string) => request<UserAnswer>(`/api/useranswers/GetUserAnswerById/${id}`),
  getByMatch: (matchId: string) =>
    request<UserAnswer[]>(`/api/useranswers/GetUserAnswersByMatchId/${matchId}`),
  getByMatchAndUser: (matchId: string, userId: string) =>
    request<UserAnswer>(`/api/useranswers/GetUserAnswerByMatchAndUser/${matchId}/${userId}`),
  create: (body: CreateUserAnswerRequest) =>
    request<UserAnswer>('/api/useranswers/CreateUserAnswer', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateUserAnswerRequest) =>
    request<UserAnswer>('/api/useranswers/UpdateUserAnswer', { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string, matchId: string) =>
    request<void>(`/api/useranswers/DeleteUserAnswer/${id}/${matchId}`, { method: 'DELETE' }),
}

// ── Transactions ──────────────────────────────────────────────────────────────
const transactions = {
  getAll: () => request<Transaction[]>('/api/transactions/GetAllTransactions'),
  getById: (id: string) => request<Transaction>(`/api/transactions/GetTransactionById/${id}`),
  getByUser: (userId: string) =>
    request<Transaction[]>(`/api/transactions/GetTransactionsByUserId/${userId}`),
  getByMatchAndUser: (matchId: string, userId: string) =>
    request<Transaction>(`/api/transactions/GetTransactionByMatchAndUser/${matchId}/${userId}`),
  getByMatch: (matchId: string) =>
    request<TransactionWithUser[]>(`/api/betsettlement/GetTransactionsByMatch/${matchId}`),
  create: (body: CreateTransactionRequest) =>
    request<Transaction>('/api/transactions/CreateTransaction', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateTransactionRequest) =>
    request<Transaction>('/api/transactions/UpdateTransaction', { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string, userId: string) =>
    request<void>(`/api/transactions/DeleteTransaction/${id}/${userId}`, { method: 'DELETE' }),
  completeTransaction: (transactionId: string) =>
    request<{ message: string }>(`/api/betsettlement/CompleteTransaction/${transactionId}`, { method: 'POST' }),
  completeAll: (matchId: string) =>
    request<{ message: string; count: number }>(`/api/betsettlement/CompleteAllTransactions/${matchId}`, { method: 'POST' }),
}

// ── Match Statuses ────────────────────────────────────────────────────────────
const matchStatuses = {
  getAll: () => request<MatchStatusRecord[]>('/api/matchstatus/GetAllMatchStatuses'),
  getByMatchId: (matchId: string) =>
    request<MatchStatusRecord>(`/api/matchstatus/GetMatchStatusByMatchId/${matchId}`),
  create: (body: Omit<MatchStatusRecord, 'id'>) =>
    request<MatchStatusRecord>('/api/matchstatus/CreateMatchStatus', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: MatchStatusRecord) =>
    request<MatchStatusRecord>('/api/matchstatus/UpdateMatchStatus', { method: 'PUT', body: JSON.stringify(body) }),
  markMatchComplete: (matchId: string) =>
    request<MatchStatusRecord>(`/api/matchstatus/MarkMatchComplete/${matchId}`, { method: 'POST' }),
  overrideStatus: (matchId: string, status: number) =>
    request<MatchStatusRecord>(`/api/matchstatus/OverrideMatchStatus/${matchId}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

// ── Betting Stats ─────────────────────────────────────────────────────────────
const bettingStats = {
  calculate: (matchId: string) =>
    request<{ message: string }>(`/api/BettingStats/Calculate/${matchId}`, { method: 'POST' }),
}

// ── Bet Settlement ────────────────────────────────────────────────────────────
const betSettlement = {
  settle: (matchId: string) =>
    request<{ message: string }>(`/api/betsettlement/SettleBets/${matchId}`, { method: 'POST' }),
}

// ── Exported API object ───────────────────────────────────────────────────────
export const api = { users, matches, questions, userAnswers, transactions, matchStatuses, bettingStats, betSettlement }
