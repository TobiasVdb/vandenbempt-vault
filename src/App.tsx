import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft'
import { AddressBook } from '@phosphor-icons/react/AddressBook'
import { Archive } from '@phosphor-icons/react/Archive'
import { CaretDown } from '@phosphor-icons/react/CaretDown'
import { CaretUp } from '@phosphor-icons/react/CaretUp'
import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { ClipboardText } from '@phosphor-icons/react/ClipboardText'
import { ClockCounterClockwise } from '@phosphor-icons/react/ClockCounterClockwise'
import { ClockCountdown } from '@phosphor-icons/react/ClockCountdown'
import { DownloadSimple } from '@phosphor-icons/react/DownloadSimple'
import { Eye } from '@phosphor-icons/react/Eye'
import { GearSix } from '@phosphor-icons/react/GearSix'
import { Layout } from '@phosphor-icons/react/Layout'
import { MagicWand } from '@phosphor-icons/react/MagicWand'
import { Moon } from '@phosphor-icons/react/Moon'
import { Pause } from '@phosphor-icons/react/Pause'
import { PencilSimple } from '@phosphor-icons/react/PencilSimple'
import { Play } from '@phosphor-icons/react/Play'
import { Plus } from '@phosphor-icons/react/Plus'
import { PlugCharging } from '@phosphor-icons/react/PlugCharging'
import { Prohibit } from '@phosphor-icons/react/Prohibit'
import { ShieldStar } from '@phosphor-icons/react/ShieldStar'
import { SealCheck } from '@phosphor-icons/react/SealCheck'
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck'
import { Sun } from '@phosphor-icons/react/Sun'
import { Trash } from '@phosphor-icons/react/Trash'
import { Users } from '@phosphor-icons/react/Users'
import { UsersThree } from '@phosphor-icons/react/UsersThree'
import { WarningDiamond } from '@phosphor-icons/react/WarningDiamond'
import { X } from '@phosphor-icons/react/X'
import { AnimatePresence, m } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader, PanelCard, SideSheet } from './app/chrome'
import {
  ACTION_BUTTON_PRESS,
  API_ORIGIN,
  APP_NAME,
  APPROVALS_STORAGE_KEY,
  AUDIT_STORAGE_KEY,
  CONTENT_START_DELAY,
  CUSTOM_INTEGRATIONS_STORAGE_KEY,
  ENABLED_INTEGRATIONS_STORAGE_KEY,
  EASE_SOFT,
  GLB_PREVIEW_QUERY_PARAM,
  HEALTH_STORAGE_KEY,
  INTEGRATION_SETTINGS_STORAGE_KEY,
  LIFECYCLE_STORAGE_KEY,
  MENU_ANIMATION_DURATION,
  PLAYGROUND_ANIMATION_AVAILABILITY_EVENT,
  PLAYGROUND_ANIMATION_EVENT,
  PLAYGROUND_THEME_EVENT,
  POLICY_ENGINE_STORAGE_KEY,
  REPORT_PREFS_STORAGE_KEY,
  THEME_MODE_ORDER,
  THEME_STORAGE_KEY,
  apiUrl,
  bottomNavigationItems,
  defaultPolicyEngine,
  defaultReportPreferences,
  defaultUserDraft,
  getAutoThemeForTime,
  getPageFromPath,
  getPathFromPage,
  integrationTemplates,
  linksSectionLinks,
  mainNavigationItems,
} from './app/constants'
import { Input } from './components/ui/Input'
import { Select } from './components/ui/Select'
import { Textarea } from './components/ui/Textarea'
import type {
  AuditEntry,
  ConnectivityHealth,
  GlbModelRecord,
  GlobalPolicyEngine,
  Integration,
  IntegrationDetailTab,
  IntegrationField,
  IntegrationLifecycleState,
  IntegrationRuntimeInfo,
  IntegrationSettingsMap,
  IntegrationTileFeedback,
  IntegrationType,
  Page,
  ReportPreferences,
  TeamName,
  ThemeMode,
  ToastState,
  UploadCookieState,
  UserDirectorySortKey,
  UserDraft,
  UserRecord,
  UserRole,
  WorkspaceUserListResponse,
  WorkspaceUserResponse,
} from './app/types'

const integrationRuntimeInfo: Record<IntegrationType, IntegrationRuntimeInfo> = {
  kubernetes: {
    connectivity: 'passing',
    lastConnectivityTest: 'API heartbeat and namespace listing passed 2 minutes ago.',
    currentData: ['Cluster inventory', 'Workload metadata', 'Namespace policy status'],
    townPageUrl: 'https://frost-design.be/kubetown/',
  },
  gcp: {
    connectivity: 'degraded',
    lastConnectivityTest: 'Project read succeeded, billing API timed out on last probe.',
    currentData: ['Project IAM roles', 'Service account posture', 'Cloud asset summaries'],
    townPageUrl: 'https://frost-design.be/kubetown/api/',
  },
  azure: {
    connectivity: 'passing',
    lastConnectivityTest: 'Tenant auth and subscription read checks passed 5 minutes ago.',
    currentData: ['Subscription inventory', 'Role assignment drift', 'Defender signal rollups'],
    townPageUrl: 'https://frost-design.be/kubetown/perf/',
  },
  aikido: {
    connectivity: 'passing',
    lastConnectivityTest: 'Workspace token validation and feature sync completed successfully.',
    currentData: ['Open findings feed', 'CI gate statuses', 'Repo risk trend snapshots'],
    townPageUrl: 'https://frost-design.be/kubetown/landing/',
  },
  aws: {
    connectivity: 'degraded',
    lastConnectivityTest: 'STS role assumption passed, Config API quota warning detected.',
    currentData: ['Account resource graph', 'GuardDuty alerts', 'IAM policy change deltas'],
    townPageUrl: 'https://frost-design.be/kubetown/2/',
  },
}

const commonIntegrationFields: IntegrationField[] = [
  { key: 'name', label: 'Name', input: 'text', required: true, placeholder: 'Production Integration' },
  { key: 'workspaceId', label: 'Workspace ID', input: 'text', required: true, placeholder: 'workspace_prod_001' },
  {
    key: 'environment',
    label: 'Environment',
    input: 'select',
    options: [
      { value: 'staging', label: 'Staging' },
      { value: 'prod', label: 'Production' },
      { value: 'dev', label: 'Development' },
      { value: 'test', label: 'Test' },
    ],
  },
  { key: 'tags', label: 'Tags (comma separated)', input: 'text', placeholder: 'security-reviewed,critical' },
  { key: 'scopeType', label: 'Scope Type', input: 'text', placeholder: 'cluster / project / subscription / workspace' },
  { key: 'scopeId', label: 'Scope ID', input: 'text', placeholder: 'provider-scope-id' },
  { key: 'region', label: 'Region', input: 'text', placeholder: 'eu-west-1' },
  { key: 'secretRef', label: 'Secret Reference', input: 'text', required: true, placeholder: 'vault://kube/prod/aws' },
  { key: 'secretLastRotatedAt', label: 'Secret Last Rotated (YYYY-MM-DD)', input: 'text', required: true, placeholder: '2026-01-15' },
  { key: 'secretExpiresAt', label: 'Secret Expires At (YYYY-MM-DD)', input: 'text', required: true, placeholder: '2026-12-31' },
  {
    key: 'collectionMode',
    label: 'Collection Mode',
    input: 'select',
    options: [
      { value: 'minimal', label: 'Minimal' },
      { value: 'full', label: 'Full' },
    ],
  },
  { key: 'retentionDays', label: 'Retention Window (days)', input: 'text', placeholder: '30' },
  { key: 'syncFrequencyMinutes', label: 'Sync Frequency (minutes)', input: 'text', placeholder: '15' },
  {
    key: 'containsSensitiveData',
    label: 'Contains Sensitive Data',
    input: 'select',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes (PII/Sensitive)' },
    ],
  },
]

const providerIntegrationFields: Record<IntegrationType, IntegrationField[]> = {
  kubernetes: [
    {
      key: 'authMethod',
      label: 'Auth Method',
      input: 'select',
      required: true,
      options: [
        { value: 'kubeconfig', label: 'Kubeconfig' },
        { value: 'service_account_token', label: 'Service Account Token' },
        { value: 'client_certificate', label: 'Client Certificate' },
      ],
    },
    { key: 'clusterName', label: 'Cluster Name', input: 'text', required: true, placeholder: 'prod-cluster-eu1' },
    { key: 'apiServerUrl', label: 'API Server URL', input: 'text', required: true, placeholder: 'https://x.x.x.x:6443' },
    { key: 'namespace', label: 'Namespace', input: 'text', placeholder: 'default' },
    { key: 'contextName', label: 'Context Name', input: 'text', placeholder: 'prod-eu1' },
    { key: 'caCert', label: 'CA Certificate', input: 'textarea', placeholder: '-----BEGIN CERTIFICATE-----' },
    { key: 'bearerToken', label: 'Bearer Token', input: 'password', placeholder: 'k8s token' },
    { key: 'kubeconfig', label: 'Kubeconfig', input: 'textarea', placeholder: 'apiVersion: v1' },
  ],
  gcp: [
    {
      key: 'authMethod',
      label: 'Auth Method',
      input: 'select',
      required: true,
      options: [
        { value: 'service_account_key', label: 'Service Account Key' },
        { value: 'workload_identity_federation', label: 'Workload Identity Federation' },
      ],
    },
    { key: 'projectId', label: 'Project ID', input: 'text', required: true, placeholder: 'my-prod-project' },
    { key: 'organizationId', label: 'Organization ID', input: 'text', placeholder: '123456789012' },
    {
      key: 'serviceAccountEmail',
      label: 'Service Account Email',
      input: 'text',
      required: true,
      placeholder: 'scanner@project.iam.gserviceaccount.com',
    },
    { key: 'serviceAccountKeyJson', label: 'Service Account Key JSON', input: 'textarea', placeholder: '{ ... }' },
    { key: 'workloadIdentityPoolId', label: 'Workload Identity Pool ID', input: 'text', placeholder: 'pool-id' },
    { key: 'workloadIdentityProviderId', label: 'WIF Provider ID', input: 'text', placeholder: 'provider-id' },
    { key: 'audience', label: 'Audience', input: 'text', placeholder: '//iam.googleapis.com/projects/...' },
  ],
  azure: [
    {
      key: 'authMethod',
      label: 'Auth Method',
      input: 'select',
      required: true,
      options: [
        { value: 'client_secret', label: 'Client Secret' },
        { value: 'client_certificate', label: 'Client Certificate' },
      ],
    },
    { key: 'tenantId', label: 'Tenant ID', input: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientId', label: 'Client ID', input: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientSecret', label: 'Client Secret', input: 'password', required: true, placeholder: 'secret' },
    { key: 'subscriptionId', label: 'Subscription ID', input: 'text', required: true, placeholder: 'subscription-guid' },
    { key: 'managementGroupId', label: 'Management Group ID', input: 'text', placeholder: 'mgmt-group-id' },
  ],
  aikido: [
    {
      key: 'authMethod',
      label: 'Auth Method',
      input: 'select',
      required: true,
      options: [{ value: 'api_token', label: 'API Token' }],
    },
    { key: 'apiBaseUrl', label: 'API Base URL', input: 'text', required: true, placeholder: 'https://app.aikido.dev' },
    { key: 'apiToken', label: 'API Token', input: 'password', required: true, placeholder: 'aik_***' },
    { key: 'workspaceSlug', label: 'Workspace Slug', input: 'text', required: true, placeholder: 'my-company' },
    { key: 'features', label: 'Features', input: 'text', placeholder: 'cloud_scanning, ci_gating' },
  ],
  aws: [
    {
      key: 'authMethod',
      label: 'Auth Method',
      input: 'select',
      required: true,
      options: [
        { value: 'iam_role', label: 'IAM Role' },
        { value: 'access_key', label: 'Access Key' },
      ],
    },
    { key: 'accountId', label: 'Account ID', input: 'text', required: true, placeholder: '123456789012' },
    { key: 'roleArn', label: 'Role ARN', input: 'text', required: true, placeholder: 'arn:aws:iam::123456789012:role/security-role' },
    { key: 'externalId', label: 'External ID', input: 'text', placeholder: 'external-id' },
  ],
}

function getFieldDefault(field: IntegrationField): string {
  if (field.input === 'select' && field.options?.length) return field.options[0].value
  return ''
}

function buildFieldSchema(fields: IntegrationField[]) {
  const shape = Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.required ? z.string().trim().min(1, `${field.label} is required`) : z.string(),
    ]),
  )

  return z.object(shape)
}

