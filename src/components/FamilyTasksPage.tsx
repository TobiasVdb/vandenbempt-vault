import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft'
import { ArrowRight } from '@phosphor-icons/react/ArrowRight'
import { CalendarBlank } from '@phosphor-icons/react/CalendarBlank'
import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { DotsSixVertical } from '@phosphor-icons/react/DotsSixVertical'
import { PencilSimple } from '@phosphor-icons/react/PencilSimple'
import { Plus } from '@phosphor-icons/react/Plus'
import { Trash } from '@phosphor-icons/react/Trash'
import { User } from '@phosphor-icons/react/User'
import { m } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { ACTION_BUTTON_PRESS, apiUrl } from '../app/constants'
import { PageHeader, SideSheet } from '../app/chrome'
import type { FamilyTask, FamilyTaskDraft, FamilyTaskStatus } from '../app/types'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'

const STATUSES: FamilyTaskStatus[] = ['planned', 'doing', 'done']
const ASSIGNEES = ['Sofie', 'Tobias', 'Ella', 'Sepp', 'Oma&Opa', 'Omi'] as const
const STATUS_META: Record<FamilyTaskStatus, { label: string; description: string }> = {
  planned: { label: 'Planned', description: 'Ready when the time is right' },
  doing: { label: 'Doing', description: 'Currently being followed up' },
  done: { label: 'Done', description: 'Finished and out of the way' },
}
const EMPTY_DRAFT: FamilyTaskDraft = { title: '', details: '', assignee: '', dueDate: '', status: 'planned' }

async function readPayload<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text()
  if (!text) return {} as T & { error?: string }
  try {
    return JSON.parse(text) as T & { error?: string }
  } catch {
    return { error: response.ok ? 'The server returned an invalid response.' : 'The request failed.' } as T & { error?: string }
  }
}

