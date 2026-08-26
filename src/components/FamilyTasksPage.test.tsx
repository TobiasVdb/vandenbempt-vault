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
  createdBy: 'Sofie',
  tags: ['Contact'],
  cost: 49.95,
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

  it('shows a loading indicator while tasks are being fetched', async () => {
    let resolveRequest!: (response: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>((resolve) => { resolveRequest = resolve }))
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading tasks')
    resolveRequest(new Response(JSON.stringify({ tasks: [] }), { status: 200 }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('loads tasks into the four household board columns', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ tasks: [plannedTask] }), { status: 200 }))
    renderPage()

    expect(await screen.findByText('Arrange boiler service')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Far future' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Planned' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Doing' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText(/Created .* by Sofie/)).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText(/49[.,]95/)).toBeInTheDocument()
  })

  it('opens the task panel when the card is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ tasks: [plannedTask] }), { status: 200 }))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Open Arrange boiler service'))

    expect(await screen.findByRole('complementary', { name: 'family task panel' })).toBeInTheDocument()
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
      columns: { far_future: [], planned: [], doing: ['task-1'], done: [] },
    })
  })

  it('offers only the configured household assignees', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ tasks: [] }), { status: 200 }))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Add task' }))

    const assigneeSelect = screen.getByLabelText('Who is following up?')
    expect(Array.from((assigneeSelect as HTMLSelectElement).options, (option) => option.text)).toEqual([
      'Unassigned', 'Sofie', 'Tobias', 'Ella', 'Sepp', 'Oma&Opa', 'Omi',
    ])
    expect(screen.getByLabelText('Cost (€)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bol' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Online aankoop' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Contact' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Keuze' })).toHaveAttribute('aria-pressed', 'false')
  })
})
