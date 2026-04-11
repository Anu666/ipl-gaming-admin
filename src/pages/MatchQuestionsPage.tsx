import { useState, useEffect, useCallback } from 'react'
import matchesJson from '../assets/json/matches.json'
import templatesJson from '../assets/json/question-templates.json'
import { api } from '../lib/api'
import { MatchStatusValue, MATCH_STATUS_LABELS, OUTCOME_LABELS, TransactionStatus, type MatchStatusRecord, type TransactionWithUser, type UserAnswer, type UserSummary } from '../lib/types'
import type { Question } from '../lib/types'

// ── Local types ───────────────────────────────────────────────────────────────

interface MatchItem {
  id: string
  matchDate: string
  firstBattingTeamName: string
  firstBattingTeamCode: string
  secondBattingTeamName: string
  secondBattingTeamCode: string
  matchCommenceStartDate: string
}

interface QuestionTemplate {
  id: number
  category: string
  questionText: string
  options: { id: number; optionText: string }[]
  credits: number
}

interface EditDraft {
  questionText: string
  options: { id: number; optionText: string }[]
  credits: number
  submitting: boolean
  error: string | null
}

type SavedRow   = { kind: 'saved';   q: Question }
type EditingRow = { kind: 'editing'; q: Question; draft: EditDraft }
type NewRow     = { kind: 'new';     key: string; draft: EditDraft }
type QuestionRow = SavedRow | EditingRow | NewRow

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowKey(row: QuestionRow): string {
  return row.kind === 'new' ? row.key : row.q.id
}

const allMatches = (matchesJson as unknown as MatchItem[]).sort(
  (a, b) => new Date(a.matchCommenceStartDate).getTime() - new Date(b.matchCommenceStartDate).getTime(),
)

const allTemplates = templatesJson as unknown as QuestionTemplate[]
const TEMPLATE_CATS = ['All', ...Array.from(new Set(allTemplates.map(t => t.category)))]

function getDefaultMatchId(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const m = allMatches.find(m => {
    const d = new Date(m.matchDate)
    d.setHours(0, 0, 0, 0)
    return d >= today
  })
  return (m ?? allMatches[0])?.id ?? ''
}