function sortTasks(tasks: FamilyTask[]) {
  return [...tasks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

export function FamilyTasksPage() {
  const [tasks, setTasks] = useState<FamilyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<FamilyTask | null>(null)
  const [draft, setDraft] = useState<FamilyTaskDraft>(EMPTY_DRAFT)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ status: FamilyTaskStatus; index: number } | null>(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(apiUrl('/family-tasks'))
      const payload = await readPayload<{ tasks?: FamilyTask[] }>(response)
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load family tasks.')
      setTasks(payload.tasks ?? [])
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load family tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const columns = useMemo(() => Object.fromEntries(
    STATUSES.map((status) => [status, sortTasks(tasks.filter((task) => task.status === status))]),
  ) as Record<FamilyTaskStatus, FamilyTask[]>, [tasks])

  const openCreate = (status: FamilyTaskStatus = 'planned') => {
    setEditingTask(null)
    setDraft({ ...EMPTY_DRAFT, status })
    setSheetOpen(true)
  }

  const openEdit = (task: FamilyTask) => {
    setEditingTask(task)
    setDraft({
      title: task.title,
      details: task.details ?? '',
      assignee: task.assignee ?? '',
      dueDate: task.dueDate ?? '',
      status: task.status,
    })
    setSheetOpen(true)
  }

  const saveTask = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) return
    setSaving(true)
    try {
      const response = await fetch(apiUrl(editingTask ? `/family-tasks/${editingTask.id}` : '/family-tasks'), {
        method: editingTask ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const payload = await readPayload<{ task?: FamilyTask }>(response)
      if (!response.ok || !payload.task) throw new Error(payload.error ?? 'Unable to save the task.')
      setTasks((current) => editingTask
        ? current.map((task) => task.id === payload.task!.id ? payload.task! : task)
        : [...current, payload.task!])
      setSheetOpen(false)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save the task.')
    } finally {
      setSaving(false)
    }
  }

  const deleteTask = async () => {
    if (!editingTask || !window.confirm(`Delete “${editingTask.title}”?`)) return
    setSaving(true)
    try {
      const response = await fetch(apiUrl(`/family-tasks/${editingTask.id}`), { method: 'DELETE' })
      if (!response.ok) {
        const payload = await readPayload<Record<string, never>>(response)
        throw new Error(payload.error ?? 'Unable to delete the task.')
      }
      setTasks((current) => current.filter((task) => task.id !== editingTask.id))
      setSheetOpen(false)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to delete the task.')
    } finally {
      setSaving(false)
    }
  }

  const persistBoard = async (nextTasks: FamilyTask[], previousTasks: FamilyTask[]) => {
    const nextColumns = Object.fromEntries(STATUSES.map((status) => [
      status,
      sortTasks(nextTasks.filter((task) => task.status === status)).map((task) => task.id),
    ]))
    try {
      const response = await fetch(apiUrl('/family-tasks/order'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: nextColumns }),
      })
      const payload = await readPayload<{ tasks?: FamilyTask[] }>(response)
      if (!response.ok || !payload.tasks) throw new Error(payload.error ?? 'Unable to save the board order.')
      setTasks(payload.tasks)
      setError(null)
    } catch (nextError) {
      setTasks(previousTasks)
      setError(nextError instanceof Error ? nextError.message : 'Unable to save the board order.')
      void loadTasks()
    }
  }

  const moveTask = (taskId: string, status: FamilyTaskStatus, requestedIndex: number) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    const previousTasks = tasks
    const board = Object.fromEntries(STATUSES.map((columnStatus) => [columnStatus, [...columns[columnStatus]]])) as Record<FamilyTaskStatus, FamilyTask[]>
    const sourceIndex = board[task.status].findIndex((item) => item.id === taskId)
    board[task.status] = board[task.status].filter((item) => item.id !== taskId)
    let targetIndex = requestedIndex
    if (task.status === status && sourceIndex >= 0 && sourceIndex < requestedIndex) targetIndex -= 1
    targetIndex = Math.max(0, Math.min(targetIndex, board[status].length))
    board[status].splice(targetIndex, 0, { ...task, status })
    const nextTasks = STATUSES.flatMap((columnStatus) => board[columnStatus].map((item, position) => ({ ...item, status: columnStatus, position })))
    setTasks(nextTasks)
    void persistBoard(nextTasks, previousTasks)
  }

  const handleDrop = (event: DragEvent, status: FamilyTaskStatus, index: number) => {
    event.preventDefault()
    event.stopPropagation()
    const taskId = draggedId ?? event.dataTransfer.getData('text/plain')
    if (taskId) moveTask(taskId, status, index)
    setDraggedId(null)
    setDropTarget(null)
  }

  return (
    <section className="family-page" aria-label="House and family tasks">
      <PageHeader
        title="House & Family"
        subtitle="Plan household work, keep follow-ups moving, and close the loop together."
        actions={(
          <m.button type="button" className="family-add-btn" whileTap={ACTION_BUTTON_PRESS} onClick={() => openCreate()}>
            <Plus size={17} weight="bold" /> Add task
          </m.button>
        )}
      />

      {error ? (
        <div className="family-notice" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadTasks()}>Retry</button>
        </div>
      ) : null}

      <div className="family-board" aria-busy={loading}>
        {STATUSES.map((status) => (
          <section
            key={status}
            className={`family-column family-column-${status}${dropTarget?.status === status ? ' is-drop-target' : ''}`}
            aria-labelledby={`family-column-${status}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDropTarget({ status, index: columns[status].length })
            }}
            onDrop={(event) => handleDrop(event, status, columns[status].length)}
          >
            <header className="family-column-header">
              <div>
                <div className="family-column-heading">
                  <span className="family-status-dot" aria-hidden />
                  <h3 id={`family-column-${status}`}>{STATUS_META[status].label}</h3>
                  <span className="family-column-count">{columns[status].length}</span>
                </div>
                <p>{STATUS_META[status].description}</p>
              </div>
              <button type="button" className="family-column-add" aria-label={`Add task to ${STATUS_META[status].label}`} onClick={() => openCreate(status)}>
                <Plus size={16} weight="bold" />
              </button>
            </header>

            <div className="family-task-list">
              {loading ? (
                Array.from({ length: 2 }, (_, index) => <div key={index} className="family-task-skeleton" />)
              ) : columns[status].length ? columns[status].map((task, index) => (
                <article
                  key={task.id}
                  className={`family-task-card${draggedId === task.id ? ' is-dragging' : ''}${dropTarget?.status === status && dropTarget.index === index ? ' drop-before' : ''}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', task.id)
                    setDraggedId(task.id)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDropTarget(null)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const bounds = event.currentTarget.getBoundingClientRect()
                    const targetIndex = event.clientY > bounds.top + bounds.height / 2 ? index + 1 : index
                    setDropTarget({ status, index: targetIndex })
                  }}
                  onDrop={(event) => handleDrop(event, status, dropTarget?.status === status ? dropTarget.index : index)}
                >
                  <div className="family-task-card-topline">
                    <span className="family-drag-handle" aria-hidden><DotsSixVertical size={18} weight="bold" /></span>
                    <button type="button" className="family-task-edit" aria-label={`Edit ${task.title}`} onClick={() => openEdit(task)}>
                      <PencilSimple size={15} weight="bold" />
                    </button>
                  </div>
                  <h4>{task.title}</h4>
                  {task.details ? <p>{task.details}</p> : null}
                  <div className="family-task-meta">
                    {task.assignee ? <span><User size={14} /> {task.assignee}</span> : null}
                    {task.dueDate ? <span><CalendarBlank size={14} /> {formatDueDate(task.dueDate)}</span> : null}
                    {status === 'done' ? <span className="family-task-complete"><CheckCircle size={14} weight="fill" /> Complete</span> : null}
                  </div>
                  <div className="family-task-move-actions" aria-label={`Move ${task.title}`}>
                    <button
                      type="button"
                      disabled={status === 'planned'}
                      aria-label={`Move ${task.title} left`}
                      onClick={() => moveTask(task.id, STATUSES[Math.max(0, STATUSES.indexOf(status) - 1)], columns[STATUSES[Math.max(0, STATUSES.indexOf(status) - 1)]].length)}
                    >
                      <ArrowLeft size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      disabled={status === 'done'}
                      aria-label={`Move ${task.title} right`}
                      onClick={() => moveTask(task.id, STATUSES[Math.min(STATUSES.length - 1, STATUSES.indexOf(status) + 1)], columns[STATUSES[Math.min(STATUSES.length - 1, STATUSES.indexOf(status) + 1)]].length)}
                    >
                      <ArrowRight size={14} weight="bold" />
                    </button>
                  </div>
                </article>
              )) : (
                <button type="button" className="family-column-empty" onClick={() => openCreate(status)}>
                  <Plus size={18} />
                  <span>Add the first task</span>
                </button>
              )}
            </div>
          </section>
        ))}
      </div>

      <SideSheet
        isOpen={sheetOpen}
        sheetKey={`family-task-${editingTask?.id ?? 'new'}`}
        ariaLabel="family task panel"
        eyebrow={editingTask ? 'Edit task' : 'New task'}
        title={editingTask ? editingTask.title : 'Add a household task'}
        onClose={() => { if (!saving) setSheetOpen(false) }}
        footer={(
          <>
            {editingTask ? (
              <button type="button" className="family-delete-btn" disabled={saving} onClick={() => void deleteTask()}>
                <Trash size={15} /> Delete
              </button>
            ) : <span />}
            <div className="sheet-footer-actions">
              <button type="button" className="sheet-nav-btn" disabled={saving} onClick={() => setSheetOpen(false)}>Cancel</button>
              <button type="submit" form="family-task-form" className="save-button sheet-save-btn" disabled={saving || !draft.title.trim()}>
                {saving ? 'Saving…' : editingTask ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </>
        )}
      >
        <form id="family-task-form" className="sheet-form family-task-form" onSubmit={(event) => void saveTask(event)}>
          <div className="sheet-fields">
            <label>
              Title <span className="field-required">*</span>
              <Input autoFocus maxLength={160} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Details
              <Textarea rows={5} maxLength={4000} value={draft.details} onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))} />
            </label>
            <label>
              Who is following up?
              <Select value={draft.assignee} onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))}>
                <option value="">Unassigned</option>
                {ASSIGNEES.map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
              </Select>
            </label>
            <label>
              Due date
              <Input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              Column
              <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as FamilyTaskStatus }))}>
                {STATUSES.map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}
              </Select>
            </label>
          </div>
        </form>
      </SideSheet>
    </section>
  )
}
