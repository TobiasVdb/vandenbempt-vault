import { randomUUID } from 'node:crypto'

export const FAMILY_TASK_STATUSES = ['far_future', 'planned', 'doing', 'done']
export const FAMILY_TASK_ASSIGNEES = ['Sofie', 'Tobias', 'Ella', 'Sepp', 'Oma&Opa', 'Omi']
const STATUS_SET = new Set(FAMILY_TASK_STATUSES)
const ASSIGNEE_SET = new Set(FAMILY_TASK_ASSIGNEES)
const MAX_TASKS = 1_000

function cleanOptionalText(value, maxLength) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function validDate(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? undefined : value
}

export function normalizeFamilyTaskInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Task details are required.' }
  const value = {}

  if (!partial || Object.hasOwn(input, 'title')) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 160) {
      return { error: 'Title must contain between 1 and 160 characters.' }
    }
    value.title = input.title.trim()
  }

  if (!partial || Object.hasOwn(input, 'details')) {
    const details = cleanOptionalText(input.details, 4_000)
    if (details === undefined) return { error: 'details must be text.' }
    value.details = details
  }

  if (!partial || Object.hasOwn(input, 'assignee')) {
    const assignee = cleanOptionalText(input.assignee, 120)
    if (assignee === undefined || (assignee !== null && !ASSIGNEE_SET.has(assignee))) {
      return { error: `Assignee must be one of: ${FAMILY_TASK_ASSIGNEES.join(', ')}.` }
    }
    value.assignee = assignee
  }

  if (!partial || Object.hasOwn(input, 'createdBy')) {
    const createdBy = input.createdBy ?? 'Tobias'
    if (typeof createdBy !== 'string' || !ASSIGNEE_SET.has(createdBy)) {
      return { error: `Creator must be one of: ${FAMILY_TASK_ASSIGNEES.join(', ')}.` }
    }
    value.createdBy = createdBy
  }

  if (!partial || Object.hasOwn(input, 'dueDate')) {
    const dueDate = validDate(input.dueDate)
    if (dueDate === undefined) return { error: 'Due date must use YYYY-MM-DD.' }
    value.dueDate = dueDate
  }

  if (!partial || Object.hasOwn(input, 'status')) {
    const status = input.status ?? 'planned'
    if (!STATUS_SET.has(status)) return { error: 'Status must be far_future, planned, doing, or done.' }
    value.status = status
  }

  if (partial && Object.keys(value).length === 0) return { error: 'No task changes were provided.' }
  return { value }
}

function isoDate(value) {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

export function mapFamilyTask(row) {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    assignee: row.assignee,
    createdBy: row.created_by ?? 'Tobias',
    dueDate: isoDate(row.due_date),
    status: row.status,
    position: Number(row.position),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }
}

export async function initializeFamilyTasksDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS family_tasks (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
      details TEXT,
      assignee TEXT,
      created_by TEXT NOT NULL DEFAULT 'Tobias',
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('far_future', 'planned', 'doing', 'done')),
      position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'Tobias';
    ALTER TABLE family_tasks DROP CONSTRAINT IF EXISTS family_tasks_status_check;
    ALTER TABLE family_tasks ADD CONSTRAINT family_tasks_status_check CHECK (status IN ('far_future', 'planned', 'doing', 'done'));
    CREATE INDEX IF NOT EXISTS family_tasks_board_idx ON family_tasks (status, position, created_at);
  `)
}

async function withTransaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const selectTasksSql = `
  SELECT id, title, details, assignee, created_by, due_date, status, position, created_at, updated_at
  FROM family_tasks
  ORDER BY CASE status WHEN 'far_future' THEN 0 WHEN 'planned' THEN 1 WHEN 'doing' THEN 2 ELSE 3 END, position, created_at
