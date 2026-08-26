import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LazyMotion, domAnimation } from 'framer-motion'
import { vi } from 'vitest'
import { FamilyTasksPage } from './FamilyTasksPage'
import type { FamilyTask } from '../app/types'

const plannedTask: FamilyTask = {
  id: 'task-1',
  title: 'Arrange boiler service',
  details: 'Call the technician',
  assignee: 'Tobias',
  dueDate: '2026-09-03',
  status: 'planned',
  position: 0,
  createdAt: '2026-08-26T10:00:00.000Z',
  updatedAt: '2026-08-26T10:00:00.000Z',
}

function renderPage() {
  return render(
    <LazyMotion features={domAnimation}>
      <FamilyTasksPage />
    </LazyMotion>,
  )
}

describe('FamilyTasksPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads tasks into the three household board columns', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ tasks: [plannedTask] }), { status: 200 }))
    renderPage()

    expect(await screen.findByText('Arrange boiler service')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Planned' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Doing' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
  })

  it('persists an accessible move between columns', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ tasks: [plannedTask] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tasks: [{ ...plannedTask, status: 'doing' }] }), { status: 200 }))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Move Arrange boiler service right' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [, request] = fetchMock.mock.calls[1]
    expect(request).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(String(request?.body))).toEqual({
      columns: { planned: [], doing: ['task-1'], done: [] },
    })
  })
})
