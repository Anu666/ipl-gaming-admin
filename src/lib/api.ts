import type {
  User,
  Match,
  Question,
  UserAnswer,
  Transaction,
  CreateUserRequest,
  UpdateUserRequest,
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
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000'

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
  getAll: () => request<User[]>('/api/users'),
  getById: (id: string) => request<User>(`/api/users/${id}`),
  getByApiKey: (apiKey: string) => request<User>(`/api/users/GetUserByApiKey/${encodeURIComponent(apiKey)}`),
  create: (body: CreateUserRequest) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateUserRequest) =>
    request<User>('/api/users', { method: 'PUT', body: JSON.stringify(body) }),
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
  create: (body: CreateTransactionRequest) =>
    request<Transaction>('/api/transactions/CreateTransaction', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: UpdateTransactionRequest) =>
    request<Transaction>('/api/transactions/UpdateTransaction', { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string, userId: string) =>
    request<void>(`/api/transactions/DeleteTransaction/${id}/${userId}`, { method: 'DELETE' }),
}

// ── Exported API object ───────────────────────────────────────────────────────
export const api = { users, matches, questions, userAnswers, transactions }