`

export function createFamilyTasksService({ app, pool, isDbReady }) {
  function available(response) {
    if (pool && isDbReady()) return true
    response.status(503).json({ error: 'Family tasks are not ready.', code: 'database_unavailable' })
    return false
  }

  app.get('/api/family-tasks', async (_request, response) => {
    if (!available(response)) return
    try {
      const result = await pool.query(selectTasksSql)
      response.json({ tasks: result.rows.map(mapFamilyTask) })
    } catch (error) {
      console.error('Failed to load family tasks:', error)
      response.status(500).json({ error: 'Failed to load family tasks.' })
    }
  })

  app.post('/api/family-tasks', async (request, response) => {
    if (!available(response)) return
    const normalized = normalizeFamilyTaskInput(request.body)
    if (normalized.error) {
      response.status(400).json({ error: normalized.error })
      return
    }
    const task = normalized.value
    try {
      const result = await pool.query(
        `INSERT INTO family_tasks (id, title, details, assignee, created_by, due_date, status, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
           COALESCE((SELECT MAX(position) + 1 FROM family_tasks WHERE status = $7), 0))
         RETURNING *`,
        [randomUUID(), task.title, task.details, task.assignee, task.createdBy, task.dueDate, task.status],
      )
      response.status(201).json({ task: mapFamilyTask(result.rows[0]) })
    } catch (error) {
      console.error('Failed to create family task:', error)
      response.status(500).json({ error: 'Failed to create family task.' })
    }
  })

  app.patch('/api/family-tasks/:id', async (request, response) => {
    if (!available(response)) return
    const normalized = normalizeFamilyTaskInput(request.body, { partial: true })
    if (normalized.error) {
      response.status(400).json({ error: normalized.error })
      return
    }
    const task = normalized.value
    const columns = { title: 'title', details: 'details', assignee: 'assignee', createdBy: 'created_by', dueDate: 'due_date', status: 'status' }
    const entries = Object.entries(task)
    const values = [request.params.id]
    const assignments = entries.map(([key, value], index) => {
      values.push(value)
      return `${columns[key]} = $${index + 2}`
    })
    if (Object.hasOwn(task, 'status')) {
      const statusIndex = entries.findIndex(([key]) => key === 'status') + 2
      assignments.push(`completed_at = CASE WHEN $${statusIndex} = 'done' THEN COALESCE(completed_at, NOW()) ELSE NULL END`)
    }
    assignments.push('updated_at = NOW()')
    try {
      const result = await pool.query(
        `UPDATE family_tasks SET ${assignments.join(', ')} WHERE id = $1 RETURNING *`,
        values,
      )
      if (!result.rowCount) {
        response.status(404).json({ error: 'Task not found.' })
        return
      }
      response.json({ task: mapFamilyTask(result.rows[0]) })
    } catch (error) {
      console.error('Failed to update family task:', error)
      response.status(500).json({ error: 'Failed to update family task.' })
    }
  })

  app.put('/api/family-tasks/order', async (request, response) => {
    if (!available(response)) return
    const columns = request.body?.columns
    if (!columns || typeof columns !== 'object') {
      response.status(400).json({ error: 'Board columns are required.' })
      return
    }
    const ordered = []
    for (const status of FAMILY_TASK_STATUSES) {
      const ids = columns[status]
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
        response.status(400).json({ error: `Column ${status} must contain task IDs.` })
        return
      }
      ids.forEach((id, position) => ordered.push({ id, status, position }))
    }
    const ids = ordered.map((item) => item.id)
    if (ids.length > MAX_TASKS || new Set(ids).size !== ids.length) {
      response.status(400).json({ error: 'Board order contains invalid or duplicate tasks.' })
      return
    }
    try {
      const tasks = await withTransaction(pool, async (client) => {
        const current = await client.query('SELECT id FROM family_tasks ORDER BY id FOR UPDATE')
        const currentIds = current.rows.map((row) => row.id)
        if (currentIds.length !== ids.length || currentIds.some((id) => !ids.includes(id))) {
          const error = new Error('The board changed. Refresh and try again.')
          error.status = 409
          throw error
        }
        for (const item of ordered) {
          await client.query(
            `UPDATE family_tasks
             SET status = $2, position = $3,
               completed_at = CASE WHEN $2 = 'done' THEN COALESCE(completed_at, NOW()) ELSE NULL END,
               updated_at = NOW()
             WHERE id = $1`,
            [item.id, item.status, item.position],
          )
        }
        return (await client.query(selectTasksSql)).rows.map(mapFamilyTask)
      })
      response.json({ tasks })
    } catch (error) {
      if (error.status === 409) {
        response.status(409).json({ error: error.message, code: 'stale_board' })
        return
      }
      console.error('Failed to reorder family tasks:', error)
      response.status(500).json({ error: 'Failed to reorder family tasks.' })
    }
  })

  app.delete('/api/family-tasks/:id', async (request, response) => {
    if (!available(response)) return
    try {
      const result = await pool.query('DELETE FROM family_tasks WHERE id = $1', [request.params.id])
      if (!result.rowCount) {
        response.status(404).json({ error: 'Task not found.' })
        return
      }
      response.status(204).end()
    } catch (error) {
      console.error('Failed to delete family task:', error)
      response.status(500).json({ error: 'Failed to delete family task.' })
    }
  })
}
