import type { ReactNode, Ref } from 'react'
import type { Variants } from 'framer-motion'

export type Page =
  | 'Home'
  | 'Projects'
  | 'Games'
  | 'Videos'
  | 'Flights'
  | 'Integrations'
  | 'Admin'
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

export type LibraryItemKind = 'projects' | 'games' | 'videos'

export type LibraryGroupRecord = {
  id: string
  name: string
}

export type LibraryItemRecord = {
  id: string
  name: string
  url: string
  imageUrl: string | null
  description: string | null
  rating: number
  timestamp: string
  groupId: string | null
  groupName: string | null
}

export type LibraryItemDraft = {
  name: string
  url: string
  imageUrl: string
  description: string
  rating: string
  timestamp: string
  groupId: string
}

export type LibraryGroupDraft = {
  name: string
}

export type LibraryGroupListResponse = { error?: string; groups?: LibraryGroupRecord[] }
export type LibraryGroupResponse = { error?: string; group?: LibraryGroupRecord }
export type LibraryItemListResponse = { error?: string; items?: LibraryItemRecord[] }
export type LibraryItemResponse = { error?: string; item?: LibraryItemRecord }

export type FlightRecord = {
  id: string
  flightDate: string | null
  flightNumber: string | null
  fromAirport: string | null
  toAirport: string | null
  distance: number | null
  departureTime: string | null
  arrivalTime: string | null
  airline: string | null
  aircraft: string | null
  notes: string | null
  fromAirportResolvedName: string | null
  fromAirportLatitude: number | null
  fromAirportLongitude: number | null
  toAirportResolvedName: string | null
  toAirportLatitude: number | null
  toAirportLongitude: number | null
}

export type FlightDraft = {
  flightDate: string
  flightNumber: string
  fromAirport: string
  toAirport: string
  distance: string
  departureTime: string
  arrivalTime: string
  airline: string
  aircraft: string
  notes: string
}

export type FlightListResponse = { error?: string; flights?: FlightRecord[] }
export type FlightResponse = { error?: string; flight?: FlightRecord }
export type ResolveFlightAirportsResponse = { error?: string; ok?: boolean; resolved?: number }
export type HomeLibraryStatsResponse = {
  error?: string
  totalBooks?: number
  booksRead?: number
  physicalBooks?: number
  digitalBooks?: number
}

export type PanelCardProps = {
  icon: ReactNode
  title: string
  children: ReactNode
  className?: string
  variants?: Variants
  subtitle?: ReactNode
  delay?: number
}