function matchLabel(m: MatchItem): string {
  const date = new Date(m.matchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${m.firstBattingTeamCode} vs ${m.secondBattingTeamCode}  ·  ${date}`
}

function blankDraft(text = '', options: { id: number; optionText: string }[] = [{ id: 1, optionText: '' }, { id: 2, optionText: '' }], credits = 10): EditDraft {
  return { questionText: text, options, credits, submitting: false, error: null }
}

function applyTeams(str: string, match?: MatchItem): string {
  if (!match) return str
  return str
    .replace(/Team 1/g, match.firstBattingTeamName)
    .replace(/Team 2/g, match.secondBattingTeamName)
}

let _counter = 0
const genKey = () => `nq-${++_counter}`

// ── Component ─────────────────────────────────────────────────────────────────

export function MatchQuestionsPage({ isSuperAdmin = false, initialMatchId }: { isSuperAdmin?: boolean; initialMatchId?: string }) {
  const [matchId, setMatchId] = useState(() => initialMatchId ?? getDefaultMatchId())
  const [rows, setRows] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerCat, setPickerCat] = useState('All')
  const [matchStatus, setMatchStatus] = useState<MatchStatusRecord | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [settingReady, setSettingReady] = useState(false)
  const [calculatingBets, setCalculatingBets] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [overridingStatus, setOverridingStatus] = useState(false)
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)
  const [pendingOverrideStatus, setPendingOverrideStatus] = useState<MatchStatusValue | null>(null)
  const [settingCorrectAnswer, setSettingCorrectAnswer] = useState<Record<string, boolean>>({})
  const [showSettleBetsConfirm, setShowSettleBetsConfirm] = useState(false)
  const [settlingBets, setSettlingBets] = useState(false)
  const [transactions, setTransactions] = useState<TransactionWithUser[]>([])
  const [loadingTxns, setLoadingTxns] = useState(false)
  const [loadTxnErr, setLoadTxnErr] = useState<string | null>(null)
  const [completingTxn, setCompletingTxn] = useState<string | null>(null)
  const [completingAll, setCompletingAll] = useState(false)
  const [markingTransactionsSettled, setMarkingTransactionsSettled] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [recalculatingLeaderboard, setRecalculatingLeaderboard] = useState(false)
  const [revertingTransactions, setRevertingTransactions] = useState(false)
  const [pickerAnswers, setPickerAnswers] = useState<UserAnswer[] | null>(null)
  const [pickerAllUsers, setPickerAllUsers] = useState<UserSummary[] | null>(null)
  const [showPickersModal, setShowPickersModal] = useState(false)
  const [editStartTime, setEditStartTime] = useState<string>('')
  const [savingStartTime, setSavingStartTime] = useState(false)
  const [togglingDelayed, setTogglingDelayed] = useState(false)

  const match = allMatches.find(m => m.id === matchId)

  // ── Load questions for selected match ───────────────────────────────────────
  const loadQuestions = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setLoadErr(null)
    setRows([])
    try {
      const qs = await api.questions.getByMatch(id)
      setRows([...qs].sort((a, b) => a.sequence - b.sequence).map(q => ({ kind: 'saved', q })))
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadQuestions(matchId) }, [matchId, loadQuestions])

  // ── Load match status when match changes ────────────────────────────────────
  useEffect(() => {
    if (!matchId) return
    setMatchStatus(null)
    api.matchStatuses.getByMatchId(matchId)
      .then(s => setMatchStatus(s))
      .catch(() => setMatchStatus(null))
  }, [matchId])

  // ── Sync editStartTime default to effective match commence date ────────────
  useEffect(() => {
    const raw = matchStatus?.matchCommenceStartDate ?? match?.matchCommenceStartDate ?? ''
    setEditStartTime(raw ? raw.substring(0, 16) : '')
  }, [matchStatus?.matchCommenceStartDate, match?.matchCommenceStartDate])

  // ── Load picker data when status is ReadyForPicks ─────────────────────────
  useEffect(() => {
    if (!matchId || matchStatus?.status !== MatchStatusValue.ReadyForPicks) {
      setPickerAnswers(null)
      setPickerAllUsers(null)
      return
    }
    Promise.all([
      api.userAnswers.getByMatch(matchId),
      api.users.getAllSummary(),
    ])
      .then(([answers, users]) => {
        setPickerAnswers(answers)
        setPickerAllUsers(users.filter(u => u.isActive))
      })
      .catch(() => { setPickerAnswers(null); setPickerAllUsers(null) })
  }, [matchId, matchStatus?.status])

  // ── Set Ready for Picks ─────────────────────────────────────────────────────
  async function handleSetReadyForPicks() {
    setSettingReady(true)
    try {
      let updated: MatchStatusRecord
      if (matchStatus) {
        updated = await api.matchStatuses.update({ ...matchStatus, status: MatchStatusValue.ReadyForPicks })
      } else {
        updated = await api.matchStatuses.create({ matchId, status: MatchStatusValue.ReadyForPicks })
      }
      setMatchStatus(updated)
      setShowConfirm(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update match status')
    } finally {
      setSettingReady(false)
    }
  }

  // ── Calculate Betting Stats ─────────────────────────────────────────────
  async function handleCalculateBets() {
    setCalculatingBets(true)
    try {
      await api.bettingStats.calculate(matchId)
      // Reload questions to surface fresh bettingStats
      await loadQuestions(matchId)
      // Status is now BetsUpdated on the backend — reflect locally
      setMatchStatus(prev => prev ? { ...prev, status: MatchStatusValue.BetsUpdated } : prev)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to calculate betting stats')
    } finally {
      setCalculatingBets(false)
    }
  }

  // ── Mark Match as Complete ──────────────────────────────────────────────
  async function handleMarkMatchComplete() {
    setMarkingComplete(true)
    try {
      const updated = await api.matchStatuses.markMatchComplete(matchId)
      setMatchStatus(updated)
      setShowCompleteConfirm(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark match as complete')
    } finally {
      setMarkingComplete(false)
    }
  }

  // ── Override Match Status (SuperAdmin) ───────────────────────────────────
  async function handleOverrideStatus(status: MatchStatusValue) {
    setOverridingStatus(true)
    try {
      const updated = await api.matchStatuses.overrideStatus(matchId, status)
      setMatchStatus(updated)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to override match status')
    } finally {
      setOverridingStatus(false)
      setShowOverrideConfirm(false)
      setPendingOverrideStatus(null)
    }
  }

  // ── Set Correct Answer ───────────────────────────────────────────────────
  async function handleSetCorrectAnswer(questionId: string, qMatchId: string, correctOptionId: number) {
    setSettingCorrectAnswer(prev => ({ ...prev, [questionId]: true }))
    try {
      const updated = await api.questions.setCorrectAnswer(questionId, qMatchId, correctOptionId)
      setRows(prev => prev.map(r =>
        r.kind === 'saved' && r.q.id === questionId ? ({ kind: 'saved', q: updated } as SavedRow) : r,
      ))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set correct answer')
    } finally {
      setSettingCorrectAnswer(prev => ({ ...prev, [questionId]: false }))
    }
  }

  // ── Settle Bets ────────────────────────────────────────────────────────────
  async function handleSettleBets() {
    setSettlingBets(true)
    try {
      await api.betSettlement.settle(matchId)
      setMatchStatus(prev => prev ? { ...prev, status: MatchStatusValue.BetsSettled } : prev)
      setShowSettleBetsConfirm(false)
      // Reload questions to get updated finalStats
      await loadQuestions(matchId)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to settle bets')
    } finally {
      setSettlingBets(false)
    }
  }

  // ── Load transactions when BetsSettled ──────────────────────────────────────
  const loadTransactions = useCallback(async (id: string) => {
    setLoadingTxns(true)
    setLoadTxnErr(null)
    try {
      const txns = await api.transactions.getByMatch(id)
      setTransactions(txns.sort((a, b) => a.userName.localeCompare(b.userName)))
    } catch (e) {
      setLoadTxnErr(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setLoadingTxns(false)
    }
  }, [])

  useEffect(() => {
    const status = matchStatus?.status ?? -1
    const showTxns = status === MatchStatusValue.BetsSettled
      || status === MatchStatusValue.TransactionsSettled
      || status === MatchStatusValue.Done
    if (showTxns && matchId) {
      void loadTransactions(matchId)
    } else {
      setTransactions([])
    }
  }, [matchStatus?.status, matchId, loadTransactions])

  // ── Complete single transaction ──────────────────────────────────────────────
  async function handleCompleteTransaction(transactionId: string) {
    setCompletingTxn(transactionId)
    try {
      await api.transactions.completeTransaction(transactionId)
      setTransactions(prev =>
        prev.map(t => t.id === transactionId ? { ...t, status: TransactionStatus.Completed } : t)
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to complete transaction')
    } finally {
      setCompletingTxn(null)
    }
  }

  // ── Complete all transactions ────────────────────────────────────────────────
  async function handleCompleteAll() {
    setCompletingAll(true)
    try {
      await api.transactions.completeAll(matchId)
      setTransactions(prev => prev.map(t => ({ ...t, status: TransactionStatus.Completed })))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to complete all transactions')
    } finally {
      setCompletingAll(false)
    }
  }

  // ── Mark Transactions Settled ────────────────────────────────────────────────
  async function handleMarkTransactionsSettled() {
    setMarkingTransactionsSettled(true)
    try {
      const updated = await api.matchStatuses.markTransactionsSettled(matchId)
      setMatchStatus(updated)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark transactions as settled')
    } finally {
      setMarkingTransactionsSettled(false)
    }
  }

  // ── Mark Done ───────────────────────────────────────────────────────────────
  async function handleMarkDone() {
    setMarkingDone(true)
    try {
      const updated = await api.matchStatuses.markDone(matchId)
      setMatchStatus(updated)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark match as done')
    } finally {
      setMarkingDone(false)
    }
  }

  // ── Archive Match ─────────────────────────────────────────────────────────────
  async function handleArchive() {
    if (!confirm('Archive this match? It will be hidden from players.')) return
    setArchiving(true)
    try {
      const updated = await api.matchStatuses.archive(matchId)
      setMatchStatus(updated)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to archive match')
    } finally {
      setArchiving(false)
    }
  }

  // ── Recalculate Leaderboard ───────────────────────────────────────────────────
  async function handleRecalculateLeaderboard() {
    if (!confirm('Recalculate leaderboard for this match? This will update the leaderboard based on all matches completed before this one.')) return
    setRecalculatingLeaderboard(true)
    try {
      const updated = await api.matchStatuses.recalculateLeaderboard(matchId)
      setMatchStatus(updated)
      alert('Leaderboard recalculated successfully!')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to recalculate leaderboard')
    } finally {
      setRecalculatingLeaderboard(false)
    }
  }

  // ── Revert Transactions ───────────────────────────────────────────────────────
  async function handleRevertTransactions() {
    if (!confirm('⚠️ WARNING: This will revert ALL completed transactions for this match, restore user credits, delete all transactions, clear question results, and reset match status to "Match Completed".\n\n⚠️ IMPORTANT: This operation is NOT fully atomic. If it fails midway, database may be in inconsistent state.\n\n⚠️ Ensure no other operations are running on this match.\n\nAre you absolutely sure you want to proceed?')) return
    setRevertingTransactions(true)
    try {
      const result = await api.betSettlement.revertTransactions(matchId)
      await loadQuestions(matchId)
      setTransactions([])
      const updatedStatus = await api.matchStatuses.getByMatchId(matchId)
      setMatchStatus(updatedStatus)
      
      let alertMessage = `✅ ${result.message}\n\n`
      alertMessage += `• Completed transactions reverted: ${result.completedReverted}\n`
      alertMessage += `• Total transactions deleted: ${result.totalDeleted}\n`
      alertMessage += `• Questions cleared: ${result.questionsCleared}\n`
      alertMessage += `• Total credits reverted: ${result.totalCreditsReverted.toFixed(2)} cr`
      
      if (result.hasWarnings && result.warnings.length > 0) {
        alertMessage += '\n\n⚠️ WARNINGS:\n' + result.warnings.slice(0, 5).join('\n')
        if (result.warnings.length > 5) {
          alertMessage += `\n... and ${result.warnings.length - 5} more warnings`
        }
        alertMessage += '\n\n⚠️ Please verify user credits and match data!'
      }
      
      if (result.skippedUsers > 0 || result.failedDeletes > 0 || result.failedQuestions > 0) {
        alertMessage += `\n\n⚠️ ISSUES DETECTED:\n`
        if (result.skippedUsers > 0) alertMessage += `• ${result.skippedUsers} user(s) not found (transactions skipped)\n`
        if (result.failedDeletes > 0) alertMessage += `• ${result.failedDeletes} transaction deletion(s) failed\n`
        if (result.failedQuestions > 0) alertMessage += `• ${result.failedQuestions} question update(s) failed\n`
        alertMessage += '\n⚠️ Manual cleanup may be required!'
      }
      
      alert(alertMessage)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to revert transactions'
      alert(`❌ ERROR: ${errorMsg}\n\n⚠️ Database may be in inconsistent state. Check server logs and verify data integrity!`)
    } finally {
      setRevertingTransactions(false)
    }
  }

  // ── Update Match Start Time ────────────────────────────────────────────────
  async function handleSaveStartTime() {
    if (!editStartTime || !matchId) return
    setSavingStartTime(true)
    try {
      const updated = await api.matchStatuses.updateStartTime(matchId, editStartTime)
      setMatchStatus(updated)
      alert('Match start time updated successfully.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update start time')
    } finally {
      setSavingStartTime(false)
    }
  }

  // ── Toggle Delayed ─────────────────────────────────────────────────────────
  async function handleToggleDelayed() {
    if (!matchId || !matchStatus) return
    setTogglingDelayed(true)
    try {
      const updated = matchStatus.isDelayed
        ? await api.matchStatuses.unmarkDelayed(matchId)
        : await api.matchStatuses.markDelayed(matchId)
      setMatchStatus(updated)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to toggle delayed status')
    } finally {
      setTogglingDelayed(false)
    }
  }

  // ── Draft state helpers ─────────────────────────────────────────────────────
  const patchDraft = (key: string, patch: Partial<EditDraft>) =>
    setRows(prev => prev.map(r => {
      if (rowKey(r) !== key) return r
      if (r.kind === 'new')     return { ...r, draft: { ...r.draft, ...patch } } as NewRow
      if (r.kind === 'editing') return { ...r, draft: { ...r.draft, ...patch } } as EditingRow
      return r
    }))

  const addBlank = () =>
    setRows(prev => [...prev, { kind: 'new', key: genKey(), draft: blankDraft() }])

  const addFromTemplate = (t: QuestionTemplate) => {
    const draft = blankDraft(
      applyTeams(t.questionText, match),
      t.options.map(o => ({ id: o.id, optionText: applyTeams(o.optionText, match) })),
      t.credits,
    )
    setRows(prev => [...prev, { kind: 'new', key: genKey(), draft }])
    setShowPicker(false)
  }

  const removeNew = (key: string) =>
    setRows(prev => prev.filter(r => !(r.kind === 'new' && r.key === key)))

  const startEdit = (id: string) =>
    setRows(prev => prev.map(r => {
      if (r.kind !== 'saved' || r.q.id !== id) return r
      return {
        kind: 'editing', q: r.q,
        draft: blankDraft(
          r.q.questionText,
          [...r.q.options],
          r.q.credits,
        ),
      } as EditingRow
    }))

  const cancelEdit = (id: string) =>
    setRows(prev => prev.map(r =>
      r.kind === 'editing' && r.q.id === id ? ({ kind: 'saved', q: r.q } as SavedRow) : r,
    ))

  // ── Option management ───────────────────────────────────────────────────────
  const updateOption = (key: string, idx: number, text: string) =>
    setRows(prev => prev.map(r => {
      if (rowKey(r) !== key) return r
      const draft = (r.kind === 'new' || r.kind === 'editing') ? r.draft : null
      if (!draft) return r
      const options = [...draft.options]
      options[idx] = { ...options[idx], optionText: text }
      if (r.kind === 'new')     return { ...r, draft: { ...draft, options } } as NewRow
      if (r.kind === 'editing') return { ...r, draft: { ...draft, options } } as EditingRow
      return r
    }))

  const addOption = (key: string) =>
    setRows(prev => prev.map(r => {
      if (rowKey(r) !== key) return r
      const draft = (r.kind === 'new' || r.kind === 'editing') ? r.draft : null
      if (!draft || draft.options.length >= 10) return r
      const newId = Math.max(...draft.options.map(o => o.id), 0) + 1
      const options = [...draft.options, { id: newId, optionText: '' }]
      if (r.kind === 'new')     return { ...r, draft: { ...draft, options } } as NewRow
      if (r.kind === 'editing') return { ...r, draft: { ...draft, options } } as EditingRow
      return r
    }))

  const removeOption = (key: string, idx: number) =>
    setRows(prev => prev.map(r => {
      if (rowKey(r) !== key) return r
      const draft = (r.kind === 'new' || r.kind === 'editing') ? r.draft : null
      if (!draft || draft.options.length <= 2) return r
      const options = draft.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, id: i + 1 }))
      if (r.kind === 'new')     return { ...r, draft: { ...draft, options } } as NewRow
      if (r.kind === 'editing') return { ...r, draft: { ...draft, options } } as EditingRow
      return r
    }))

  // ── API actions ─────────────────────────────────────────────────────────────
  const saveNew = async (key: string) => {
    const rowIdx = rows.findIndex(r => r.kind === 'new' && r.key === key)
    const row = rows[rowIdx]
    if (!row || row.kind !== 'new') return

    // Frontend validation
    const texts = row.draft.options.map(o => o.optionText.trim().toLowerCase())
    if (new Set(texts).size !== texts.length) {
      patchDraft(key, { error: 'Duplicate option texts not allowed' })
      return
    }
    if (row.draft.credits <= 0) {
      patchDraft(key, { error: 'Credits must be greater than 0' })
      return
    }

    patchDraft(key, { submitting: true, error: null })
    try {
      const created = await api.questions.create({
        matchId,
        questionText: row.draft.questionText,
        options: row.draft.options,
        credits: row.draft.credits,
        sequence: rowIdx + 1,
        correctOptionId: null,
      })
      setRows(prev => prev.map(r =>
        r.kind === 'new' && r.key === key ? ({ kind: 'saved', q: created } as SavedRow) : r,
      ))
    } catch (e) {
      patchDraft(key, { submitting: false, error: e instanceof Error ? e.message : 'Save failed' })
    }
  }

  const updateEditing = async (id: string) => {
    const row = rows.find((r): r is EditingRow => r.kind === 'editing' && r.q.id === id)
    if (!row) return

    // Frontend validation
    const texts = row.draft.options.map(o => o.optionText.trim().toLowerCase())
    if (new Set(texts).size !== texts.length) {
      patchDraft(id, { error: 'Duplicate option texts not allowed' })
      return
    }
    if (row.draft.credits <= 0) {
      patchDraft(id, { error: 'Credits must be greater than 0' })
      return
    }

    patchDraft(id, { submitting: true, error: null })
    try {
      const updated = await api.questions.update({
        ...row.q,
        questionText: row.draft.questionText,
        options: row.draft.options,
        credits: row.draft.credits,
      })
      setRows(prev => prev.map(r =>
        r.kind === 'editing' && r.q.id === id ? ({ kind: 'saved', q: updated } as SavedRow) : r,
      ))
    } catch (e) {
      patchDraft(id, { submitting: false, error: e instanceof Error ? e.message : 'Update failed' })
    }
  }

  const deleteQuestion = async (id: string) => {
    const row = rows.find(r => (r.kind === 'saved' || r.kind === 'editing') && r.q.id === id)
    if (!row || row.kind === 'new') return
    patchDraft(id, { submitting: true, error: null })
    try {
      await api.questions.delete(row.q.id, row.q.matchId)
      setRows(prev => prev.filter(r => rowKey(r) !== id))
    } catch (e) {
      patchDraft(id, { submitting: false, error: e instanceof Error ? e.message : 'Delete failed' })
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const savedCount   = rows.filter(r => r.kind === 'saved').length
  const newCount     = rows.filter(r => r.kind === 'new').length
  const totalCredits = rows.reduce((sum, r) => {
    if (r.kind === 'saved')   return sum + r.q.credits
    if (r.kind === 'editing') return sum + r.q.credits
    return sum + (r.draft.credits || 0)
  }, 0)
  const pickerTemplates = pickerCat === 'All'
    ? allTemplates
    : allTemplates.filter(t => t.category === pickerCat)

  const picksStatus = matchStatus?.status ?? MatchStatusValue.NotStarted
  const isDelayed = matchStatus?.isDelayed ?? false
  const isLocked = picksStatus !== MatchStatusValue.NotStarted
  const canSetReady = picksStatus === MatchStatusValue.NotStarted
  const canCalculateBets = picksStatus === MatchStatusValue.PicksClosed || picksStatus === MatchStatusValue.BetsUpdated
  const canMarkComplete = picksStatus === MatchStatusValue.BetsUpdated
  const isMatchCompleted = picksStatus === MatchStatusValue.MatchCompleted
  const savedRows = rows.filter((r): r is SavedRow => r.kind === 'saved')
  const allCorrectAnswersDefined = isMatchCompleted && savedRows.length > 0 && savedRows.every(r => r.q.correctOptionId !== null)
  const canSettleBets = isMatchCompleted
  const isBetsSettled = picksStatus === MatchStatusValue.BetsSettled
  const hasPendingTxns = transactions.some(t => t.status === TransactionStatus.Pending)
  const allTxnsCompleted = isBetsSettled && transactions.length > 0 && !hasPendingTxns
  const isTransactionsSettled = picksStatus === MatchStatusValue.TransactionsSettled
  const isDone = picksStatus === MatchStatusValue.Done
  const isArchived = picksStatus === MatchStatusValue.Archived

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div>
          <h2 className="matches-page-title">Match Questions</h2>
          {!loading && (
            <p className="subtle">
              {savedCount} saved{newCount > 0 ? ` · ${newCount} unsaved` : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {canSetReady && savedCount > 0 && (
            <button
              type="button"
              className="ready-for-picks-btn"
              onClick={() => setShowConfirm(true)}
            >
              ✓ Set Ready for Picks
            </button>
          )}
          {!canSetReady && (
            <span className={`picks-status-badge picks-status--${picksStatus}`}>
              {MATCH_STATUS_LABELS[picksStatus]}{isDelayed ? ' · Delayed' : ''}
            </span>
          )}
          {picksStatus === MatchStatusValue.ReadyForPicks && matchStatus !== null && (
            <button
              type="button"
              className={isDelayed ? 'calculate-bets-btn' : 'ready-for-picks-btn'}
              style={{ background: isDelayed ? undefined : '#f59e0b22', borderColor: '#f59e0b66', color: '#f59e0b' }}
              disabled={togglingDelayed}
              onClick={() => void handleToggleDelayed()}
            >
              {togglingDelayed ? '…' : isDelayed ? '▶ Unmark Delayed' : '⏸ Mark as Delayed'}
            </button>
          )}
          {picksStatus === MatchStatusValue.ReadyForPicks && pickerAnswers !== null && pickerAllUsers !== null && (
            <button
              type="button"
              className="mq-stat-pill mq-pickers-chip"
              style={{ fontSize: '0.8rem', cursor: 'pointer' }}
              onClick={() => setShowPickersModal(true)}
            >
              👥 {pickerAnswers.length} / {pickerAllUsers.length} submitted picks
            </button>
          )}
          {canCalculateBets && (
            <button
              type="button"
              className="calculate-bets-btn"
              disabled={calculatingBets}
              onClick={() => void handleCalculateBets()}
            >
              {calculatingBets ? 'Calculating…' : '📊 Calculate Bets'}
            </button>
          )}
          {canMarkComplete && (
            <button
              type="button"
              className="mark-complete-btn"
              onClick={() => setShowCompleteConfirm(true)}
            >
              🏁 Mark Match as Complete
            </button>
          )}
          {canSettleBets && (
            <button
              type="button"
              className="settle-bets-btn"
              disabled={!allCorrectAnswersDefined}
              title={!allCorrectAnswersDefined ? 'Set correct answers for all questions first' : undefined}
              onClick={() => setShowSettleBetsConfirm(true)}
            >
              💰 Settle Bets
            </button>
          )}
          {isBetsSettled && (
            <button
              type="button"
              className="mark-complete-btn"
              disabled={markingTransactionsSettled || !allTxnsCompleted}
              title={!allTxnsCompleted ? 'Complete all transactions first' : undefined}
              onClick={() => void handleMarkTransactionsSettled()}
            >
              {markingTransactionsSettled ? 'Settling…' : '🧾 Mark Transactions Settled'}
            </button>
          )}
          {isTransactionsSettled && (
            <button
              type="button"
              className="settle-bets-btn"
              disabled={markingDone}
              onClick={() => void handleMarkDone()}
            >
              {markingDone ? 'Finishing…' : '🏆 Mark as Done'}
            </button>
          )}
          {isDone && (
            <button
              type="button"
              className="archive-match-btn"
              disabled={archiving}
              onClick={() => void handleArchive()}
            >
              {archiving ? 'Archiving…' : '🗄️ Archive Match'}
            </button>
          )}
          {(isDone || isArchived) && (
            <button
              type="button"
              className="settle-bets-btn"
              disabled={recalculatingLeaderboard}
              onClick={() => void handleRecalculateLeaderboard()}
            >
              {recalculatingLeaderboard ? 'Recalculating…' : '🔄 Recalculate Leaderboard'}
            </button>
          )}
          {isSuperAdmin && (isBetsSettled || isTransactionsSettled || isDone) && (
            <button
              type="button"
              className="btn-danger"
              style={{ 
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: '1px solid #ff4d4f66',
                background: '#ff4d4f18',
                color: '#ff6b6b',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                minHeight: '36px'
              }}
              disabled={revertingTransactions}
              onClick={() => void handleRevertTransactions()}
            >
              {revertingTransactions ? 'Reverting…' : '⚠️ Revert Transactions'}
            </button>
          )}
          {isSuperAdmin && matchStatus !== null && (
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}
              value={picksStatus}
              disabled={overridingStatus}
              title="Super Admin: Override match status"
              onChange={e => {
                const val = Number(e.target.value) as MatchStatusValue
                if (val === picksStatus) return
                setPendingOverrideStatus(val)
                setShowOverrideConfirm(true)
              }}
            >
              {(Object.entries(MATCH_STATUS_LABELS) as [string, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          )}
          {!isLocked && (
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowPicker(true)}>
                📋 From Template
              </button>
              <button type="button" className="btn-primary" onClick={addBlank}>
                + Add Question
              </button>
            </>
          )}
        </div>
      </div>

      {/* Match selector */}
      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <div className="form-group" style={{ marginBottom: match ? '1rem' : 0 }}>
          <label className="form-label" htmlFor="mq-match">Match</label>
          <select
            id="mq-match"
            className="form-control"
            value={matchId}
            onChange={e => setMatchId(e.target.value)}
          >
            {allMatches.map(m => (
              <option key={m.id} value={m.id}>{matchLabel(m)}</option>
            ))}
          </select>
        </div>

        {match && (
          <>
          <div className="mq-match-info">
            <div className="mq-match-teams">
              <span className="mq-team">{match.firstBattingTeamName}</span>
              <span className="mq-vs">vs</span>
              <span className="mq-team">{match.secondBattingTeamName}</span>
            </div>
            <div className="mq-match-meta">
              <span className="mq-match-date">
                {new Date(match.matchDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {rows.length > 0 && (
                <span className="mq-total-credits">
                  <span className="mq-total-credits-label">Total credits</span>
                  <span className="qt-credits">{totalCredits.toFixed(2)} cr</span>
                </span>
              )}
            </div>
          </div>

          {/* Edit Match Start Time */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p className="form-label" style={{ marginBottom: '0.4rem' }}>
              Match Start Time (IST)
              {matchStatus?.matchCommenceStartDate
                ? <span className="subtle" style={{ marginLeft: '0.5rem', fontWeight: 400 }}>
                    Current: {new Date(matchStatus.matchCommenceStartDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                : <span className="subtle" style={{ marginLeft: '0.5rem', fontWeight: 400 }}>
                    Current: {new Date(match.matchCommenceStartDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })} (from schedule)
                  </span>
              }
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="datetime-local"
                className="form-control"
                style={{ width: 'auto' }}
                value={editStartTime}
                onChange={e => setEditStartTime(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                disabled={savingStartTime || !editStartTime}
                onClick={() => void handleSaveStartTime()}
              >
                {savingStartTime ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="mq-locked-notice">
          🔒 Questions are locked — match status is <strong>{MATCH_STATUS_LABELS[picksStatus]}</strong>. Only editable when status is <em>Not Started</em>.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p className="subtle">Loading questions...</p>
        </div>
      )}

      {/* Load error */}
      {!loading && loadErr !== null && (
        <div className="panel" style={{ color: 'var(--rose)' }}>
          <p style={{ margin: '0 0 0.75rem' }}>{loadErr}</p>
          <button className="btn-secondary" type="button" onClick={() => void loadQuestions(matchId)}>
            Retry
          </button>
        </div>
      )}

      {/* Transactions panel (BetsSettled / TransactionsSettled / Done) */}
      {(isBetsSettled || isTransactionsSettled || isDone) && (
        <div className="panel txn-panel">
          <div className="txn-panel-header">
            <div>
              <h3 className="txn-panel-title">💳 Transactions</h3>
              <p className="subtle" style={{ margin: '0.15rem 0 0', fontSize: '0.82rem' }}>
                {transactions.length} user{transactions.length !== 1 ? 's' : ''}
                {hasPendingTxns ? ` · ${transactions.filter(t => t.status === TransactionStatus.Pending).length} pending` : ' · all completed'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.82rem' }}
                disabled={loadingTxns}
                onClick={() => void loadTransactions(matchId)}
              >
                🔄 Refresh
              </button>
              {hasPendingTxns && (
                <button
                  type="button"
                  className="settle-bets-btn"
                  disabled={completingAll || !!completingTxn}
                  onClick={() => void handleCompleteAll()}
                >
                  {completingAll ? 'Completing…' : '✅ Complete All'}
                </button>
              )}
            </div>
          </div>

          {loadingTxns && (
            <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>Loading transactions…</p>
          )}
          {loadTxnErr && (
            <p style={{ color: 'var(--rose)', margin: 0 }}>{loadTxnErr}</p>
          )}
          {!loadingTxns && !loadTxnErr && transactions.length === 0 && (
            <p className="subtle" style={{ textAlign: 'center', padding: '1.5rem 0' }}>No transactions found for this match.</p>
          )}
          {!loadingTxns && transactions.length > 0 && (
            <div className="txn-table-wrap">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Net Credits</th>
                    <th>Breakdown</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const isCompleted = t.status === TransactionStatus.Completed
                    return (
                      <tr key={t.id} className={`txn-row${isCompleted ? ' txn-row--completed' : ''}`}>
                        <td className="txn-user">{t.userName}</td>
                        <td className={`txn-net ${t.overallCreditChange >= 0 ? 'txn-credit--pos' : 'txn-credit--neg'}`}>
                          {t.overallCreditChange >= 0 ? '+' : ''}{t.overallCreditChange.toFixed(2)} cr
                        </td>
                        <td>
                          <div className="txn-changes">
                            {(t.changes ?? []).map(c => (
                              <span key={c.questionId} className={`txn-change-chip txn-outcome--${c.outcome}`}>
                                {OUTCOME_LABELS[c.outcome]}
                                {c.creditChange !== 0 && ` ${c.creditChange >= 0 ? '+' : ''}${c.creditChange.toFixed(2)}`}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`txn-status-badge txn-status--${isCompleted ? 'completed' : 'pending'}`}>
                            {isCompleted ? '✅ Completed' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          {!isCompleted && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem' }}
                              disabled={completingTxn === t.id || completingAll}
                              onClick={() => void handleCompleteTransaction(t.id)}
                            >
                              {completingTxn === t.id ? '…' : 'Complete'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && loadErr === null && rows.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p className="subtle" style={{ marginBottom: '1rem' }}>No questions yet for this match.</p>
          {!isLocked && (
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowPicker(true)}>
                📋 Pick from Templates
              </button>
              <button type="button" className="btn-primary" onClick={addBlank}>
                + Add Blank
              </button>
            </div>
          )}
        </div>
      )}

      {/* Question rows */}
      {!loading && rows.length > 0 && (
        <div className="mq-list">
          {rows.map((row, idx) => {
            const key = rowKey(row)

            if (row.kind === 'saved') {
              const stats = row.q.bettingStats ?? null
              return (
                <div key={key} className="mq-card mq-card--saved">
                  <div className="mq-card-header">
                    <span className="mq-seq">Q{idx + 1}</span>
                    <span className="mq-question-text">{row.q.questionText}</span>
                    <div className="mq-card-actions">
                      <span className="qt-credits">{row.q.credits.toFixed(2)} cr</span>
                      {!isLocked && (
                        <>
                          <button
                            className="btn-icon edit"
                            type="button"
                            title="Edit question"
                            onClick={() => startEdit(row.q.id)}
                          >✏️</button>
                          <button
                            className="btn-icon danger"
                            type="button"
                            title="Delete question"
                            onClick={() => void deleteQuestion(row.q.id)}
                          >🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mq-options-row">
                    {row.q.options.map(o => (
                      <div key={o.id} className="mq-option-chip">
                        <span className="mq-option-num">{o.id}</span>
                        {o.optionText}
                      </div>
                    ))}
                  </div>

                  {/* Correct answer selector (MatchCompleted only) */}
                  {isMatchCompleted && (
                    <div className="mq-correct-answer-row">
                      <span className="mq-correct-answer-label">✅ Correct Answer:</span>
                      <div className="mq-correct-answer-options">
                        {row.q.options.map(o => (
                          <button
                            key={o.id}
                            type="button"
                            disabled={settingCorrectAnswer[row.q.id]}
                            className={`mq-correct-option-btn${row.q.correctOptionId === o.id ? ' mq-correct-option-btn--selected' : ''}`}
                            onClick={() => void handleSetCorrectAnswer(row.q.id, row.q.matchId, o.id)}
                          >
                            {row.q.correctOptionId === o.id && <span className="mq-correct-tick">✓ </span>}
                            {o.optionText}
                          </button>
                        ))}
                        {row.q.correctOptionId === null && (
                          <span className="mq-correct-unset">Not set</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Betting stats panel */}
                  {stats && (
                    <div className="mq-betting-stats">
                      <div className="mq-betting-stats-header">
                        <span className="mq-betting-stats-title">📊 Betting Stats</span>
                        <span className="mq-bets-timestamp">
                          Updated {new Date(stats.lastCalculatedAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="mq-betting-summary">
                        <span className="mq-stat-pill">{stats.totalEligible} eligible</span>
                        <span className="mq-stat-pill mq-stat-pill--green">{stats.totalVotes} answered</span>
                        {stats.unansweredCount > 0 && (
                          <span className="mq-stat-pill mq-stat-pill--red">
                            {stats.unansweredCount} unanswered (auto-lost)
                          </span>
                        )}
                      </div>
                      <div className="mq-option-stats-list">
                        {stats.optionStats.map(os => {
                          const option = row.q.options.find(o => o.id === os.optionId)
                          const pct = stats.totalEligible > 0
                            ? (os.voteCount / stats.totalEligible) * 100
                            : 0
                          const displayVoters = os.voters
                          return (
                            <div key={os.optionId} className="mq-option-stat">
                              <div className="mq-option-stat-row">
                                <span className="mq-option-stat-num">{os.optionId}</span>
                                <span className="mq-option-stat-name">
                                  {option?.optionText ?? `Option ${os.optionId}`}
                                </span>
                                <span className="mq-option-stat-count">
                                  {os.voteCount} / {stats.totalEligible}
                                </span>
                                {os.potentialWinCredits > 0 ? (
                                  <span className="mq-option-stat-win">
                                    +{os.potentialWinCredits.toFixed(2)} cr bonus
                                  </span>
                                ) : (
                                  <span className="mq-option-stat-nowin">No bonus</span>
                                )}
                              </div>
                              <div className="mq-option-bar-track">
                                <div
                                  className={`mq-option-bar-fill mq-option-bar-fill--${os.optionId}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {displayVoters.length > 0 && (
                                <div className="mq-voter-chips">
                                  {displayVoters.map(v => (
                                    <span key={v.userId} className="mq-voter-chip">{v.userName}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // EditingRow or NewRow — both have draft
            const draft = row.draft
            const isNew = row.kind === 'new'

            return (
              <div key={key} className="mq-card mq-card--editing">
                <div className="mq-edit-header">
                  <span className={`mq-seq${isNew ? ' mq-seq--new' : ''}`}>
                    {isNew ? 'New' : `Q${idx + 1}`}
                  </span>
                  <span className="mq-edit-label">
                    {isNew ? 'New Question' : 'Editing'}
                  </span>
                </div>

                <div className="mq-edit-body">
                  <div className="form-group">
                    <label className="form-label">Question</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="Enter question text..."
                      value={draft.questionText}
                      disabled={draft.submitting}
                      onChange={e => patchDraft(key, { questionText: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Options (min 2, max 10)</label>
                    <div className="mq-options-editor">
                      {draft.options.map((opt, idx) => (
                        <div key={opt.id} className="mq-option-row">
                          <span className="mq-option-num">{opt.id}</span>
                          <input
                            className="form-control"
                            type="text"
                            placeholder={`Option ${opt.id}`}
                            value={opt.optionText}
                            disabled={draft.submitting}
                            onChange={e => updateOption(key, idx, e.target.value)}
                          />
                          {draft.options.length > 2 && (
                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => removeOption(key, idx)}
                              title="Remove option"
                              disabled={draft.submitting}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {draft.options.length < 10 && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => addOption(key)}
                          disabled={draft.submitting}
                        >
                          + Add Option
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ maxWidth: '180px' }}>
                    <label className="form-label">Credits</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="10"
                      value={draft.credits === 0 ? '' : draft.credits}
                      disabled={draft.submitting}
                      onChange={e => patchDraft(key, { credits: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {draft.error !== null && (
                    <p style={{ color: 'var(--rose)', fontSize: '0.85rem', margin: 0 }}>
                      {draft.error}
                    </p>
                  )}
                </div>

                <div className="mq-edit-footer">
                  {isNew ? (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={draft.submitting}
                        onClick={() => removeNew(key)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={draft.submitting || !draft.questionText.trim() || draft.options.length < 2 || draft.options.some(o => !o.optionText.trim())}
                        onClick={() => void saveNew(key)}
                      >
                        {draft.submitting ? 'Saving…' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-icon danger"
                        title="Delete question"
                        disabled={draft.submitting}
                        onClick={() => void deleteQuestion(key)}
                      >
                        🗑️
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={draft.submitting}
                          onClick={() => cancelEdit(key)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={draft.submitting || !draft.questionText.trim() || draft.options.length < 2 || draft.options.some(o => !o.optionText.trim())}
                          onClick={() => void updateEditing(key)}
                        >
                          {draft.submitting ? 'Saving…' : 'Update'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Template picker modal */}
      {showPicker && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowPicker(false) }}
        >
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3 className="modal-title">Pick a Question Template</h3>
              <button
                className="modal-close-btn"
                type="button"
                onClick={() => setShowPicker(false)}
              >✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Category filter */}
              <div className="match-filter-tabs" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                {TEMPLATE_CATS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`match-filter-tab${pickerCat === cat ? ' active' : ''}`}
                    onClick={() => setPickerCat(cat)}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem', minHeight: '30px' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Template list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {pickerTemplates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className="mq-template-row"
                    onClick={() => addFromTemplate(t)}
                  >
                    <div className="mq-template-body">
                      <span className="mq-template-q">{applyTeams(t.questionText, match)}</span>
                      <span className="mq-template-opts">
                        {t.options.map(o => applyTeams(o.optionText, match)).join('  ·  ')}
                      </span>
                    </div>
                    <span className="qt-credits" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      {t.credits.toFixed(2)} cr
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !settingReady) setShowConfirm(false) }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Set Ready for Picks?</h3>
              <button
                className="modal-close-btn"
                type="button"
                disabled={settingReady}
                onClick={() => setShowConfirm(false)}
              >✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 1rem' }}>
                Players will be able to submit their picks for:
              </p>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                {match?.firstBattingTeamCode} vs {match?.secondBattingTeamCode}
              </p>
              <div className="confirm-stats">
                <div className="confirm-stat">
                  <span className="confirm-stat-value">{savedCount}</span>
                  <span className="confirm-stat-label">Questions</span>
                </div>
                <div className="confirm-stat">
                  <span className="confirm-stat-value qt-credits">{totalCredits.toFixed(2)} cr</span>
                  <span className="confirm-stat-label">Total Credits</span>
                </div>
              </div>
              <p className="subtle" style={{ fontSize: '0.82rem', marginTop: '1rem', marginBottom: 0 }}>
                This will lock in the questions. Picks can be submitted until the match starts.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={settingReady}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ready-for-picks-btn"
                disabled={settingReady}
                onClick={() => void handleSetReadyForPicks()}
              >
                {settingReady ? 'Setting…' : '✓ Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mark Match Complete confirmation modal */}
      {showCompleteConfirm && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !markingComplete) setShowCompleteConfirm(false) }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Mark Match as Complete?</h3>
              <button
                className="modal-close-btn"
                type="button"
                disabled={markingComplete}
                onClick={() => setShowCompleteConfirm(false)}
              >✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 0.75rem' }}>
                This will set the match status to <strong>Match Completed</strong> for:
              </p>
              <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>
                {match?.firstBattingTeamCode} vs {match?.secondBattingTeamCode}
              </p>
              <p className="subtle" style={{ fontSize: '0.82rem', margin: 0 }}>
                This action requires the current status to be <em>Bets Updated</em>. Ensure all results are finalised before proceeding.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={markingComplete}
                onClick={() => setShowCompleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mark-complete-btn"
                disabled={markingComplete}
                onClick={() => void handleMarkMatchComplete()}
              >
                {markingComplete ? 'Marking…' : '🏁 Confirm Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override status confirmation modal (SuperAdmin) */}
      {showOverrideConfirm && pendingOverrideStatus !== null && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !overridingStatus) { setShowOverrideConfirm(false); setPendingOverrideStatus(null) } }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Override Match Status?</h3>
              <button
                className="modal-close-btn"
                type="button"
                disabled={overridingStatus}
                onClick={() => { setShowOverrideConfirm(false); setPendingOverrideStatus(null) }}
              >✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 0.5rem' }}>
                Change status from <strong>{MATCH_STATUS_LABELS[picksStatus]}</strong> → <strong>{MATCH_STATUS_LABELS[pendingOverrideStatus]}</strong>
              </p>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
                {match?.firstBattingTeamCode} vs {match?.secondBattingTeamCode}
              </p>
              <p className="subtle" style={{ fontSize: '0.82rem', margin: 0 }}>
                This bypasses all validation. Use with caution.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={overridingStatus}
                onClick={() => { setShowOverrideConfirm(false); setPendingOverrideStatus(null) }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={overridingStatus}
                onClick={() => void handleOverrideStatus(pendingOverrideStatus)}
              >
                {overridingStatus ? 'Overriding…' : '⚡ Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickers modal */}
      {showPickersModal && pickerAnswers !== null && pickerAllUsers !== null && (() => {
        const submittedIds = new Set(pickerAnswers.map(a => a.userId))
        const submitted = pickerAllUsers.filter(u => submittedIds.has(u.id))
        const notYet = pickerAllUsers.filter(u => !submittedIds.has(u.id))
        return (
          <div
            className="modal-overlay"
            onClick={e => { if (e.target === e.currentTarget) setShowPickersModal(false) }}
          >
            <div className="modal" style={{ maxWidth: '480px', width: '90%' }}>
              <div className="modal-header">
                <h3 className="modal-title">👥 Picks Submissions</h3>
                <button className="modal-close-btn" type="button" onClick={() => setShowPickersModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '1rem 1.25rem', maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="pickers-section">
                  <p className="pickers-section-label pickers-section-label--done">
                    ✅ Submitted ({submitted.length})
                  </p>
                  {submitted.length === 0
                    ? <p className="subtle" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0.75rem' }}>No submissions yet.</p>
                    : <div className="pickers-list">
                        {submitted.map(u => (
                          <span key={u.id} className="mq-voter-chip">{u.name}</span>
                        ))}
                      </div>
                  }
                </div>
                <div className="pickers-section" style={{ marginTop: '1.1rem' }}>
                  <p className="pickers-section-label pickers-section-label--pending">
                    ⏳ Yet to submit ({notYet.length})
                  </p>
                  {notYet.length === 0
                    ? <p className="subtle" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Everyone has submitted!</p>
                    : <div className="pickers-list">
                        {notYet.map(u => (
                          <span key={u.id} className="mq-voter-chip mq-voter-chip--pending">{u.name}</span>
                        ))}
                      </div>
                  }
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPickersModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Settle Bets confirmation modal */}
      {showSettleBetsConfirm && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !settlingBets) setShowSettleBetsConfirm(false) }}
        >
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3 className="modal-title">Settle Bets?</h3>
              <button
                className="modal-close-btn"
                type="button"
                disabled={settlingBets}
                onClick={() => setShowSettleBetsConfirm(false)}
              >✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 1rem' }}>
                Confirm correct answers for <strong>{match?.firstBattingTeamCode} vs {match?.secondBattingTeamCode}</strong>:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {savedRows.map((r, idx) => {
                  const correctOption = r.q.options.find(o => o.id === r.q.correctOptionId)
                  return (
                    <div key={r.q.id} className="settle-bets-question-row">
                      <span className="settle-bets-q-num">Q{idx + 1}</span>
                      <span className="settle-bets-q-text">{r.q.questionText}</span>
                      <span className="settle-bets-correct-answer">
                        ✅ {correctOption?.optionText ?? '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="subtle" style={{ fontSize: '0.82rem', margin: 0 }}>
                Proceeding will settle bets based on these correct answers.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={settlingBets}
                onClick={() => setShowSettleBetsConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settle-bets-btn"
                disabled={settlingBets}
                onClick={() => void handleSettleBets()}
              >
                {settlingBets ? 'Settling…' : '💰 Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
