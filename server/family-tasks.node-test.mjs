import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FAMILY_TASK_ASSIGNEES, FAMILY_TASK_STATUSES, mapFamilyTask, normalizeFamilyTaskInput } from './family-tasks.mjs'

describe('Family task server rules', () => {
  it('keeps the three board columns in product order', () => {
    assert.deepEqual(FAMILY_TASK_STATUSES, ['planned', 'doing', 'done'])
  })

  it('keeps assignment limited to household members', () => {
    assert.deepEqual(FAMILY_TASK_ASSIGNEES, ['Sofie', 'Tobias', 'Ella', 'Sepp', 'Oma&Opa', 'Omi'])
  })

  it('normalizes a complete task', () => {
    const result = normalizeFamilyTaskInput({
      title: '  Call the plumber  ',
      details: 'Kitchen tap',
      assignee: 'Tobias',
      dueDate: '2026-09-03',
      status: 'doing',
    })
    assert.deepEqual(result.value, {
      title: 'Call the plumber',
      details: 'Kitchen tap',
      assignee: 'Tobias',
      dueDate: '2026-09-03',
      status: 'doing',
    })
  })

  it('rejects invalid titles, dates, and statuses', () => {
    assert.ok(normalizeFamilyTaskInput({ title: '', status: 'planned' }).error)
    assert.ok(normalizeFamilyTaskInput({ title: 'Task', dueDate: '2026-02-30', status: 'planned' }).error)
    assert.ok(normalizeFamilyTaskInput({ title: 'Task', status: 'later' }).error)
    assert.match(normalizeFamilyTaskInput({ title: 'Task', status: 'planned', assignee: 'Someone else' }).error, /Assignee/)
  })

  it('maps database dates and numeric positions', () => {
    const mapped = mapFamilyTask({
      id: 'task-1', title: 'Task', details: null, assignee: null, due_date: '2026-09-03',
      status: 'planned', position: '2', created_at: '2026-08-26T10:00:00.000Z', updated_at: '2026-08-26T10:00:00.000Z',
    })
    assert.equal(mapped.dueDate, '2026-09-03')
    assert.equal(mapped.position, 2)
  })
})
