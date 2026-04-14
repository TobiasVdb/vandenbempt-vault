import type { ReactNode, Ref } from 'react'
import type { Variants } from 'framer-motion'

export type Page =
  | 'Home'
  | 'Projects'
  | 'Games'
  | 'Integrations'
  | 'Admin'
  | 'Users'
  | 'Links'
  | 'Playground'
  | 'PitchDeck'
  | 'IntegrationDetail'
export type IntegrationType = 'kubernetes' | 'gcp' | 'azure' | 'aikido' | 'aws'
export type ThemeMode = 'light' | 'dark' | 'auto'
export type IntegrationDetailTab = 'details' | 'topology' | 'findings' | 'identities' | 'changes' | 'actions' | 'activity'
export type IntegrationLifecycleState = 'draft' | 'pending_approval' | 'active' | 'degraded' | 'disabled' | 'rotated' | 'archived'

export type IntegrationField = {
  key: string
  label: string
  input: 'text' | 'password' | 'textarea' | 'select'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

export type Integration = {
  id: string
  type: IntegrationType
  title: string
  description: string
  logo: string
  darkLogo?: string
}

export type LinkTile = {
  title: string
  description: string
  url?: string
  page?: Extract<Page, 'PitchDeck'>
}

export type GlbModelRecord = {
  id: string
  fileName: string
  fileSize: number
  createdAt: string
}

export type UploadCookieState = {
  fileName: string
  progress: number
}

export type IntegrationTileFeedback = {
  integrationId: string
  mode: 'enabled' | 'disabled'
  token: number
} | null

export type IntegrationSettingsMap = Record<string, Record<string, string>>
export type ToastState = { kind: 'success' | 'error'; message: string } | null

export type IntegrationRuntimeInfo = {
  connectivity: 'passing' | 'degraded' | 'failing'
  lastConnectivityTest: string
  currentData: string[]
  townPageUrl: string
}

export type ConnectivityHealth = {
  connectivity: 'passing' | 'degraded' | 'failing'
  lastSyncAt: string
  latencyMs: number
  quotaIssue: boolean
  authFailure: boolean
}

export type GlobalPolicyEngine = {
  mandatoryTagsEnabled: boolean
  mandatoryTag: string
  allowedEnvironments: Array<'prod' | 'staging' | 'dev' | 'test'>
  allowedRegions: string[]
  allowedAuthMethods: Record<IntegrationType, string[]>
}

export type ReportPreferences = {
  schedule: 'daily' | 'weekly' | 'monthly'
  redaction: 'none' | 'pii' | 'full'
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type AuditEntry = {
  id: string
  at: string
  actor: string
  action: string
  integrationId?: string
  before?: string
  after?: string
}

export type TeamName = 'Platform' | 'Security' | 'Compliance' | 'Leadership'
export type UserRole = 'owner' | 'platform_admin' | 'security_reviewer' | 'compliance_auditor' | 'viewer'

export type UserRecord = {
  id: string
  name: string
  email: string
  team: TeamName
  role: UserRole
  lastActivityAt: string
  sso: 'enforced' | 'optional' | 'break_glass'
  canApproveProduction: boolean
}

export type UserDraft = {
  name: string
  email: string
  team: TeamName
  role: UserRole
  sso: UserRecord['sso']
  canApproveProduction: boolean
}

export type SideSheetProps = {
  isOpen: boolean
  sheetKey: string
  ariaLabel: string
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  panelRef?: Ref<HTMLElement>
}

export type UserDirectorySortKey = 'name' | 'email' | 'team' | 'role' | 'lastActivityAt'
export type WorkspaceUserListResponse = { error?: string; users?: UserRecord[] }
export type WorkspaceUserResponse = { error?: string; user?: UserRecord }

export type LibraryItemKind = 'projects' | 'games'

export type LibraryItemRecord = {
  id: string
  name: string
  url: string
  imageUrl: string | null
  description: string | null
  rating: number
  timestamp: string
}

export type LibraryItemDraft = {
  name: string
  url: string
  imageUrl: string
  description: string
  rating: string
  timestamp: string
}

export type LibraryItemListResponse = { error?: string; items?: LibraryItemRecord[] }
export type LibraryItemResponse = { error?: string; item?: LibraryItemRecord }

export type PanelCardProps = {
  icon: ReactNode
  title: string
  children: ReactNode
  className?: string
  variants?: Variants
  subtitle?: ReactNode
  delay?: number
}
