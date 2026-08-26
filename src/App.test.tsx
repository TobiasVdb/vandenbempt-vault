import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LazyMotion, domAnimation } from 'framer-motion'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from './App'

function renderApp(initialEntry = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LazyMotion features={domAnimation}>
        <App />
      </LazyMotion>
    </MemoryRouter>,
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ items: [], groups: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with a compact sidebar', () => {
    renderApp()

    expect(screen.queryByText(/link with cloud systems/i)).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /integrations/i })).toBeInTheDocument()
  })

  it('uses family-specific browser metadata and restores the app metadata elsewhere', async () => {
    const familyView = renderApp('/family')

    await waitFor(() => expect(document.title).toBe('Sofias To Do'))
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toMatch(/family-checklist\.svg$/)

    familyView.unmount()
    renderApp('/home')

    await waitFor(() => expect(document.title).toBe('House of Tobias'))
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toContain('ico.png?v=2')
  })

  it('cycles light, dark, and auto theme modes', async () => {
    const user = userEvent.setup()
    renderApp()

    const main = screen.getByRole('main')
    expect(main).toHaveClass('light')

    const themeButton = screen.getByRole('button', { name: /toggle theme mode/i })

    await user.click(themeButton)
    expect(main).toHaveClass('dark')

    await user.click(themeButton)
    expect(screen.getByRole('button', { name: /theme mode: auto/i })).toBeInTheDocument()
  })

  it('persists collapsed library section state payloads as plain objects', () => {
    localStorage.setItem('house-of-tobias.library.sections.collapsed', JSON.stringify({
      'projects:ungrouped': true,
      'games:ungrouped': false,
      invalid: 'yes',
    }))

    renderApp()

    expect(JSON.parse(localStorage.getItem('house-of-tobias.library.sections.collapsed') ?? '{}')).toMatchObject({
      'projects:ungrouped': true,
      'games:ungrouped': false,
    })
  })

  it('opens settings sidesheet when an integration is enabled', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: /integrations/i }))
    expect(screen.queryByText(/integration settings/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /enable aws cloud/i }))

    const sidesheet = screen.getByRole('complementary', { name: /integration settings panel/i })
    expect(within(sidesheet).getByText(/integration settings/i)).toBeInTheDocument()
    expect(within(sidesheet).getByRole('heading', { level: 3, name: /aws cloud/i })).toBeInTheDocument()
  })

  it('only enables integration after form save', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: /integrations/i }))
    const toggleButton = screen.getByRole('button', { name: /enable aws cloud/i })
    await user.click(toggleButton)

    // Still disabled while form is open and unsaved.
    expect(screen.getByRole('button', { name: /enable aws cloud/i })).toBeInTheDocument()

    const panel = screen.getByRole('complementary', { name: /integration settings panel/i })
    await user.type(within(panel).getByLabelText(/^name/i), 'AWS Production')
    await user.type(within(panel).getByLabelText(/workspace id/i), 'workspace_prod_001')
    await user.type(within(panel).getByLabelText(/tags/i), 'security-reviewed,critical')
    await user.type(within(panel).getByLabelText(/^region/i), 'eu-west-1')
    await user.type(within(panel).getByLabelText(/secret reference/i), 'vault://kube/prod/aws')
    await user.click(within(panel).getByRole('button', { name: /^next$/i }))
    await user.type(within(panel).getByLabelText(/secret last rotated/i), '2026-01-15')
    await user.type(within(panel).getByLabelText(/secret expires at/i), '2026-12-31')
    await user.type(within(panel).getByLabelText(/account id/i), '123456789012')
    await user.click(within(panel).getByRole('button', { name: /^next$/i }))
    await user.type(within(panel).getByLabelText(/role arn/i), 'arn:aws:iam::123456789012:role/security-role')
    await user.click(within(panel).getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('button', { name: /disable aws cloud/i })).toBeInTheDocument()
  }, 15000)
})