function readSavedSettings(): IntegrationSettingsMap {
  try {
    const raw = localStorage.getItem(INTEGRATION_SETTINGS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? (parsed as IntegrationSettingsMap) : {}
  } catch {
    return {}
  }
}

function readEnabledIntegrations(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ENABLED_INTEGRATIONS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function readCustomIntegrations(): Integration[] {
  try {
    const raw = localStorage.getItem(CUSTOM_INTEGRATIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is Integration => {
      return typeof item === 'object' && item !== null &&
        typeof item.id === 'string' &&
        typeof item.type === 'string' &&
        typeof item.title === 'string' &&
        typeof item.description === 'string' &&
        typeof item.logo === 'string'
    })
  } catch {
    return []
  }
}

function readPolicyEngine(): GlobalPolicyEngine {
  try {
    const raw = localStorage.getItem(POLICY_ENGINE_STORAGE_KEY)
    if (!raw) return defaultPolicyEngine
    const parsed = JSON.parse(raw)
    return { ...defaultPolicyEngine, ...parsed } as GlobalPolicyEngine
  } catch {
    return defaultPolicyEngine
  }
}

function readLifecycleState(): Record<string, IntegrationLifecycleState> {
  try {
    const raw = localStorage.getItem(LIFECYCLE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed) return {}

    const allowedStates: IntegrationLifecycleState[] = [
      'draft',
      'pending_approval',
      'active',
      'degraded',
      'disabled',
      'rotated',
      'archived',
    ]
    const normalized = Object.fromEntries(
      Object.entries(parsed as Record<string, string>).map(([integrationId, state]) => [
        integrationId,
        allowedStates.includes(state as IntegrationLifecycleState) ? state : 'draft',
      ]),
    )

    return normalized as Record<string, IntegrationLifecycleState>
  } catch {
    return {}
  }
}

function readApprovals(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(APPROVALS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function readHealth(): Record<string, ConnectivityHealth> {
  try {
    const raw = localStorage.getItem(HEALTH_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, ConnectivityHealth>) : {}
  } catch {
    return {}
  }
}

function readAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : []
  } catch {
    return []
  }
}

function readReportPreferences(): ReportPreferences {
  try {
    const raw = localStorage.getItem(REPORT_PREFS_STORAGE_KEY)
    if (!raw) return defaultReportPreferences
    const parsed = JSON.parse(raw)
    return { ...defaultReportPreferences, ...parsed } as ReportPreferences
  } catch {
    return defaultReportPreferences
  }
}

export default function App() {
  const assetBase = import.meta.env.BASE_URL
  const navigate = useNavigate()
  const location = useLocation()
  const pitchDeckUrl = `${assetBase}PitchDeck2.pdf`
  const collapsedWidth = 62
  const sidesheetRef = useRef<HTMLElement | null>(null)
  const userSheetRef = useRef<HTMLElement | null>(null)
  const glbInputRef = useRef<HTMLInputElement | null>(null)
  const glbPreviewFrameRef = useRef<HTMLIFrameElement | null>(null)

  const isExpanded = false
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'auto' ? stored : 'light'
  })
  const [autoTheme, setAutoTheme] = useState<Exclude<ThemeMode, 'auto'>>(() => getAutoThemeForTime(new Date()))
  const [activePage, setActivePage] = useState<Page>(() => getPageFromPath(window.location.pathname).page)
  const [customIntegrations, setCustomIntegrations] = useState<Integration[]>(() => readCustomIntegrations())
  const [enabledIntegrations, setEnabledIntegrations] = useState<Record<string, boolean>>(() => readEnabledIntegrations())
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [detailsIntegration, setDetailsIntegration] = useState<Integration | null>(null)
  const [integrationPage, setIntegrationPage] = useState<Integration | null>(null)
  const [integrationDetailTab, setIntegrationDetailTab] = useState<IntegrationDetailTab>('details')
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettingsMap>(() => readSavedSettings())
  const [policyEngine, setPolicyEngine] = useState<GlobalPolicyEngine>(() => readPolicyEngine())
  const [lifecycleState, setLifecycleState] = useState<Record<string, IntegrationLifecycleState>>(() => readLifecycleState())
  const [approvalState, setApprovalState] = useState<Record<string, boolean>>(() => readApprovals())
  const [connectivityHealth, setConnectivityHealth] = useState<Record<string, ConnectivityHealth>>(() => readHealth())
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => readAuditLog())
  const [reportPreferences, setReportPreferences] = useState<ReportPreferences>(() => readReportPreferences())
  const [integrationStateLoaded, setIntegrationStateLoaded] = useState(false)
  const [glbModels, setGlbModels] = useState<GlbModelRecord[]>([])
  const [isGlbLoading, setIsGlbLoading] = useState(false)
  const [glbGalleryLoadToken, setGlbGalleryLoadToken] = useState(0)
  const [glbError, setGlbError] = useState<string | null>(null)
  const [isUploadingGlb, setIsUploadingGlb] = useState(false)
  const [isGlbDropActive, setIsGlbDropActive] = useState(false)
  const [previewModel, setPreviewModel] = useState<GlbModelRecord | null>(null)
  const [previewHasAnimation, setPreviewHasAnimation] = useState(false)
  const [isPreviewAnimationPaused, setIsPreviewAnimationPaused] = useState(false)
  const [uploadCookie, setUploadCookie] = useState<UploadCookieState | null>(null)
  const [settingsSheetPage, setSettingsSheetPage] = useState(1)
  const [detailSheetPage, setDetailSheetPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [integrationTileFeedback, setIntegrationTileFeedback] = useState<IntegrationTileFeedback>(null)
  const [workspaceUsers, setWorkspaceUsers] = useState<UserRecord[]>([])
  const [userDraft, setUserDraft] = useState<UserDraft>(defaultUserDraft)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false)
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [isUserSaving, setIsUserSaving] = useState(false)
  const [isUserDeletingId, setIsUserDeletingId] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [userSortKey, setUserSortKey] = useState<UserDirectorySortKey>('name')
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isHomeSummarySheetOpen, setIsHomeSummarySheetOpen] = useState(false)
  const [isCreatingIntegration, setIsCreatingIntegration] = useState(false)
  const [createIntegrationType, setCreateIntegrationType] = useState<IntegrationType | null>(null)

  const integrationCatalog = useMemo(() => [...integrationTemplates, ...customIntegrations], [customIntegrations])
  const createIntegrationTemplate = useMemo(
    () => (createIntegrationType ? integrationTemplates.find((integration) => integration.type === createIntegrationType) ?? null : null),
    [createIntegrationType],
  )
  const activeSheetIntegration = selectedIntegration ?? createIntegrationTemplate

  const settingsFields = useMemo(
    () =>
      activeSheetIntegration
        ? [...commonIntegrationFields, ...providerIntegrationFields[activeSheetIntegration.type]]
        : [],
    [activeSheetIntegration],
  )

  const settingsSchema = useMemo(() => buildFieldSchema(settingsFields), [settingsFields])
  const settingsPageSize = 8
  const settingsFormPageCount = Math.max(1, Math.ceil(settingsFields.length / settingsPageSize))
  const settingsSheetPageCount = isCreatingIntegration ? 1 + settingsFormPageCount : settingsFormPageCount
  const visibleSettingsFields = useMemo(
    () => {
      const pageOffset = isCreatingIntegration ? Math.max(0, settingsSheetPage - 2) : settingsSheetPage - 1
      return settingsFields.slice(pageOffset * settingsPageSize, (pageOffset + 1) * settingsPageSize)
    },
    [isCreatingIntegration, settingsFields, settingsSheetPage],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Record<string, string>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {},
  })

  const toggleTheme = () => {
    setThemeMode((current) => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'auto'
      return 'light'
    })
  }

  const effectiveTheme = themeMode === 'auto' ? autoTheme : themeMode
  const themeToggleIndex = THEME_MODE_ORDER.indexOf(themeMode)
  const goToPage = useCallback(
    (page: Page, integrationId?: string) => {
      const targetPath = getPathFromPage(page, integrationId)
      navigate(targetPath)
    },
    [navigate],
  )

  const setPlaygroundPreviewInUrl = useCallback(
    (modelId: string | null, replace = false) => {
      const params = new URLSearchParams(location.search)

      if (modelId) {
        params.set(GLB_PREVIEW_QUERY_PARAM, modelId)
      } else {
        params.delete(GLB_PREVIEW_QUERY_PARAM)
      }

      const search = params.toString()
      navigate(
        {
          pathname: getPathFromPage('Playground'),
          search: search ? `?${search}` : '',
        },
        { replace },
      )
    },
    [location.search, navigate],
  )

  const appendAudit = useCallback(
    (entry: Omit<AuditEntry, 'id' | 'at'>) => {
      setAuditLog((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          ...entry,
        },
        ...current,
      ])
    },
    [setAuditLog],
  )

  const toggleIntegration = (integration: Integration) => {
    const isEnabled = enabledIntegrations[integration.id] ?? false
    const lifecycle = lifecycleState[integration.id] ?? 'draft'

    if (lifecycle === 'archived') {
      setToast({ kind: 'error', message: `${integration.title} is archived. Set it to Active before enabling.` })
      return
    }

    if (isEnabled) {
      setIntegrationTileFeedback({
        integrationId: integration.id,
        mode: 'disabled',
        token: Date.now(),
      })
      setEnabledIntegrations((current) => ({
        ...current,
        [integration.id]: false,
      }))
      setLifecycleState((current) => ({ ...current, [integration.id]: 'disabled' }))
      appendAudit({
        actor: 'admin',
        action: 'integration.disabled',
        integrationId: integration.id,
        before: 'active',
        after: 'disabled',
      })

      if (selectedIntegration?.id === integration.id) {
        setSelectedIntegration(null)
      }
      return
    }

    // Opening the form does not enable the integration.
    setSelectedIntegration(integration)
    setLifecycleState((current) => ({ ...current, [integration.id]: current[integration.id] ?? 'draft' }))
  }

  const openCreateIntegration = () => {
    setSelectedIntegration(null)
    setCreateIntegrationType(null)
    setIsCreatingIntegration(true)
    setSettingsSheetPage(1)
  }

  const setLifecycleManually = (integrationId: string, nextState: IntegrationLifecycleState) => {
    const integration = integrationCatalog.find((item) => item.id === integrationId)
    if (!integration) return

    const previousState = lifecycleState[integrationId] ?? 'draft'
    setLifecycleState((current) => ({ ...current, [integrationId]: nextState }))

    if (nextState === 'active') {
      setEnabledIntegrations((current) => ({ ...current, [integrationId]: true }))
    } else if (nextState === 'disabled' || nextState === 'archived') {
      setEnabledIntegrations((current) => ({ ...current, [integrationId]: false }))
      if (selectedIntegration?.id === integrationId) {
        setSelectedIntegration(null)
      }
    }

    appendAudit({
      actor: 'admin',
      action: 'integration.lifecycle.updated',
      integrationId,
      before: previousState,
      after: nextState,
    })
    setToast({ kind: 'success', message: `${integration.title} lifecycle set to ${nextState}.` })
  }

  const closeSidesheet = useCallback(() => {
    if (isSaving) return
    setSelectedIntegration(null)
    setIsCreatingIntegration(false)
    setCreateIntegrationType(null)
  }, [isSaving])

  const onSaveSettings = handleSubmit(async (values) => {
    if (!activeSheetIntegration) return

    setIsSaving(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))

      const createName = values.name.trim()
      const createSlug = createName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const baseIntegrationId =
        isCreatingIntegration && createIntegrationTemplate
          ? `${createIntegrationTemplate.type}-${createSlug || Date.now().toString(36)}`
          : activeSheetIntegration.id
      let integrationId = baseIntegrationId

      if (isCreatingIntegration && createIntegrationTemplate) {
        let duplicateIndex = 1
        while (integrationCatalog.some((integration) => integration.id === integrationId)) {
          duplicateIndex += 1
          integrationId = `${baseIntegrationId}-${duplicateIndex}`
        }
      }

      const tags = values.tags
        ? values.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : []

      if (policyEngine.mandatoryTagsEnabled && !tags.includes(policyEngine.mandatoryTag)) {
        setLifecycleState((current) => ({ ...current, [integrationId]: 'degraded' }))
        setToast({ kind: 'error', message: `Missing mandatory tag: ${policyEngine.mandatoryTag}` })
        appendAudit({
          actor: 'policy-engine',
          action: 'integration.blocked.mandatory_tag',
          integrationId,
          after: policyEngine.mandatoryTag,
        })
        return
      }

      if (
        values.environment &&
        !policyEngine.allowedEnvironments.includes(values.environment as 'prod' | 'staging' | 'dev' | 'test')
      ) {
        setLifecycleState((current) => ({ ...current, [integrationId]: 'degraded' }))
        setToast({ kind: 'error', message: `Environment ${values.environment} is not allowed by policy.` })
        appendAudit({
          actor: 'policy-engine',
          action: 'integration.blocked.environment',
          integrationId,
          after: values.environment,
        })
        return
      }

      if (values.region && !policyEngine.allowedRegions.includes(values.region)) {
        setLifecycleState((current) => ({ ...current, [integrationId]: 'degraded' }))
        setToast({ kind: 'error', message: `Region ${values.region} is not allowed by policy.` })
        appendAudit({
          actor: 'policy-engine',
          action: 'integration.blocked.region',
          integrationId,
          after: values.region,
        })
        return
      }

      if (values.authMethod && !policyEngine.allowedAuthMethods[activeSheetIntegration.type].includes(values.authMethod)) {
        setLifecycleState((current) => ({ ...current, [integrationId]: 'degraded' }))
        setToast({ kind: 'error', message: `Auth method ${values.authMethod} is restricted for this provider.` })
        appendAudit({
          actor: 'policy-engine',
          action: 'integration.blocked.auth_method',
          integrationId,
          after: values.authMethod,
        })
        return
      }

      const secretRef = values.secretRef?.trim()
      const secretExpiresAt = values.secretExpiresAt
      const secretLastRotatedAt = values.secretLastRotatedAt
      const today = new Date()
      const expiryDate = secretExpiresAt ? new Date(secretExpiresAt) : null
      const rotatedDate = secretLastRotatedAt ? new Date(secretLastRotatedAt) : null
      const isRotationStale =
        rotatedDate ? (today.getTime() - rotatedDate.getTime()) / (1000 * 60 * 60 * 24) > 90 : true
      const isExpired = expiryDate ? expiryDate.getTime() < today.getTime() : true

      if (!secretRef || isExpired || isRotationStale) {
        setLifecycleState((current) => ({ ...current, [integrationId]: 'degraded' }))
        setToast({ kind: 'error', message: 'Credential governance failed. Provide valid secret ref and rotation metadata.' })
        appendAudit({
          actor: 'credential-governance',
          action: 'integration.blocked.credentials',
          integrationId,
        })
        return
      }

      let integrationRecord = activeSheetIntegration

      if (isCreatingIntegration && createIntegrationTemplate) {
        integrationRecord = {
          ...createIntegrationTemplate,
          id: integrationId,
          title: createName || createIntegrationTemplate.title,
          description: `${createIntegrationTemplate.title} integration`,
        }
        setCustomIntegrations((current) => [...current, integrationRecord])
      }

      setIntegrationSettings((current) => ({
        ...current,
        [integrationId]: values,
      }))

      if (values.environment === 'prod' && !approvalState[integrationId]) {
        setLifecycleState((current) => ({ ...current, [integrationId]: 'pending_approval' }))
        setEnabledIntegrations((current) => ({ ...current, [integrationId]: false }))
        setToast({ kind: 'success', message: `${integrationRecord.title} saved and awaiting production approval.` })
        appendAudit({
          actor: 'lifecycle-engine',
          action: 'integration.pending_approval',
          integrationId,
          after: 'pending_approval',
        })
        closeSidesheet()
        return
      }

      setIntegrationTileFeedback({
        integrationId,
        mode: 'enabled',
        token: Date.now(),
      })
      setEnabledIntegrations((current) => ({ ...current, [integrationId]: true }))
      setLifecycleState((current) => ({ ...current, [integrationId]: 'active' }))
      setConnectivityHealth((current) => ({
        ...current,
        [integrationId]: {
          connectivity: integrationRuntimeInfo[integrationRecord.type].connectivity,
          lastSyncAt: new Date().toISOString(),
          latencyMs: 120 + Math.round(Math.random() * 140),
          quotaIssue: integrationRuntimeInfo[integrationRecord.type].connectivity === 'degraded',
          authFailure: false,
        },
      }))
      setToast({ kind: 'success', message: `${integrationRecord.title} settings saved and integration enabled.` })
      appendAudit({
        actor: 'admin',
        action: 'integration.enabled',
        integrationId,
        before: lifecycleState[integrationId] ?? 'draft',
        after: 'active',
      })
      closeSidesheet()
    } catch {
      setToast({ kind: 'error', message: 'Could not save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  })

  const approveIntegration = (integrationId: string) => {
    const integration = integrationCatalog.find((item) => item.id === integrationId)
    if (!integration) return

    setIntegrationTileFeedback({
      integrationId,
      mode: 'enabled',
      token: Date.now(),
    })
    setApprovalState((current) => ({ ...current, [integrationId]: true }))
    setLifecycleState((current) => ({ ...current, [integrationId]: 'active' }))
    setEnabledIntegrations((current) => ({ ...current, [integrationId]: true }))
    appendAudit({
      actor: 'approver',
      action: 'integration.approved',
      integrationId,
      before: 'pending_approval',
      after: 'active',
    })
    setToast({ kind: 'success', message: `${integration.title} approved and activated.` })
  }

  const testIntegrationConnection = (integration: Integration) => {
    const isEnabled = enabledIntegrations[integration.id] ?? false
    if (!isEnabled) {
      setToast({ kind: 'error', message: `${integration.title} must be enabled before testing connectivity.` })
      return
    }

    const now = new Date().toISOString()
    const roll = Math.random()
    const connectivity: ConnectivityHealth['connectivity'] = roll < 0.74 ? 'passing' : roll < 0.92 ? 'degraded' : 'failing'

    setConnectivityHealth((current) => ({
      ...current,
      [integration.id]: {
        connectivity,
        lastSyncAt: now,
        latencyMs: 90 + Math.round(Math.random() * 260),
        quotaIssue: connectivity === 'degraded',
        authFailure: connectivity === 'failing',
      },
    }))
    appendAudit({
      actor: 'admin',
      action: 'connectivity.single_retest',
      integrationId: integration.id,
      after: connectivity,
    })
    setToast({
      kind: connectivity === 'failing' ? 'error' : 'success',
      message: `${integration.title} connectivity test ${connectivity === 'passing' ? 'passed' : connectivity}.`,
    })
  }

  const openImportedAssetsView = (integration: Integration) => {
    setIntegrationPage(integration)
    setIntegrationDetailTab('activity')
    setDetailsIntegration(null)
    goToPage('IntegrationDetail', integration.id)
  }

  const loadWorkspaceUsers = useCallback(async () => {
    setIsUsersLoading(true)

    try {
      const response = await fetch(apiUrl('/users'), { cache: 'no-store' })
      const payload = await readJsonResponse<WorkspaceUserListResponse>(response, 'Failed to load workspace users.')

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load workspace users.')
      }

      setWorkspaceUsers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      setWorkspaceUsers([])
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to load workspace users.' })
    } finally {
      setIsUsersLoading(false)
    }
  }, [])

  const resetUserEditor = useCallback(() => {
    setUserDraft(defaultUserDraft)
    setEditingUserId(null)
  }, [])

  const closeUserSheet = useCallback(() => {
    setIsUserSheetOpen(false)
    resetUserEditor()
  }, [resetUserEditor])

  const openCreateUserSheet = useCallback(() => {
    resetUserEditor()
    setIsUserSheetOpen(true)
  }, [resetUserEditor])

  const beginEditUser = useCallback((user: UserRecord) => {
    setEditingUserId(user.id)
    setUserDraft({
      name: user.name,
      email: user.email,
      team: user.team,
      role: user.role,
      sso: user.sso,
      canApproveProduction: user.canApproveProduction,
    })
    setIsUserSheetOpen(true)
  }, [])

  const saveUserRecord = useCallback(async () => {
    const name = userDraft.name.trim()
    const email = userDraft.email.trim().toLowerCase()
    if (!name || !email) {
      setToast({ kind: 'error', message: 'User name and email are required.' })
      return
    }

    setIsUserSaving(true)

    try {
      const response = await fetch(apiUrl(editingUserId ? `/users/${editingUserId}` : '/users'), {
        method: editingUserId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          team: userDraft.team,
          role: userDraft.role,
          sso: userDraft.sso,
          canApproveProduction: userDraft.canApproveProduction,
        }),
      })
      const payload = await readJsonResponse<WorkspaceUserResponse>(response, 'Failed to save workspace user.')

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? 'Failed to save workspace user.')
      }

      setWorkspaceUsers((current) =>
        editingUserId ? current.map((user) => (user.id === editingUserId ? payload.user! : user)) : [payload.user!, ...current],
      )
      setToast({
        kind: 'success',
        message: editingUserId ? `${name} updated.` : `${name} created.`,
      })
      closeUserSheet()
    } catch (error) {
      setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to save workspace user.' })
    } finally {
      setIsUserSaving(false)
    }
  }, [closeUserSheet, editingUserId, userDraft])

  const deleteUserRecord = useCallback(
    async (userId: string) => {
      setIsUserDeletingId(userId)

      try {
        const response = await fetch(apiUrl(`/users/${userId}`), { method: 'DELETE' })
        const payload = await readJsonResponse<{ error?: string }>(response, 'Failed to delete workspace user.')

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to delete workspace user.')
        }

        setWorkspaceUsers((current) => current.filter((user) => user.id !== userId))
        if (editingUserId === userId) closeUserSheet()
        setToast({ kind: 'success', message: 'User removed.' })
      } catch (error) {
        setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to delete workspace user.' })
      } finally {
        setIsUserDeletingId(null)
      }
    },
    [closeUserSheet, editingUserId],
  )

  const sortDirectoryBy = useCallback((key: UserDirectorySortKey) => {
    setUserSortKey((currentKey) => {
      if (currentKey === key) {
        setUserSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
        return currentKey
      }

      setUserSortDirection('asc')
      return key
    })
  }, [])

  const exportAuditCsv = () => {
    const header = 'timestamp,actor,action,integrationId,before,after'
    const rows = auditLog.map((entry) =>
      [entry.at, entry.actor, entry.action, entry.integrationId ?? '', entry.before ?? '', entry.after ?? '']
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'house-of-tobias-audit-log.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const readJsonResponse = async <T,>(response: Response, fallbackMessage: string): Promise<T> => {
    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.includes('application/json')) {
      const body = await response.text()
      const looksLikeHtml = /^\s*</.test(body)
      throw new Error(looksLikeHtml ? 'API returned HTML instead of JSON. Check that the backend server is running.' : fallbackMessage)
    }

    return (await response.json()) as T
  }

  const loadGlbModels = useCallback(async () => {
    setIsGlbLoading(true)
    setGlbError(null)

    try {
      const response = await fetch(apiUrl('/glb'), { cache: 'no-store' })
      const payload = await readJsonResponse<{
        error?: string
        models?: GlbModelRecord[]
      }>(response, 'Failed to load GLB models.')

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load GLB models.')
      }

      setGlbModels(Array.isArray(payload.models) ? payload.models : [])
      setGlbGalleryLoadToken((current) => current + 1)
    } catch (error) {
      setGlbModels([])
      setGlbError(error instanceof Error ? error.message : 'Failed to load GLB models.')
    } finally {
      setIsGlbLoading(false)
    }
  }, [])

  const uploadGlbFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        setToast({ kind: 'error', message: 'Only .glb files are allowed.' })
        return
      }

      setIsUploadingGlb(true)
      setGlbError(null)
      setUploadCookie({ fileName: file.name, progress: 0 })

      try {
        await new Promise<void>((resolve, reject) => {
          const formData = new FormData()
          formData.append('file', file)

          const request = new XMLHttpRequest()
          request.open('POST', apiUrl('/glb'))
          request.responseType = 'json'

          request.upload.onprogress = (event) => {
            if (!event.lengthComputable) return
            const progress = Math.min(100, Math.round((event.loaded / event.total) * 100))
            setUploadCookie({ fileName: file.name, progress })
          }

          request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
              setUploadCookie({ fileName: file.name, progress: 100 })
              resolve()
              return
            }

            const responsePayload = request.response as { error?: string } | null
            reject(new Error(responsePayload?.error ?? 'Upload failed.'))
          }

          request.onerror = () => reject(new Error('Upload failed.'))
          request.onabort = () => reject(new Error('Upload aborted.'))
          request.send(formData)
        })

        setToast({ kind: 'success', message: `${file.name} uploaded.` })
        await loadGlbModels()
      } catch (error) {
        setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
      } finally {
        setIsUploadingGlb(false)
        window.setTimeout(() => setUploadCookie(null), 900)
      }
    },
    [loadGlbModels],
  )

  const loadIntegrationStateFromDb = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/integrations/state'), { cache: 'no-store' })
      const payload = await readJsonResponse<{
        error?: string
        integrationSettings?: IntegrationSettingsMap
        enabledIntegrations?: Record<string, boolean>
        lifecycleState?: Record<string, IntegrationLifecycleState>
        approvalState?: Record<string, boolean>
        connectivityHealth?: Record<string, ConnectivityHealth>
      }>(response, 'Failed to load integration state.')

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load integration state.')
      }

      if (payload.integrationSettings) setIntegrationSettings(payload.integrationSettings)
      if (payload.enabledIntegrations) setEnabledIntegrations(payload.enabledIntegrations)
      if (payload.lifecycleState) setLifecycleState(payload.lifecycleState)
      if (payload.approvalState) setApprovalState(payload.approvalState)
      if (payload.connectivityHealth) setConnectivityHealth(payload.connectivityHealth)
    } catch {
      // Keep local state fallback when API is unavailable.
    } finally {
      setIntegrationStateLoaded(true)
    }
  }, [])

  const deleteGlbFile = useCallback(
    async (id: string, fileName: string) => {
      try {
        const response = await fetch(apiUrl(`/glb/${id}`), { method: 'DELETE' })
        const payload = await readJsonResponse<{ error?: string }>(response, 'Delete failed.')

        if (!response.ok) {
          throw new Error(payload.error ?? 'Delete failed.')
        }

        setToast({ kind: 'success', message: `${fileName} deleted.` })
        await loadGlbModels()
      } catch (error) {
        setToast({ kind: 'error', message: error instanceof Error ? error.message : 'Delete failed.' })
      }
    },
    [loadGlbModels],
  )

  const openGlbPreview = useCallback(
    (model: GlbModelRecord) => {
      setPlaygroundPreviewInUrl(model.id)
    },
    [setPlaygroundPreviewInUrl],
  )

  const closeGlbPreview = useCallback(() => {
    setPreviewHasAnimation(false)
    setIsPreviewAnimationPaused(false)
    setPlaygroundPreviewInUrl(null, true)
  }, [setPlaygroundPreviewInUrl])

  const postToGlbPreview = useCallback((message: Record<string, unknown>) => {
    glbPreviewFrameRef.current?.contentWindow?.postMessage(message, API_ORIGIN)
  }, [])

  const togglePreviewAnimation = useCallback(() => {
    const nextPaused = !isPreviewAnimationPaused
    setIsPreviewAnimationPaused(nextPaused)
    postToGlbPreview({
      type: PLAYGROUND_ANIMATION_EVENT,
      paused: nextPaused,
    })
  }, [isPreviewAnimationPaused, postToGlbPreview])

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      if (event.origin !== API_ORIGIN) return
      if (!event.data || event.data.type !== PLAYGROUND_ANIMATION_AVAILABILITY_EVENT) return

      const hasAnimation = Boolean(event.data.hasAnimation)
      setPreviewHasAnimation(hasAnimation)
      if (!hasAnimation) setIsPreviewAnimationPaused(false)
    }

    window.addEventListener('message', handlePreviewMessage)
    return () => window.removeEventListener('message', handlePreviewMessage)
  }, [])

  useEffect(() => {
    const { page, integrationId } = getPageFromPath(location.pathname)
    if (page !== activePage) {
      setActivePage(page)
    }

    if (page === 'IntegrationDetail' && integrationId) {
      const foundIntegration = integrationCatalog.find((integration) => integration.id === integrationId)
      if (foundIntegration && integrationPage?.id !== foundIntegration.id) {
        setIntegrationPage(foundIntegration)
        setIntegrationDetailTab('details')
      }
    }
  }, [activePage, integrationCatalog, integrationPage?.id, location.pathname])

  useEffect(() => {
    void loadIntegrationStateFromDb()
  }, [loadIntegrationStateFromDb])

  useEffect(() => {
    void loadWorkspaceUsers()
  }, [loadWorkspaceUsers])

  useEffect(() => {
    if (!integrationStateLoaded) return

    const timeout = window.setTimeout(() => {
      void Promise.all(
        integrationCatalog.map((integration) =>
          fetch(apiUrl(`/integrations/${integration.type}/${integration.id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              settings: integrationSettings[integration.id] ?? {},
              enabled: enabledIntegrations[integration.id] ?? false,
              lifecycleState: lifecycleState[integration.id] ?? 'draft',
              approved: approvalState[integration.id] ?? false,
              connectivityHealth: connectivityHealth[integration.id] ?? null,
            }),
          }),
        ),
      )
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [
    approvalState,
    connectivityHealth,
    enabledIntegrations,
    integrationCatalog,
    integrationSettings,
    integrationStateLoaded,
    lifecycleState,
  ])

  useEffect(() => {
    setSettingsSheetPage(1)
  }, [isCreatingIntegration, selectedIntegration?.id])

  useEffect(() => {
    if (!integrationTileFeedback) return

    const timeout = window.setTimeout(() => setIntegrationTileFeedback(null), 720)
    return () => window.clearTimeout(timeout)
  }, [integrationTileFeedback])

  useEffect(() => {
    setDetailSheetPage(1)
  }, [detailsIntegration?.id])

  useEffect(() => {
    setSettingsSheetPage((current) => Math.min(current, settingsSheetPageCount))
  }, [settingsSheetPageCount])

  useEffect(() => {
    setSelectedIntegration(null)
    setDetailsIntegration(null)
    setIsCreatingIntegration(false)
    setCreateIntegrationType(null)
    setIsUserSheetOpen(false)
    resetUserEditor()
  }, [activePage, resetUserEditor])

  useEffect(() => {
    if (activePage !== 'Playground') {
      if (previewModel) setPreviewModel(null)
      if (previewHasAnimation) setPreviewHasAnimation(false)
      if (isPreviewAnimationPaused) setIsPreviewAnimationPaused(false)
      return
    }

    const modelId = new URLSearchParams(location.search).get(GLB_PREVIEW_QUERY_PARAM)

    if (!modelId) {
      if (previewModel) setPreviewModel(null)
      if (previewHasAnimation) setPreviewHasAnimation(false)
      return
    }

    const nextPreviewModel = glbModels.find((model) => model.id === modelId) ?? null
    const currentPreviewModelId = previewModel?.id ?? null
    const nextPreviewModelId = nextPreviewModel?.id ?? null

    if (currentPreviewModelId !== nextPreviewModelId) {
      setPreviewModel(nextPreviewModel)
    }
  }, [activePage, glbModels, isPreviewAnimationPaused, location.search, previewHasAnimation, previewModel])

  useEffect(() => {
    if (activePage !== 'Playground') return
    void loadGlbModels()
  }, [activePage, loadGlbModels])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  useEffect(() => {
    if (themeMode !== 'auto') return

    const syncAutoTheme = () => setAutoTheme(getAutoThemeForTime(new Date()))
    syncAutoTheme()

    const now = new Date()
    const nextBoundary = new Date(now)
    if (now.getHours() < 7) {
      nextBoundary.setHours(7, 0, 0, 0)
    } else if (now.getHours() < 19) {
      nextBoundary.setHours(19, 0, 0, 0)
    } else {
      nextBoundary.setDate(now.getDate() + 1)
      nextBoundary.setHours(7, 0, 0, 0)
    }

    const timeoutMs = Math.max(1000, nextBoundary.getTime() - now.getTime())
    const timeout = window.setTimeout(syncAutoTheme, timeoutMs)
    return () => window.clearTimeout(timeout)
  }, [themeMode, autoTheme])

  useEffect(() => {
    if (!previewModel) return

    postToGlbPreview({
      type: PLAYGROUND_THEME_EVENT,
      theme: effectiveTheme,
    })
  }, [effectiveTheme, postToGlbPreview, previewModel])

  useEffect(() => {
    localStorage.setItem(INTEGRATION_SETTINGS_STORAGE_KEY, JSON.stringify(integrationSettings))
  }, [integrationSettings])

  useEffect(() => {
    localStorage.setItem(CUSTOM_INTEGRATIONS_STORAGE_KEY, JSON.stringify(customIntegrations))
  }, [customIntegrations])

  useEffect(() => {
    localStorage.setItem(ENABLED_INTEGRATIONS_STORAGE_KEY, JSON.stringify(enabledIntegrations))
  }, [enabledIntegrations])

  useEffect(() => {
    localStorage.setItem(POLICY_ENGINE_STORAGE_KEY, JSON.stringify(policyEngine))
  }, [policyEngine])

  useEffect(() => {
    localStorage.setItem(LIFECYCLE_STORAGE_KEY, JSON.stringify(lifecycleState))
  }, [lifecycleState])

  useEffect(() => {
    localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(approvalState))
  }, [approvalState])

  useEffect(() => {
    localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(connectivityHealth))
  }, [connectivityHealth])

  useEffect(() => {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLog))
  }, [auditLog])

  useEffect(() => {
    localStorage.setItem(REPORT_PREFS_STORAGE_KEY, JSON.stringify(reportPreferences))
  }, [reportPreferences])

  useEffect(() => {
    if (!activeSheetIntegration) {
      reset({})
      return
    }

    const saved = integrationSettings[activeSheetIntegration.id] ?? {}
    const defaults = Object.fromEntries(settingsFields.map((field) => [field.key, saved[field.key] ?? getFieldDefault(field)]))
    reset(defaults)
  }, [activeSheetIntegration, integrationSettings, reset, settingsFields])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!selectedIntegration && !isCreatingIntegration) return

    const panel = sidesheetRef.current
    if (!panel) return

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )

    const focusable = getFocusable()
    focusable[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSidesheet()
        return
      }

      if (event.key !== 'Tab') return

      const tabbables = getFocusable()
      if (!tabbables.length) return

      const first = tabbables[0]
      const last = tabbables[tabbables.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeSidesheet, isCreatingIntegration, selectedIntegration])

  useEffect(() => {
    if (!isUserSheetOpen) return

    const panel = userSheetRef.current
    if (!panel) return

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )

    const focusable = getFocusable()
    focusable[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeUserSheet()
        return
      }

      if (event.key !== 'Tab') return

      const tabbables = getFocusable()
      if (!tabbables.length) return

      const first = tabbables[0]
      const last = tabbables[tabbables.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeUserSheet, isUserSheetOpen])

  const activeTabId =
    activePage === 'IntegrationDetail'
      ? 'menu-tab-integrations'
      : activePage === 'PitchDeck'
        ? 'menu-tab-links'
        : `menu-tab-${activePage.toLowerCase()}`
  const integrationDetailsInfo = integrationPage ? integrationRuntimeInfo[integrationPage.type] : null
  const enabledIntegrationList = integrationCatalog.filter((integration) => enabledIntegrations[integration.id])
  const degradedEnabledCount = enabledIntegrationList.filter(
    (integration) => integrationRuntimeInfo[integration.type].connectivity !== 'passing',
  ).length
  const dataPointsCollected = enabledIntegrationList.reduce(
    (count, integration) => count + integrationRuntimeInfo[integration.type].currentData.length,
    0,
  )
  const integrationCoverage = `${enabledIntegrationList.length}/${integrationCatalog.length}`
  const issueHighlights = [
    ...(enabledIntegrationList.length === 0
      ? ['No integrations enabled yet. Connect at least one source to start operational insights.']
      : []),
    ...enabledIntegrationList
      .filter((integration) => integrationRuntimeInfo[integration.type].connectivity === 'degraded')
      .map((integration) => `${integration.title}: connectivity degraded - check credentials or API quotas.`),
    ...enabledIntegrationList
      .filter((integration) => integrationRuntimeInfo[integration.type].connectivity === 'failing')
      .map((integration) => `${integration.title}: connectivity failing - immediate action required.`),
  ]
  const pendingApprovals = integrationCatalog.filter((integration) => lifecycleState[integration.id] === 'pending_approval')
  const today = new Date()
  const credentialsExpiringSoon = integrationCatalog.filter((integration) => {
    const expiry = integrationSettings[integration.id]?.secretExpiresAt
    if (!expiry) return false
    const expiryDate = new Date(expiry)
    const days = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 30
  })
  const staleRotations = integrationCatalog.filter((integration) => {
    const rotated = integrationSettings[integration.id]?.secretLastRotatedAt
    if (!rotated) return true
    const rotatedDate = new Date(rotated)
    const age = (today.getTime() - rotatedDate.getTime()) / (1000 * 60 * 60 * 24)
    return age > 90
  })

  const policyViolations = integrationCatalog.filter((integration) => {
    const settings = integrationSettings[integration.id] ?? {}
    const tags = (settings.tags ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const hasMandatoryTag = !policyEngine.mandatoryTagsEnabled || tags.includes(policyEngine.mandatoryTag)
    const envAllowed =
      !settings.environment ||
      policyEngine.allowedEnvironments.includes(settings.environment as 'prod' | 'staging' | 'dev' | 'test')
    const regionAllowed = !settings.region || policyEngine.allowedRegions.includes(settings.region)
    return !hasMandatoryTag || !envAllowed || !regionAllowed
  })

  const formatRelativeAge = (iso: string) => {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60)))
    if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
    const elapsedHours = Math.round(elapsedMinutes / 60)
    if (elapsedHours < 48) return `${elapsedHours}h ago`
    const elapsedDays = Math.round(elapsedHours / 24)
    return `${elapsedDays}d ago`
  }

  const approvalQueue = pendingApprovals.map((integration) => {
    const pendingEntry = auditLog.find((entry) => entry.integrationId === integration.id && entry.action === 'integration.pending_approval')
    return {
      integration,
      waiting: pendingEntry ? formatRelativeAge(pendingEntry.at) : 'unknown',
    }
  })
  const policyPackStatus = [
    {
      name: 'Tag Enforcement Pack',
      status: policyEngine.mandatoryTagsEnabled ? 'active' : 'draft',
      scope: policyEngine.mandatoryTag,
    },
    {
      name: 'Region Guardrails',
      status: policyEngine.allowedRegions.length ? 'active' : 'draft',
      scope: `${policyEngine.allowedRegions.length} approved regions`,
    },
    {
      name: 'Authentication Methods',
      status: 'active',
      scope: `${Object.values(policyEngine.allowedAuthMethods).flat().length} approved auth patterns`,
    },
  ]
  const policyExceptions = integrationCatalog
    .filter((integration) => policyViolations.some((item) => item.id === integration.id) || staleRotations.some((item) => item.id === integration.id))
    .map((integration) => ({
      integration,
      reason: policyViolations.some((item) => item.id === integration.id)
        ? 'Policy variance requires exception review.'
        : 'Credential rotation exceeds policy window.',
      owner: integrationSettings[integration.id]?.environment === 'prod' ? 'Security review board' : 'Platform governance',
    }))
  const evidenceExports = [
    {
      title: 'Control evidence bundle',
      detail: `${policyViolations.length} variance records, ${approvalQueue.length} approvals, ${auditLog.length} audit events`,
    },
    {
      title: 'Credential governance report',
      detail: `${credentialsExpiringSoon.length} secrets expiring soon, ${staleRotations.length} overdue rotations`,
    },
    {
      title: 'Policy pack snapshot',
      detail: `${policyPackStatus.filter((item) => item.status === 'active').length} active policy packs`,
    },
  ]
  const recentAuditEntries = auditLog.slice(0, 6)
  const teamMembership = (['Platform', 'Security', 'Compliance', 'Leadership'] as TeamName[]).map((team) => ({
    team,
    count: workspaceUsers.filter((user) => user.team === team).length,
  }))
  const roleCoverage = [
    { role: 'owner', count: workspaceUsers.filter((user) => user.role === 'owner').length },
    { role: 'platform_admin', count: workspaceUsers.filter((user) => user.role === 'platform_admin').length },
    { role: 'security_reviewer', count: workspaceUsers.filter((user) => user.role === 'security_reviewer').length },
    { role: 'compliance_auditor', count: workspaceUsers.filter((user) => user.role === 'compliance_auditor').length },
    { role: 'viewer', count: workspaceUsers.filter((user) => user.role === 'viewer').length },
  ]
  const ssoCoverage = [
    { label: 'SSO enforced', count: workspaceUsers.filter((user) => user.sso === 'enforced').length },
    { label: 'SSO optional', count: workspaceUsers.filter((user) => user.sso === 'optional').length },
    { label: 'Break-glass', count: workspaceUsers.filter((user) => user.sso === 'break_glass').length },
  ]
  const approvers = workspaceUsers.filter((user) => user.canApproveProduction)
  const normalizedUserSearch = userSearch.trim().toLowerCase()
  const filteredDirectoryUsers = workspaceUsers.filter((user) => {
    if (!normalizedUserSearch) return true
    return [user.name, user.email, user.team, user.role].some((value) => value.toLowerCase().includes(normalizedUserSearch))
  })
  const directoryUsers = filteredDirectoryUsers.slice().sort((left, right) => {
    const direction = userSortDirection === 'asc' ? 1 : -1
    if (userSortKey === 'lastActivityAt') {
      return (new Date(left.lastActivityAt).getTime() - new Date(right.lastActivityAt).getTime()) * direction
    }

    return left[userSortKey].localeCompare(right[userSortKey]) * direction
  })
  const reportingHistory = [
    {
      label: `${reportPreferences.schedule} governance report`,
      detail: `Redaction ${reportPreferences.redaction}`,
      when: recentAuditEntries[0] ? formatRelativeAge(recentAuditEntries[0].at) : 'Pending first run',
    },
    {
      label: 'Evidence export',
      detail: 'Board review packet',
      when: auditLog.length ? formatRelativeAge(auditLog[0].at) : 'Not generated yet',
    },
    {
      label: 'Exception digest',
      detail: `${policyExceptions.length} open governance exceptions`,
      when: 'Today',
    },
  ]
  const attentionItems = [
    ...issueHighlights.slice(0, 2),
    ...credentialsExpiringSoon.slice(0, 2).map((integration) => `${integration.title}: secret expires in <=30 days.`),
    ...staleRotations.slice(0, 2).map((integration) => `${integration.title}: rotation age exceeds 90 days.`),
    ...approvalQueue.slice(0, 2).map((item) => `${item.integration.title}: pending approval (${item.waiting}).`),
  ].slice(0, 6)
  const operationalSummaryItems = [
    `Coverage ${integrationCoverage} across connected environments.`,
    `${enabledIntegrationList.length} enabled integrations collecting ${dataPointsCollected} active data streams.`,
    `${degradedEnabledCount} integrations currently reporting degraded connectivity.`,
    ...(attentionItems.length ? attentionItems.slice(0, 3) : ['No high-priority blockers right now.']),
  ]
  const detailSettings = integrationPage ? integrationSettings[integrationPage.id] ?? {} : {}
  const detailHealth = integrationPage ? connectivityHealth[integrationPage.id] ?? null : null
  const detailAuditEntries = integrationPage
    ? auditLog.filter((entry) => entry.integrationId === integrationPage.id).slice(0, 8)
    : []
  const detailImportedAssets = integrationPage
    ? [
        {
          name: detailSettings.scopeId || `${integrationPage.type}-primary-scope`,
          kind: detailSettings.scopeType || (integrationPage.type === 'kubernetes' ? 'cluster' : 'workspace'),
          detail: detailSettings.environment ? `Environment ${detailSettings.environment}` : 'Primary imported scope',
        },
        ...integrationRuntimeInfo[integrationPage.type].currentData.map((item, index) => ({
          name: item,
          kind: index === 0 ? 'inventory feed' : index === 1 ? 'security feed' : 'telemetry feed',
          detail:
            detailSettings.collectionMode === 'full'
              ? 'Collected with full coverage enabled.'
              : 'Collected with minimal operational scope.',
        })),
      ]
    : []
  const detailTopologyNodes = integrationPage
    ? [
        {
          label: detailSettings.environment ? `${detailSettings.environment} district` : 'Shared district',
          role: 'Zone',
          detail: detailSettings.region || 'Region not set',
        },
        {
          label: detailSettings.scopeId || `${integrationPage.type}-scope`,
          role: detailSettings.scopeType || 'Scope',
          detail: detailSettings.workspaceId || detailSettings.projectId || detailSettings.accountId || 'Connected asset root',
        },
        {
          label: `${integrationPage.title} data bridge`,
          role: 'Connector',
          detail: detailHealth?.connectivity ? `Health ${detailHealth.connectivity}` : 'Awaiting initial health sample',
        },
      ]
    : []
  const detailFindings = integrationPage
    ? [
        ...(policyViolations.some((item) => item.id === integrationPage.id)
          ? [
              {
                title: 'Policy drift detected',
                severity: 'high',
                detail: 'One or more configured fields are outside current policy guardrails.',
              },
            ]
          : []),
        ...(detailHealth?.connectivity === 'degraded' || detailHealth?.connectivity === 'failing'
          ? [
              {
                title: detailHealth.connectivity === 'failing' ? 'Connector outage risk' : 'Connector degradation',
                severity: detailHealth.connectivity === 'failing' ? 'high' : 'medium',
                detail:
                  detailHealth.connectivity === 'failing'
                    ? 'Data freshness and remediation context may be incomplete.'
                    : 'Latency, quota pressure, or auth instability is affecting signal quality.',
              },
            ]
          : []),
        ...((detailSettings.containsSensitiveData ?? 'no') === 'yes'
          ? [
              {
                title: 'Sensitive data collection enabled',
                severity: 'medium',
                detail: 'Imported asset path includes sensitive or PII-tagged content.',
              },
            ]
          : []),
        ...(integrationPage && staleRotations.some((item) => item.id === integrationPage.id)
          ? [
              {
                title: 'Credential rotation overdue',
                severity: 'medium',
                detail: 'Secret rotation metadata exceeds the 90 day policy window.',
              },
            ]
          : []),
      ]
    : []
  const detailIdentities = integrationPage
    ? [
        {
          name: detailSettings.authMethod || 'default_auth',
          role: 'Authentication method',
          detail: detailSettings.secretRef || 'No secret reference recorded',
        },
        {
          name:
            detailSettings.serviceAccountEmail ||
            detailSettings.clientId ||
            detailSettings.roleArn ||
            detailSettings.workspaceSlug ||
            'connector-principal',
          role: 'Primary principal',
          detail: detailSettings.environment ? `Bound to ${detailSettings.environment}` : 'Shared connector identity',
        },
      ]
    : []
  const detailActions = integrationPage
    ? [
        ...(detailFindings.length
          ? [
              {
                title: 'Open remediation workflow',
                owner: 'Platform team',
                state: 'recommended',
              },
            ]
          : []),
        ...(detailHealth?.connectivity !== 'passing'
          ? [
              {
                title: 'Retest connector and refresh credentials',
                owner: 'Connector operator',
                state: 'urgent',
              },
            ]
          : []),
        {
          title: 'Review imported asset scope',
          owner: 'Security engineering',
          state: 'queued',
        },
      ]
    : []
  const detailTabOptions: Array<{ value: IntegrationDetailTab; label: string }> = [
    { value: 'details', label: 'Details' },
    { value: 'topology', label: 'Topology' },
    { value: 'findings', label: 'Findings' },
    { value: 'identities', label: 'Identities' },
    { value: 'changes', label: 'Changes' },
    { value: 'actions', label: 'Actions' },
    { value: 'activity', label: 'Activity' },
  ]
  const homeMetricTiles = [
    { label: 'Amount of Games', value: '0', detail: 'Total games tracked so far.' },
    { label: 'Amount of Projects', value: '0', detail: 'Current active and archived projects.' },
    { label: 'Physical vs Digital Books', value: '0 / 0', detail: 'Physical books compared with digital ones.' },
    { label: 'Lifetime Flights', value: '0', detail: 'Flights taken across your lifetime.' },
  ]

  return (
    <main className={`app-shell ${effectiveTheme}`}>
      <m.aside
        className="sidebar collapsed"
        initial={false}
        animate={{ width: collapsedWidth }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <header className="sidebar-header">
          <m.h1
            className="brand brand-compact"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MENU_ANIMATION_DURATION, ease: EASE_SOFT }}
          >
            <span>HOUSE</span>
            <span>OF</span>
            <span>TOBIAS</span>
          </m.h1>
        </header>

        <nav className="sidebar-nav" aria-label="Sidebar menu" role="tablist">
          {mainNavigationItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activePage === item.label

            return (
              <m.button
                key={item.label}
                id={`menu-tab-${item.label.toLowerCase()}`}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                type="button"
                className={`nav-item menu-tooltip ${item.label === 'Home' ? 'nav-item-home' : ''} ${isActive ? 'active' : ''}`}
                data-tooltip={item.description ?? item.label}
                onClick={() => goToPage(item.label)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.16 + index * 0.09,
                  duration: MENU_ANIMATION_DURATION,
                  ease: EASE_SOFT,
                }}
              >
                {isActive ? (
                  <m.span
                    layoutId="sidebar-active-pill"
                    className="nav-item-indicator"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Icon size={18} />
                {isExpanded && (
                  <span className="nav-copy">
                    <span className="nav-label">{item.label}</span>
                    {item.description ? <span className="nav-description">{item.description}</span> : null}
                  </span>
                )}
              </m.button>
            )
          })}
        </nav>

        <div className="sidebar-bottom-group">
          <nav className="sidebar-bottom-nav" aria-label="Sidebar secondary menu" role="tablist">
            {bottomNavigationItems.map((item, index) => {
              const Icon = item.icon
              const isActive = activePage === item.label

              return (
                <m.button
                  key={item.label}
                  id={`menu-tab-${item.label.toLowerCase()}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  type="button"
                  className={`nav-item menu-tooltip ${isActive ? 'active' : ''}`}
                  data-tooltip={item.description ?? item.label}
                  onClick={() => goToPage(item.label)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.24 + index * 0.08,
                    duration: MENU_ANIMATION_DURATION,
                    ease: EASE_SOFT,
                  }}
                >
                  {isActive ? (
                    <m.span
                      layoutId="sidebar-active-pill"
                      className="nav-item-indicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <Icon size={18} />
                  {isExpanded && (
                    <span className="nav-copy">
                      <span className="nav-label">{item.label}</span>
                      {item.description ? <span className="nav-description">{item.description}</span> : null}
                    </span>
                  )}
                </m.button>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <m.button
              className="icon-button theme-toggle-btn"
              type="button"
              aria-label={`Theme mode: ${themeMode}. Toggle theme mode`}
              onClick={toggleTheme}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.24 + bottomNavigationItems.length * 0.08 + 0.08,
                duration: MENU_ANIMATION_DURATION,
                ease: EASE_SOFT,
              }}
            >
              <span className="theme-toggle-icon-stage" aria-hidden>
                <m.span
                  className="theme-toggle-icon-row"
                  animate={{ x: `${themeToggleIndex * -18}px` }}
                  transition={{ duration: 0.24, ease: 'easeInOut' }}
                >
                  <span className="theme-toggle-icon">
                    <Sun size={18} />
                  </span>
                  <span className="theme-toggle-icon">
                    <Moon size={18} />
                  </span>
                  <span className="theme-toggle-icon">
                    <MagicWand size={18} />
                  </span>
                </m.span>
              </span>
            </m.button>
          </div>
        </div>
      </m.aside>

      <section
        className={`content-panel ${activePage === 'Playground' && previewModel ? 'playground-preview-active' : ''}`}
        aria-label="Main content"
        role="tabpanel"
        aria-labelledby={activeTabId}
        style={{ marginLeft: collapsedWidth }}
      >
        {activePage === 'Home' ? (
          <section className="home-page" aria-label="Operations dashboard">
            <PageHeader
              title="Home"
              subtitle="Personal dashboard metrics at a glance."
            />

            <m.div
              className="home-kpi-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: CONTENT_START_DELAY + 0.2 } },
              }}
            >
              {homeMetricTiles.map((metric, index) => (
                <m.article
                  key={metric.label}
                  className="home-kpi-card"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: CONTENT_START_DELAY + 0.2 + index * 0.08,
                    duration: 0.35,
                    ease: EASE_SOFT,
                  }}
                >
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <p>{metric.detail}</p>
                </m.article>
              ))}
            </m.div>
          </section>
        ) : activePage === 'Integrations' ? (
          <>
            <PageHeader
              title="Integrations"
              subtitle="Enable the services your workspace should connect to."
            />

            <m.div
              className="integration-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: CONTENT_START_DELAY + 0.2,
                  },
                },
              }}
            >
              {integrationCatalog.map((integration) => {
                const isEnabled = enabledIntegrations[integration.id] ?? false
                const logo = effectiveTheme === 'dark' && integration.darkLogo ? integration.darkLogo : integration.logo
                const tileFeedbackMode =
                  integrationTileFeedback?.integrationId === integration.id ? integrationTileFeedback.mode : null
                const settings = integrationSettings[integration.id] ?? {}
                const health = connectivityHealth[integration.id]
                const tileConnectivity =
                  health?.connectivity ?? (isEnabled ? integrationRuntimeInfo[integration.type].connectivity : 'disabled')
                const lastSyncLabel = health?.lastSyncAt ? formatRelativeAge(health.lastSyncAt) : 'Awaiting first sync'
                const scopeLabel = settings.scopeType && settings.scopeId
                  ? `${settings.scopeType}: ${settings.scopeId}`
                  : settings.environment
                    ? `environment: ${settings.environment}`
                    : 'Scope not configured'
                const coverageCount = integrationRuntimeInfo[integration.type].currentData.length
                const coverageMode = settings.collectionMode === 'full' ? 'full' : 'minimal'
                const coverageLabel = `${coverageCount} feeds, ${coverageMode} mode`

                return (
                  <m.article
                    key={integration.id}
                    className={`integration-tile ${isEnabled ? 'enabled' : ''}`}
                    animate={
                      tileFeedbackMode
                        ? {
                            boxShadow:
                              tileFeedbackMode === 'enabled'
                                ? [
                                    '0 0 0 rgba(240, 90, 40, 0)',
                                    '0 0 0 3px rgba(240, 90, 40, 0.2)',
                                    '0 10px 30px rgba(240, 90, 40, 0.12)',
                                    '0 0 0 rgba(240, 90, 40, 0)',
                                  ]
                                : [
                                    '0 0 0 rgba(0, 0, 0, 0)',
                                    '0 0 0 3px rgba(125, 137, 163, 0.18)',
                                    '0 8px 24px rgba(0, 0, 0, 0.08)',
                                    '0 0 0 rgba(0, 0, 0, 0)',
                                  ],
                          }
                        : undefined
                    }
                    transition={
                      tileFeedbackMode
                        ? { duration: 0.66, times: [0, 0.22, 0.58, 1], ease: EASE_SOFT }
                        : undefined
                    }
                    variants={{
                      hidden: { opacity: 0, y: 14, scale: 0.98 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.42, ease: EASE_SOFT },
                      },
                    }}
                  >
                    <AnimatePresence>
                      {tileFeedbackMode ? (
                        <m.span
                          key={`${integration.id}-${integrationTileFeedback?.token}`}
                          className={`integration-tile-ring integration-tile-ring-${tileFeedbackMode}`}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: [0, 0.95, 0], scale: [0.92, 1.02, 1.08] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.66, times: [0, 0.28, 1], ease: EASE_SOFT }}
                          aria-hidden
                        />
                      ) : null}
                    </AnimatePresence>
                    <div className="tile-top">
                      <span className="tile-icon" aria-hidden>
                        <m.img
                          src={`${assetBase}${logo}`}
                          alt=""
                          initial={false}
                          animate={{
                            filter: isEnabled ? 'grayscale(0) saturate(1)' : 'grayscale(1) saturate(0.15)',
                            opacity: isEnabled ? 1 : 0.7,
                            scale:
                              tileFeedbackMode === 'enabled'
                                ? [0.88, 1.12, 1]
                                : tileFeedbackMode === 'disabled'
                                  ? [1, 0.96, 1]
                                  : 1,
                          }}
                          transition={{
                            filter: { duration: isEnabled ? 0.46 : 0.24, ease: EASE_SOFT },
                            opacity: { duration: 0.28, ease: EASE_SOFT },
                            scale: {
                              duration: tileFeedbackMode ? 0.52 : 0.24,
                              times: tileFeedbackMode ? [0, 0.52, 1] : undefined,
                              ease: EASE_SOFT,
                            },
                          }}
                        />
                      </span>
                      <button
                        type="button"
                        className={`toggle-switch ${isEnabled ? 'enabled' : ''}`}
                        onClick={() => toggleIntegration(integration)}
                        aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${integration.title}`}
                      >
                        <span className="toggle-thumb" />
                      </button>
                    </div>
                    <h3>{integration.title}</h3>
                    <p>{integration.description}</p>
                    <div className="tile-status-row">
                      <span className={`tile-health-badge status-${tileConnectivity}`}>{tileConnectivity}</span>
                      {isEnabled ? (
                        <span className="tile-latency">{health?.latencyMs ? `${health.latencyMs}ms` : 'Live'}</span>
                      ) : null}
                    </div>
                    {isEnabled ? (
                      <dl className="tile-meta-grid">
                        <div>
                          <dt>Last sync</dt>
                          <dd>{lastSyncLabel}</dd>
                        </div>
                        <div>
                          <dt>Scope</dt>
                          <dd>{scopeLabel}</dd>
                        </div>
                        <div>
                          <dt>Coverage</dt>
                          <dd>{coverageLabel}</dd>
                        </div>
                      </dl>
                    ) : (
                      <div className="tile-empty-state home-chart-empty">
                        <strong>Not connected</strong>
                        <p>Enable this connector to start syncing coverage, scope, and asset data.</p>
                      </div>
                    )}
                    {isEnabled ? (
                      <div className="integration-tile-actions">
                        <m.button
                          type="button"
                          className="integration-icon-btn"
                          aria-label={`Test connection for ${integration.title}`}
                          title="Test connection"
                          whileTap={ACTION_BUTTON_PRESS}
                          onClick={() => testIntegrationConnection(integration)}
                        >
                          <PlugCharging size={16} weight="bold" />
                        </m.button>
                        <m.button
                          type="button"
                          className="integration-icon-btn"
                          aria-label={`View imported assets for ${integration.title}`}
                          title="View imported assets"
                          whileTap={ACTION_BUTTON_PRESS}
                          onClick={() => openImportedAssetsView(integration)}
                        >
                          <Layout size={16} weight="bold" />
                        </m.button>
                        <m.button
                          type="button"
                          className="integration-icon-btn"
                          aria-label={`View details for ${integration.title}`}
                          title="View details"
                          onClick={() => setDetailsIntegration(integration)}
                          whileTap={ACTION_BUTTON_PRESS}
                        >
                          <Eye size={16} weight="bold" />
                        </m.button>
                      </div>
                    ) : null}
                  </m.article>
                )
              })}
              <m.button
                type="button"
                className="integration-tile integration-tile-add"
                onClick={openCreateIntegration}
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.42, ease: EASE_SOFT },
                  },
                }}
                whileTap={ACTION_BUTTON_PRESS}
              >
                <span className="add-integration-icon" aria-hidden>
                  <Plus size={22} weight="bold" />
                </span>
                <span className="add-integration-label">Add New</span>
                <span className="add-integration-copy">
                  Create a new connector and configure its settings in the next step.
                </span>
              </m.button>
            </m.div>
          </>
        ) : activePage === 'Admin' ? (
          <section className="admin-page" aria-label="Policy and governance center">
            <PageHeader
              title="Governance Center"
              subtitle="Policy packs, exceptions, approvals, evidence exports, and reporting history for controlled rollout and compliance."
            />

            <m.div
              className="admin-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: CONTENT_START_DELAY + 0.2 } },
              }}
            >
              <PanelCard
                className="admin-card"
                icon={<ShieldStar size={18} weight="duotone" />}
                title="Policy Pack Builder"
                delay={CONTENT_START_DELAY + 0.2}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <label className="admin-inline">
                  <input
                    type="checkbox"
                    checked={policyEngine.mandatoryTagsEnabled}
                    onChange={(event) =>
                      setPolicyEngine((current) => ({ ...current, mandatoryTagsEnabled: event.target.checked }))
                    }
                  />
                  Enforce mandatory tag
                </label>
                <label>
                  Mandatory Tag
                  <Input
                    type="text"
                    value={policyEngine.mandatoryTag}
                    onChange={(event) => setPolicyEngine((current) => ({ ...current, mandatoryTag: event.target.value }))}
                  />
                </label>
                <label>
                  Allowed Regions (comma separated)
                  <Input
                    type="text"
                    value={policyEngine.allowedRegions.join(',')}
                    onChange={(event) =>
                      setPolicyEngine((current) => ({
                        ...current,
                        allowedRegions: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                      }))
                    }
                  />
                </label>
                <div className="admin-chip-row">
                  {policyPackStatus.map((pack) => (
                    <span key={pack.name} className={`admin-chip status-${pack.status}`}>
                      {pack.name}: {pack.status}
                    </span>
                  ))}
                </div>
              </PanelCard>

              <PanelCard
                className="admin-card"
                icon={<ClockCountdown size={18} weight="duotone" />}
                title="Approval Queue"
                subtitle={`${pendingApprovals.length} integrations are currently waiting for governance approval.`}
                delay={CONTENT_START_DELAY + 0.28}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                {approvalQueue.length ? (
                  <ul>
                    {approvalQueue.map((item) => (
                      <li key={item.integration.id}>
                        <span>{item.integration.title}</span>
                        <em>{item.waiting}</em>
                        <m.button
                          type="button"
                          className="admin-action"
                          whileTap={ACTION_BUTTON_PRESS}
                          onClick={() => approveIntegration(item.integration.id)}
                        >
                          Approve
                        </m.button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="home-chart-empty admin-empty-state">
                    <strong>No pending approvals</strong>
                    <p>Connector changes that require governance approval will appear here once production-bound updates are submitted.</p>
                  </div>
                )}
              </PanelCard>

              <PanelCard
                className="admin-card"
                icon={<WarningDiamond size={18} weight="duotone" />}
                title="Governance Exceptions"
                subtitle="Open exceptions require explicit review before they should remain in policy variance."
                delay={CONTENT_START_DELAY + 0.36}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul>
                  {(policyExceptions.length ? policyExceptions : [{ integration: null, reason: 'No open exceptions.', owner: 'Governance center' }]).map((exception) => (
                    <li key={exception.integration?.id ?? exception.reason}>
                      <span>{exception.integration?.title ?? 'Exception queue clear'}</span>
                      <em>{exception.owner}</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="admin-card"
                icon={<GearSix size={18} weight="duotone" />}
                title="Lifecycle Governance"
                subtitle="Manage connector state transitions without mixing in runtime health details."
                delay={CONTENT_START_DELAY + 0.44}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="admin-lifecycle-list">
                  {integrationCatalog.map((integration) => (
                    <li key={integration.id}>
                      <div className="admin-lifecycle-copy">
                        <span>{integration.title}</span>
                        <em>{lifecycleState[integration.id] ?? 'draft'}</em>
                      </div>
                      <div className="admin-lifecycle-actions">
                        <m.button
                          type="button"
                          className="users-icon-btn admin-lifecycle-btn"
                          aria-label={`Set ${integration.title} active`}
                          disabled={!(enabledIntegrations[integration.id] ?? false)}
                          whileTap={ACTION_BUTTON_PRESS}
                          onClick={() => setLifecycleManually(integration.id, 'active')}
                        >
                          <CheckCircle size={15} weight="bold" />
                        </m.button>
                        <m.button
                          type="button"
                          className="users-icon-btn admin-lifecycle-btn"
                          aria-label={`Set ${integration.title} disabled`}
                          disabled={!(enabledIntegrations[integration.id] ?? false)}
                          whileTap={ACTION_BUTTON_PRESS}
                          onClick={() => setLifecycleManually(integration.id, 'disabled')}
                        >
                          <Prohibit size={15} weight="bold" />
                        </m.button>
                        <m.button
                          type="button"
                          className="users-icon-btn admin-lifecycle-btn"
                          aria-label={`Archive ${integration.title}`}
                          disabled={!(enabledIntegrations[integration.id] ?? false)}
                          whileTap={ACTION_BUTTON_PRESS}
                          onClick={() => setLifecycleManually(integration.id, 'archived')}
                        >
                          <Archive size={15} weight="bold" />
                        </m.button>
                      </div>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="admin-card"
                icon={<DownloadSimple size={18} weight="duotone" />}
                title="Evidence Exports"
                subtitle="Generate board-ready evidence packs and control snapshots from governance data."
                delay={CONTENT_START_DELAY + 0.52}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul>
                  {evidenceExports.map((item) => (
                    <li key={item.title}>
                      <span>{item.title}</span>
                      <em>{item.detail}</em>
                    </li>
                  ))}
                </ul>
                <m.button type="button" className="link-button" whileTap={ACTION_BUTTON_PRESS} onClick={exportAuditCsv}>
                  Export Evidence CSV
                </m.button>
              </PanelCard>

              <PanelCard
                className="admin-card"
                icon={<ClockCounterClockwise size={18} weight="duotone" />}
                title="Audit Timeline"
                subtitle="Immutable governance events across policy, approval, and lifecycle decisions."
                delay={CONTENT_START_DELAY + 0.6}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="admin-audit-list">
                  {auditLog.slice(0, 6).map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.action}</span>
                      <em>{new Date(entry.at).toLocaleString()}</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="admin-card"
                icon={<ClipboardText size={18} weight="duotone" />}
                title="Reporting History"
                delay={CONTENT_START_DELAY + 0.68}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <label>
                  Report Schedule
                  <Select
                    value={reportPreferences.schedule}
                    onChange={(event) =>
                      setReportPreferences((current) => ({
                        ...current,
                        schedule: event.target.value as ReportPreferences['schedule'],
                      }))
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </label>
                <label>
                  Redaction Level
                  <Select
                    value={reportPreferences.redaction}
                    onChange={(event) =>
                      setReportPreferences((current) => ({
                        ...current,
                        redaction: event.target.value as ReportPreferences['redaction'],
                      }))
                    }
                  >
                    <option value="none">No redaction</option>
                    <option value="pii">PII redaction</option>
                    <option value="full">Full redaction</option>
                  </Select>
                </label>
                <ul className="admin-reporting-list">
                  {reportingHistory.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <em>{item.when}</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>
            </m.div>
          </section>
        ) : activePage === 'IntegrationDetail' && integrationPage && integrationDetailsInfo ? (
          <section className="integration-detail-page" aria-label={`${integrationPage.title} detail page`}>
            <PageHeader
              title={integrationPage.title}
              subtitle="Dedicated integration workspace for SecOps and platform teams."
              className="detail-page-header"
              actions={
                <m.button
                  type="button"
                  className="back-button"
                  whileTap={ACTION_BUTTON_PRESS}
                  onClick={() => goToPage('Integrations')}
                >
                  <ArrowLeft size={16} />
                  Back to Integrations
                </m.button>
              }
            />

            <div className="detail-tabs" role="tablist" aria-label="Integration detail tabs">
              {detailTabOptions.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={integrationDetailTab === tab.value}
                  className={`detail-tab ${integrationDetailTab === tab.value ? 'active' : ''}`}
                  onClick={() => setIntegrationDetailTab(tab.value)}
                >
                  {integrationDetailTab === tab.value ? (
                    <m.span
                      layoutId="integration-detail-active-pill"
                      className="detail-tab-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="detail-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {integrationDetailTab === 'details' ? (
                <m.div
                  key="details"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: -10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: 10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <div className="detail-summary-grid">
                    <section className="detail-card">
                      <h3>Integration Overview</h3>
                      <ul className="detail-list">
                        <li><span>Type</span><em>{integrationPage.type.toUpperCase()}</em></li>
                        <li><span>Status</span><em>{enabledIntegrations[integrationPage.id] ? 'Enabled' : 'Disabled'}</em></li>
                        <li><span>Connectivity</span><em>{detailHealth?.connectivity ?? integrationDetailsInfo.connectivity}</em></li>
                        <li><span>Last sync</span><em>{detailHealth?.lastSyncAt ? formatRelativeAge(detailHealth.lastSyncAt) : 'Awaiting first sync'}</em></li>
                      </ul>
                    </section>
                    <section className="detail-card">
                      <h3>Imported Scope</h3>
                      <ul className="detail-list">
                        <li><span>Environment</span><em>{detailSettings.environment || 'Not set'}</em></li>
                        <li><span>Scope</span><em>{detailSettings.scopeType || 'default'} / {detailSettings.scopeId || 'not configured'}</em></li>
                        <li><span>Collection</span><em>{detailSettings.collectionMode || 'minimal'}</em></li>
                        <li><span>Sensitive data</span><em>{detailSettings.containsSensitiveData || 'no'}</em></li>
                      </ul>
                    </section>
                    <section className="detail-card">
                      <h3>Imported Assets</h3>
                      <p>{detailImportedAssets.length} imported assets and feeds are currently mapped into this workspace.</p>
                      <ul className="detail-list">
                        {detailImportedAssets.slice(0, 3).map((asset) => (
                          <li key={asset.name}><span>{asset.name}</span><em>{asset.kind}</em></li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </m.div>
              ) : integrationDetailTab === 'topology' ? (
                <m.div
                  key="topology"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: 10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <section className="detail-card">
                    <h3>Topology</h3>
                    <div className="detail-topology-grid">
                      {detailTopologyNodes.map((node) => (
                        <article key={node.label} className="detail-topology-node">
                          <strong>{node.label}</strong>
                          <span>{node.role}</span>
                          <p>{node.detail}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="detail-card">
                    <h3>Imported Assets</h3>
                    <ul className="detail-list">
                      {detailImportedAssets.map((asset) => (
                        <li key={`${asset.name}-${asset.kind}`}>
                          <span>{asset.name}</span>
                          <em>{asset.kind}</em>
                        </li>
                      ))}
                    </ul>
                  </section>
                </m.div>
              ) : integrationDetailTab === 'findings' ? (
                <m.div
                  key="findings"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: 10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <section className="detail-card">
                    <h3>Generated Findings</h3>
                    <ul className="detail-finding-list">
                      {(detailFindings.length ? detailFindings : [{
                        title: 'No active findings',
                        severity: 'low',
                        detail: 'No policy, health, or credential issues are currently flagged.',
                      }]).map((finding) => (
                        <li key={finding.title} className={`severity-${finding.severity}`}>
                          <span>{finding.title}</span>
                          <p>{finding.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                </m.div>
              ) : integrationDetailTab === 'identities' ? (
                <m.div
                  key="identities"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: 10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <section className="detail-card">
                    <h3>Identities</h3>
                    <ul className="detail-list">
                      {detailIdentities.map((identity) => (
                        <li key={identity.name}>
                          <span>{identity.name}</span>
                          <em>{identity.role}</em>
                        </li>
                      ))}
                    </ul>
                    <p>{detailIdentities[0]?.detail}</p>
                    <p>{detailIdentities[1]?.detail}</p>
                  </section>
                </m.div>
              ) : integrationDetailTab === 'changes' ? (
                <m.div
                  key="changes"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: 10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <section className="detail-card">
                    <h3>Change Timeline</h3>
                    <ul className="detail-list">
                      {(detailAuditEntries.length ? detailAuditEntries : [{
                        id: 'no-changes',
                        action: 'No integration-specific changes yet',
                        at: new Date().toISOString(),
                        actor: 'system',
                      }]).map((entry) => (
                        <li key={entry.id}>
                          <span>{entry.action}</span>
                          <em>{formatRelativeAge(entry.at)}</em>
                        </li>
                      ))}
                    </ul>
                  </section>
                </m.div>
              ) : integrationDetailTab === 'actions' ? (
                <m.div
                  key="actions"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: 10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <section className="detail-card">
                    <h3>Remediation Actions</h3>
                    <ul className="detail-action-list">
                      {detailActions.map((action) => (
                        <li key={action.title}>
                          <span>{action.title}</span>
                          <em>{action.owner} · {action.state}</em>
                        </li>
                      ))}
                    </ul>
                  </section>
                </m.div>
              ) : (
                <m.div
                  key="activity"
                  className="detail-workspace"
                  initial={{ opacity: 0, y: 12, x: 10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE_SOFT }}
                >
                  <section className="detail-card">
                    <h3>Connectivity Test & Activity</h3>
                    <p>Connectivity: {integrationDetailsInfo.connectivity}</p>
                    <p>{integrationDetailsInfo.lastConnectivityTest}</p>
                    <h4>Current Data Being Collected</h4>
                    <ul className="activity-list">
                      {integrationDetailsInfo.currentData.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <a href={integrationDetailsInfo.townPageUrl} target="_blank" rel="noreferrer">
                      Open Integration Town Page
                    </a>
                  </section>
                </m.div>
              )}
            </AnimatePresence>
          </section>
        ) : activePage === 'Users' ? (
          <section className="users-page" aria-label="Access control center">
            <PageHeader
              title="Users"
              subtitle="Access control, team membership, SSO posture, last activity, and approval authority."
            />
            <m.div
              className="users-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: CONTENT_START_DELAY + 0.2 } },
              }}
            >
              <PanelCard
                className="users-card"
                icon={<UsersThree size={18} weight="duotone" />}
                title="Team Membership"
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="users-list">
                  {teamMembership.map((team) => (
                    <li key={team.team}>
                      <span>{team.team}</span>
                      <em>{team.count} members</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="users-card"
                icon={<ClockCounterClockwise size={18} weight="duotone" />}
                title="Last Activity"
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="users-list">
                  {workspaceUsers
                    .slice()
                    .sort((left, right) => new Date(left.lastActivityAt).getTime() - new Date(right.lastActivityAt).getTime())
                    .map((user) => (
                      <li key={`${user.id}-activity`}>
                        <span>{user.name}</span>
                        <em>{formatRelativeAge(user.lastActivityAt)}</em>
                      </li>
                    ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="users-card"
                icon={<ShieldCheck size={18} weight="duotone" />}
                title="SSO Status"
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="users-list">
                  {ssoCoverage.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <em>{item.count}</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="users-card"
                icon={<SealCheck size={18} weight="duotone" />}
                title="Approval Authority"
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="users-list">
                  {approvers.map((user) => (
                    <li key={`${user.id}-approver`}>
                      <div>
                        <span>{user.name}</span>
                        <p>{user.team}</p>
                      </div>
                      <em>Production approver</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="users-card"
                icon={<Users size={18} weight="duotone" />}
                title="Role Coverage"
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <ul className="users-list">
                  {roleCoverage.map((item) => (
                    <li key={item.role}>
                      <span>{item.role}</span>
                      <em>{item.count}</em>
                    </li>
                  ))}
                </ul>
              </PanelCard>

              <PanelCard
                className="users-card users-card-directory"
                icon={<AddressBook size={18} weight="duotone" />}
                title="Directory"
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_SOFT } },
                }}
              >
                <div className="users-directory-search">
                  <Input
                    type="search"
                    placeholder="Search by name, email, team, or role"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                  />
                </div>
                <div className="users-directory-table" role="table" aria-label="User directory">
                  <div className="users-directory-row users-directory-header" role="row">
                    {([
                      ['name', 'Name'],
                      ['email', 'Email'],
                      ['team', 'Team'],
                      ['role', 'Role'],
                      ['lastActivityAt', 'Last Activity'],
                    ] as Array<[UserDirectorySortKey, string]>).map(([key, label]) => {
                      const isActiveSort = userSortKey === key
                      const SortIcon = isActiveSort && userSortDirection === 'desc' ? CaretDown : CaretUp

                      return (
                        <button
                          key={key}
                          type="button"
                          className={`users-sort-btn users-col-${key}`}
                          onClick={() => sortDirectoryBy(key)}
                        >
                          <span>{label}</span>
                          <SortIcon size={12} weight="bold" className={isActiveSort ? 'active' : undefined} />
                        </button>
                      )
                    })}
                    <span className="users-col-actions">Actions</span>
                  </div>
                  <div className="users-directory-body" role="rowgroup">
                    {directoryUsers.length ? (
                      directoryUsers.map((user) => (
                        <div key={user.id} className="users-directory-row" role="row">
                          <span className="users-col-name">{user.name}</span>
                          <span className="users-col-email">{user.email}</span>
                          <span className="users-col-team">{user.team}</span>
                          <span className="users-col-role">{user.role}</span>
                          <span className="users-col-lastActivityAt">{formatRelativeAge(user.lastActivityAt)}</span>
                          <div className="users-col-actions">
                            <div className="users-row-icon-group">
                              <m.button
                                type="button"
                                className="users-icon-btn"
                                aria-label={`Edit ${user.name}`}
                                whileTap={isUserSaving || isUserDeletingId === user.id ? undefined : ACTION_BUTTON_PRESS}
                                disabled={isUserSaving || isUserDeletingId === user.id}
                                onClick={() => beginEditUser(user)}
                              >
                                <PencilSimple size={15} weight="bold" />
                              </m.button>
                              <m.button
                                type="button"
                                className="users-icon-btn users-icon-btn-danger"
                                aria-label={`Delete ${user.name}`}
                                whileTap={isUserSaving || isUserDeletingId === user.id ? undefined : ACTION_BUTTON_PRESS}
                                disabled={isUserSaving || isUserDeletingId === user.id}
                                onClick={() => deleteUserRecord(user.id)}
                              >
                                <Trash size={15} weight="bold" />
                              </m.button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="users-directory-empty">
                        {isUsersLoading ? 'Loading users…' : 'No users match the current search.'}
                      </div>
                    )}
                  </div>
                </div>
              </PanelCard>
            </m.div>
            <m.button
              type="button"
              className="page-fab users-fab"
              aria-label="Create user"
              whileTap={ACTION_BUTTON_PRESS}
              onClick={openCreateUserSheet}
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: CONTENT_START_DELAY + 0.42, duration: 0.32, ease: EASE_SOFT }}
            >
              <Plus size={20} weight="bold" />
            </m.button>
          </section>
        ) : activePage === 'PitchDeck' ? (
          <section className="pitchdeck-page" aria-label="Pitch deck viewer">
            <PageHeader
              title="Pitch Deck"
              subtitle="In-app viewer for the latest deck."
            />

            <div className="pitchdeck-toolbar">
              <a href={pitchDeckUrl} target="_blank" rel="noreferrer" className="viewer-link">
                Open in New Tab
              </a>
            </div>

            <div className="pdf-viewer-shell">
              <iframe
                title={`${APP_NAME} Pitch Deck`}
                src={`${pitchDeckUrl}#view=FitH`}
                className="pdf-viewer-frame"
              />
            </div>
          </section>
        ) : activePage === 'Links' ? (
          <div className="playground-page">
            <PageHeader
              title="Links"
              subtitle="Reference links for experiments, prototypes, previous iterations, and the latest pitch deck."
            />

            <m.div
              className="playground-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: CONTENT_START_DELAY + 0.2,
                  },
                },
              }}
            >
              {linksSectionLinks.map((link) => (
                link.page ? (
                  <m.button
                    key={link.page}
                    type="button"
                    className="playground-tile"
                    onClick={() => goToPage(link.page!)}
                    variants={{
                      hidden: { opacity: 0, y: 14, scale: 0.98 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.42, ease: EASE_SOFT },
                      },
                    }}
                  >
                    <h3>{link.title}</h3>
                    <p>{link.description}</p>
                  </m.button>
                ) : (
                  <m.a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="playground-tile"
                    variants={{
                      hidden: { opacity: 0, y: 14, scale: 0.98 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.42, ease: EASE_SOFT },
                      },
                    }}
                  >
                    <h3>{link.title}</h3>
                    <p>{link.description}</p>
                  </m.a>
                )
              ))}
            </m.div>
          </div>
        ) : activePage === 'Playground' ? (
          <section
            className={`playground-page ${previewModel ? 'playground-preview-active' : ''}`}
            aria-label="GLB model gallery"
          >
            {previewModel ? null : (
              <PageHeader
                title="Playground"
                subtitle={
                  <>
                    Drop a <code>.glb</code> anywhere in the overview to upload. Models are stored in the linked database.
                  </>
                }
              />
            )}

            <input
              ref={glbInputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              className="glb-file-input"
              disabled={isUploadingGlb}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void uploadGlbFile(file)
                event.currentTarget.value = ''
              }}
            />

            <section
              className={`glb-overview-dropzone ${isGlbDropActive ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="GLB overview drop zone"
              onDragOver={(event) => {
                event.preventDefault()
                setIsGlbDropActive(true)
              }}
              onDragEnter={(event) => {
                event.preventDefault()
                setIsGlbDropActive(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setIsGlbDropActive(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsGlbDropActive(false)
                const file = event.dataTransfer.files?.[0]
                if (file) void uploadGlbFile(file)
              }}
              onClick={() => {
                if (previewModel) return
                if (isUploadingGlb) return
                glbInputRef.current?.click()
              }}
              onKeyDown={(event) => {
                if (previewModel) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  if (!isUploadingGlb) glbInputRef.current?.click()
                }
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {previewModel ? (
                  <m.section
                    key={`preview-${previewModel.id}`}
                    layoutId={`glb-model-surface-${previewModel.id}`}
                    className="glb-preview-panel"
                    aria-label={`${previewModel.fileName} preview`}
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.28, ease: EASE_SOFT }}
                  >
                    <m.div
                      className="glb-preview-toolbar"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: 0.08, duration: 0.22, ease: EASE_SOFT }}
                    >
                      <button
                        type="button"
                        className="glb-fab"
                        aria-label="Back to model list"
                        onClick={(event) => {
                          event.stopPropagation()
                          closeGlbPreview()
                        }}
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <AnimatePresence initial={false}>
                        {previewHasAnimation ? (
                          <m.button
                            key="preview-animation-toggle"
                            type="button"
                            className="glb-fab"
                            aria-label={isPreviewAnimationPaused ? 'Resume animation' : 'Pause animation'}
                            onClick={(event) => {
                              event.stopPropagation()
                              togglePreviewAnimation()
                            }}
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.94 }}
                            transition={{ duration: 0.2, ease: EASE_SOFT }}
                          >
                            {isPreviewAnimationPaused ? <Play size={18} /> : <Pause size={18} />}
                          </m.button>
                        ) : null}
                      </AnimatePresence>
                    </m.div>
                    <m.div
                      className="glb-preview-frame-shell"
                      initial={{ opacity: 0, scale: 0.985 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.99 }}
                      transition={{ duration: 0.24, ease: EASE_SOFT }}
                    >
                      <iframe
                        ref={glbPreviewFrameRef}
                        title={`GLB Preview - ${previewModel.fileName}`}
                        src={apiUrl(`/glb/${previewModel.id}/preview`)}
                        className="glb-preview-frame"
                        onLoad={() => {
                          setPreviewHasAnimation(false)
                          setIsPreviewAnimationPaused(false)
                          postToGlbPreview({
                            type: PLAYGROUND_THEME_EVENT,
                            theme: effectiveTheme,
                          })
                          postToGlbPreview({
                            type: PLAYGROUND_ANIMATION_EVENT,
                            paused: isPreviewAnimationPaused,
                          })
                        }}
                      />
                    </m.div>
                  </m.section>
                ) : (
                  <m.div
                    key="gallery"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_SOFT }}
                  >
                  {glbError ? <p className="glb-error">{glbError}</p> : null}

                  <AnimatePresence mode="wait">
                    {isGlbLoading ? (
                      <m.div
                        key="glb-skeletons"
                        className="glb-gallery-grid glb-gallery-skeletons"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: EASE_SOFT }}
                      >
                        {Array.from({ length: 4 }, (_, index) => (
                          <div key={`glb-skeleton-${index}`} className="glb-model-card glb-model-skeleton" aria-hidden>
                            <span className="glb-skeleton-line glb-skeleton-line-title" />
                            <span className="glb-skeleton-line glb-skeleton-line-meta" />
                            <span className="glb-skeleton-line glb-skeleton-line-meta short" />
                            <div className="glb-skeleton-actions">
                              <span className="glb-skeleton-chip" />
                              <span className="glb-skeleton-chip" />
                              <span className="glb-skeleton-chip" />
                            </div>
                          </div>
                        ))}
                      </m.div>
                    ) : glbModels.length ? (
                      <m.div
                        key={`glb-gallery-loaded-${glbGalleryLoadToken}`}
                        className="glb-gallery-grid"
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0 }}
                        variants={{
                          hidden: {},
                          visible: {
                            transition: {
                              staggerChildren: 0.08,
                              delayChildren: 0.08,
                            },
                          },
                        }}
                      >
                        {glbModels.map((model) => (
                          <m.article
                            key={model.id}
                            layoutId={`glb-model-surface-${model.id}`}
                            className="glb-model-card"
                            variants={{
                              hidden: { opacity: 0, y: 14, scale: 0.98 },
                              visible: {
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                  duration: 0.42,
                                  ease: EASE_SOFT,
                                  scale: { type: 'spring', stiffness: 320, damping: 22 },
                                },
                              },
                            }}
                          >
                            <h3>{model.fileName}</h3>
                            <p>{formatFileSize(model.fileSize)}</p>
                            <p>{new Date(model.createdAt).toLocaleString()}</p>
                            <div className="glb-tile-actions">
                              <button
                                type="button"
                                className="glb-icon-btn glb-preview-btn"
                                aria-label={`Preview ${model.fileName}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openGlbPreview(model)
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <a
                                href={apiUrl(`/glb/${model.id}/download`)}
                                target="_blank"
                                rel="noreferrer"
                                className="glb-icon-btn glb-outline-btn"
                                aria-label={`Download ${model.fileName}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <DownloadSimple size={16} />
                              </a>
                              <button
                                type="button"
                                className="glb-icon-btn glb-outline-btn glb-delete-btn"
                                aria-label={`Delete ${model.fileName}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void deleteGlbFile(model.id, model.fileName)
                                }}
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </m.article>
                        ))}
                      </m.div>
                    ) : null}
                  </AnimatePresence>
                  {!isGlbLoading && !glbModels.length && !glbError ? (
                    <div className="empty-page">
                      <p>No GLB models uploaded yet.</p>
                    </div>
                  ) : null}
                  </m.div>
                )}
              </AnimatePresence>
            </section>
          </section>
        ) : (
          <div className="empty-page">
            <h2>Unknown Page</h2>
          </div>
        )}

        <SideSheet
          isOpen={Boolean(selectedIntegration || isCreatingIntegration)}
          sheetKey={isCreatingIntegration ? 'create-integration' : activeSheetIntegration?.id ?? 'create'}
          panelRef={sidesheetRef}
          ariaLabel="integration settings panel"
          eyebrow={isCreatingIntegration ? 'Add Integration' : 'Integration Settings'}
          title={activeSheetIntegration ? activeSheetIntegration.title : 'Choose Platform'}
          onClose={closeSidesheet}
        >
                <form className="sheet-form" onSubmit={onSaveSettings}>
                  {isCreatingIntegration && settingsSheetPage === 1 ? (
                    <div className="platform-selection">
                      <div className="platform-selection-copy">
                        <h4>Select integration platform</h4>
                        <p>Choose the provider first. The next page uses the same settings flow as existing connectors.</p>
                      </div>
                      <div className="platform-selection-grid">
                        {integrationTemplates.map((integration) => {
                          const logo = effectiveTheme === 'dark' && integration.darkLogo ? integration.darkLogo : integration.logo
                          const isActive = createIntegrationType === integration.type

                          return (
                            <button
                              key={integration.type}
                              type="button"
                              className={`platform-option ${isActive ? 'active' : ''}`}
                              onClick={() => setCreateIntegrationType(integration.type)}
                            >
                              <span className="platform-option-icon" aria-hidden>
                                <img src={`${assetBase}${logo}`} alt="" />
                              </span>
                              <span className="platform-option-body">
                                <strong>{integration.title}</strong>
                                <span>{integration.description}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="sheet-fields">
                      {visibleSettingsFields.map((field) => {
                        const fieldId = `${activeSheetIntegration?.id ?? 'new-integration'}-${field.key}`
                        const errorMessage = errors[field.key]?.message

                        return (
                          <label key={fieldId} htmlFor={fieldId}>
                            {field.label}
                            {field.required ? <span className="field-required">*</span> : null}
                            {field.input === 'textarea' ? (
                              <Textarea id={fieldId} placeholder={field.placeholder} rows={3} {...register(field.key)} />
                            ) : field.input === 'select' ? (
                              <Select id={fieldId} {...register(field.key)}>
                                {field.options?.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <Input id={fieldId} type={field.input} placeholder={field.placeholder} {...register(field.key)} />
                            )}
                            {errorMessage ? <span className="field-error">{String(errorMessage)}</span> : null}
                          </label>
                        )
                      })}
                    </div>
                  )}

                  <div className="sheet-form-footer">
                    <span className="sheet-page-label">
                      Page {settingsSheetPage} / {settingsSheetPageCount}
                    </span>
                    <div className="sheet-footer-actions">
                      {settingsSheetPage === 1 ? (
                        <>
                          <m.button type="button" className="sheet-nav-btn" whileTap={ACTION_BUTTON_PRESS} onClick={closeSidesheet}>
                            Cancel
                          </m.button>
                          <m.button
                            type="button"
                            className="sheet-nav-btn"
                            whileTap={
                              settingsSheetPage >= settingsSheetPageCount || (isCreatingIntegration && !createIntegrationType)
                                ? undefined
                                : ACTION_BUTTON_PRESS
                            }
                            disabled={settingsSheetPage >= settingsSheetPageCount || (isCreatingIntegration && !createIntegrationType)}
                            onClick={() => setSettingsSheetPage((current) => Math.min(settingsSheetPageCount, current + 1))}
                          >
                            Next
                          </m.button>
                        </>
                      ) : settingsSheetPage < settingsSheetPageCount ? (
                        <>
                          <m.button
                            type="button"
                            className="sheet-nav-btn"
                            whileTap={ACTION_BUTTON_PRESS}
                            onClick={() => setSettingsSheetPage((current) => Math.max(1, current - 1))}
                          >
                            Previous
                          </m.button>
                          <m.button
                            type="button"
                            className="sheet-nav-btn"
                            whileTap={ACTION_BUTTON_PRESS}
                            onClick={() => setSettingsSheetPage((current) => Math.min(settingsSheetPageCount, current + 1))}
                          >
                            Next
                          </m.button>
                        </>
                      ) : (
                        <>
                          <m.button
                            type="button"
                            className="sheet-nav-btn"
                            whileTap={ACTION_BUTTON_PRESS}
                            onClick={() => setSettingsSheetPage((current) => Math.max(1, current - 1))}
                          >
                            Previous
                          </m.button>
                          <m.button
                            type="submit"
                            className="save-button sheet-save-btn"
                            whileTap={isSaving ? undefined : ACTION_BUTTON_PRESS}
                            disabled={isSaving}
                          >
                            <GearSix size={16} className={isSaving ? 'spin' : undefined} />
                            {isSaving ? 'Saving...' : isCreatingIntegration ? 'Create Integration' : 'Save Changes'}
                          </m.button>
                        </>
                      )}
                    </div>
                  </div>
                </form>
        </SideSheet>

        <SideSheet
          isOpen={isUserSheetOpen}
          sheetKey={editingUserId ?? 'create-user'}
          panelRef={userSheetRef}
          ariaLabel="user editor panel"
          eyebrow={editingUserId ? 'Edit User' : 'Create User'}
          title={editingUserId ? 'Update Access' : 'New Access Record'}
          onClose={closeUserSheet}
        >
          <form
            className="sheet-form"
            onSubmit={(event) => {
              event.preventDefault()
              saveUserRecord()
            }}
          >
            <div className="sheet-fields">
              <label>
                Name
                <Input value={userDraft.name} onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Email
                <Input
                  type="email"
                  value={userDraft.email}
                  onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Team
                <Select
                  value={userDraft.team}
                  onChange={(event) => setUserDraft((current) => ({ ...current, team: event.target.value as TeamName }))}
                >
                  <option value="Platform">Platform</option>
                  <option value="Security">Security</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Leadership">Leadership</option>
                </Select>
              </label>
              <label>
                Role
                <Select
                  value={userDraft.role}
                  onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value as UserRole }))}
                >
                  <option value="owner">Owner</option>
                  <option value="platform_admin">Platform Admin</option>
                  <option value="security_reviewer">Security Reviewer</option>
                  <option value="compliance_auditor">Compliance Auditor</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </label>
              <label>
                SSO
                <Select
                  value={userDraft.sso}
                  onChange={(event) =>
                    setUserDraft((current) => ({ ...current, sso: event.target.value as UserRecord['sso'] }))
                  }
                >
                  <option value="enforced">Enforced</option>
                  <option value="optional">Optional</option>
                  <option value="break_glass">Break Glass</option>
                </Select>
              </label>
              <label className="sheet-inline-control">
                <input
                  type="checkbox"
                  checked={userDraft.canApproveProduction}
                  onChange={(event) =>
                    setUserDraft((current) => ({ ...current, canApproveProduction: event.target.checked }))
                  }
                />
                Can approve production
              </label>
            </div>

            <div className="sheet-form-footer">
              <span className="sheet-page-label">{editingUserId ? 'Editing existing user' : 'Create a new user record'}</span>
              <div className="sheet-footer-actions">
                <m.button
                  type="button"
                  className="sheet-nav-btn"
                  whileTap={isUserSaving ? undefined : ACTION_BUTTON_PRESS}
                  disabled={isUserSaving}
                  onClick={closeUserSheet}
                >
                  Cancel
                </m.button>
                <m.button
                  type="submit"
                  className="save-button sheet-save-btn"
                  whileTap={isUserSaving ? undefined : ACTION_BUTTON_PRESS}
                  disabled={isUserSaving}
                >
                  {isUserSaving ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                </m.button>
              </div>
            </div>
          </form>
        </SideSheet>

        <SideSheet
          isOpen={isHomeSummarySheetOpen}
          sheetKey="home-operational-summary"
          ariaLabel="operational summary details panel"
          eyebrow="Operational Summary"
          title="All Summary Items"
          onClose={() => setIsHomeSummarySheetOpen(false)}
        >
          <div className="detail-stack">
            <p>Full operational summary for the current dashboard view.</p>
            <ul className="detail-list">
              {operationalSummaryItems.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </SideSheet>

        <AnimatePresence initial={false}>
          {detailsIntegration ? (
            <>
              <m.button
                key={`details-backdrop-${detailsIntegration.id}`}
                type="button"
                className="sidesheet-backdrop"
                aria-label="Close integration details panel"
                onClick={() => setDetailsIntegration(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
              <m.aside
                key={`details-sheet-${detailsIntegration.id}`}
                className="settings-sidesheet detail-sidesheet"
                aria-label="Integration details panel"
                initial={{ x: 28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 28, opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <header className="sheet-header">
                  <div>
                    <p className="sheet-eyebrow">Integration Overview</p>
                    <h3>{detailsIntegration.title}</h3>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Close integration details"
                    onClick={() => setDetailsIntegration(null)}
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="detail-stack">
                  {detailSheetPage === 1 ? (
                    <>
                      <p>Integration type: {detailsIntegration.type.toUpperCase()}</p>
                      <p>Status: {enabledIntegrations[detailsIntegration.id] ? 'Connected' : 'Not connected'}</p>
                      <p>{integrationRuntimeInfo[detailsIntegration.type].lastConnectivityTest}</p>
                    </>
                  ) : (
                    <>
                      <p>Open the dedicated integration workspace to view full details and activity history.</p>
                      <m.button
                        type="button"
                        className="save-button"
                        whileTap={ACTION_BUTTON_PRESS}
                        onClick={() => {
                          setIntegrationPage(detailsIntegration)
                          setIntegrationDetailTab('details')
                          setDetailsIntegration(null)
                          goToPage('IntegrationDetail', detailsIntegration.id)
                        }}
                      >
                        Open Dedicated Page
                      </m.button>
                    </>
                  )}
                </div>

                <div className="sheet-pager">
                  <m.button
                    type="button"
                    className="sheet-nav-btn"
                    whileTap={detailSheetPage <= 1 ? undefined : ACTION_BUTTON_PRESS}
                    disabled={detailSheetPage <= 1}
                    onClick={() => setDetailSheetPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </m.button>
                  <span className="sheet-page-label">Page {detailSheetPage} / 2</span>
                  <m.button
                    type="button"
                    className="sheet-nav-btn"
                    whileTap={detailSheetPage >= 2 ? undefined : ACTION_BUTTON_PRESS}
                    disabled={detailSheetPage >= 2}
                    onClick={() => setDetailSheetPage((current) => Math.min(2, current + 1))}
                  >
                    Next
                  </m.button>
                </div>
              </m.aside>
            </>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {toast ? (
            <m.div
              key={`${toast.kind}-${toast.message}`}
              className={`toast ${toast.kind}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              role="status"
              aria-live="polite"
            >
              {toast.message}
            </m.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {uploadCookie ? (
            <m.div
              key={uploadCookie.fileName}
              className={`upload-cookie ${uploadCookie.progress >= 100 ? 'completed' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={
                uploadCookie.progress >= 100
                  ? {
                      opacity: 1,
                      y: 0,
                      scale: [1, 1.02, 1],
                      borderColor: [
                        'color-mix(in oklab, var(--text) 18%, transparent)',
                        'color-mix(in oklab, var(--color-success) 52%, transparent)',
                        'color-mix(in oklab, var(--color-success) 34%, transparent)',
                      ],
                    }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={{ opacity: 0, y: 10 }}
              transition={{
                duration: uploadCookie.progress >= 100 ? 0.42 : 0.2,
                ease: EASE_SOFT,
                times: uploadCookie.progress >= 100 ? [0, 0.45, 1] : undefined,
              }}
              role="status"
              aria-live="polite"
            >
              <strong>{uploadCookie.fileName}</strong>
              <span>{uploadCookie.progress >= 100 ? 'Upload complete' : `${uploadCookie.progress}% uploaded`}</span>
              <div className="upload-cookie-bar">
                <div className="upload-cookie-fill" style={{ width: `${uploadCookie.progress}%` }}>
                  <span className="upload-cookie-shimmer" aria-hidden />
                </div>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </section>
    </main>
  )
}
