import { AirplaneTilt } from '@phosphor-icons/react/AirplaneTilt'
import { Archive } from '@phosphor-icons/react/Archive'
import { GameController } from '@phosphor-icons/react/GameController'
import { GearSix } from '@phosphor-icons/react/GearSix'
import { House } from '@phosphor-icons/react/House'
import { Play } from '@phosphor-icons/react/Play'
import { PlugCharging } from '@phosphor-icons/react/PlugCharging'
import type {
  GlobalPolicyEngine,
  Integration,
  Page,
  ReportPreferences,
  ThemeMode,
} from './types'

export const APP_NAME = 'House of Tobias'
export const THEME_STORAGE_KEY = 'house-of-tobias.theme'
export const THEME_MODE_ORDER: ThemeMode[] = ['light', 'dark', 'auto']
export const INTEGRATION_SETTINGS_STORAGE_KEY = 'house-of-tobias.integration.settings'
export const ENABLED_INTEGRATIONS_STORAGE_KEY = 'house-of-tobias.integration.enabled'
export const CUSTOM_INTEGRATIONS_STORAGE_KEY = 'house-of-tobias.integration.custom'
export const POLICY_ENGINE_STORAGE_KEY = 'house-of-tobias.policy.engine'
export const LIFECYCLE_STORAGE_KEY = 'house-of-tobias.integration.lifecycle'
export const APPROVALS_STORAGE_KEY = 'house-of-tobias.integration.approvals'
export const HEALTH_STORAGE_KEY = 'house-of-tobias.integration.health'
export const AUDIT_STORAGE_KEY = 'house-of-tobias.audit.log'
export const REPORT_PREFS_STORAGE_KEY = 'house-of-tobias.reporting.preferences'
export const LIBRARY_SECTION_COLLAPSE_STORAGE_KEY = 'house-of-tobias.library.sections.collapsed'
export const MENU_ANIMATION_DURATION = 0.46
export const CONTENT_START_DELAY = 0.62
export const EASE_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const ACTION_BUTTON_PRESS = { scale: 0.975, y: 1 }
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
export const API_ORIGIN = new URL(
  API_BASE_URL,
  typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
).origin
export const GLB_PREVIEW_QUERY_PARAM = 'glb'
export const PLAYGROUND_ANIMATION_AVAILABILITY_EVENT = 'house-of-tobias-playground-animation-availability'
export const PLAYGROUND_ANIMATION_EVENT = 'house-of-tobias-playground-animation'
export const PLAYGROUND_THEME_EVENT = 'house-of-tobias-playground-theme'

export const mainNavigationItems = [
  {
    label: 'Home' as const,
    description: 'Operational dashboard',
    icon: House,
  },
  {
    label: 'Projects' as const,
    description: 'Project collection',
    icon: Archive,
  },
  {
    label: 'Games' as const,
    description: 'Game collection',
    icon: GameController,
  },
  {
    label: 'Videos' as const,
    description: 'YouTube collection',
    icon: Play,
  },
  {
    label: 'Flights' as const,
    description: 'Flight history and map',
    icon: AirplaneTilt,
  },
  {
    label: 'Integrations' as const,
    description: 'Link with cloud systems',
    icon: PlugCharging,
  },
]

export const bottomNavigationItems = [{ label: 'Admin' as const, description: 'Policy, lifecycle, audit', icon: GearSix }]

export const integrationTemplates: Integration[] = [
  { id: 'aikido', type: 'aikido', title: 'Aikido Security', description: 'API Integration', logo: 'aikido.png' },
  { id: 'aws', type: 'aws', title: 'AWS Cloud', description: 'API Integration', logo: 'aws.png', darkLogo: 'aws_light.png' },
  { id: 'slack', type: 'gcp', title: 'Google Cloud', description: 'API Integration', logo: 'google.png' },
  { id: 'azure', type: 'azure', title: 'Azure Cloud', description: 'API Integration', logo: 'azure.png' },
  { id: 'kubernetes', type: 'kubernetes', title: 'Kubernetes', description: 'API Integration', logo: 'kubernetes.png' },
]

export const defaultLibraryItemDraft = {
  name: '',
  url: '',
  imageUrl: '',
  description: '',
  rating: '',
  timestamp: '',
  groupId: '',
}

export const defaultFlightDraft = {
  flightDate: '',
  flightNumber: '',
  fromAirport: '',
  toAirport: '',
  distance: '',
  departureTime: '',
  arrivalTime: '',
  airline: '',
  aircraft: '',
  notes: '',
}

export const defaultPolicyEngine: GlobalPolicyEngine = {
  mandatoryTagsEnabled: true,
  mandatoryTag: 'security-reviewed',
  allowedEnvironments: ['prod', 'staging', 'dev', 'test'],
  allowedRegions: ['eu-west-1', 'eu-central-1', 'us-east-1'],
  allowedAuthMethods: {
    kubernetes: ['kubeconfig', 'service_account_token', 'client_certificate'],
    gcp: ['service_account_key', 'workload_identity_federation'],
    azure: ['client_secret', 'client_certificate'],
    aikido: ['api_token'],
    aws: ['iam_role', 'access_key'],
  },
}

export const defaultReportPreferences: ReportPreferences = {
  schedule: 'weekly',
  redaction: 'pii',
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function getPageFromPath(pathname: string): { page: Page; integrationId?: string } {
  const normalizedPath = normalizePath(pathname)
  if (normalizedPath === '/' || normalizedPath === '/home') return { page: 'Home' }
  if (normalizedPath === '/projects') return { page: 'Projects' }
  if (normalizedPath === '/games') return { page: 'Games' }
  if (normalizedPath === '/videos') return { page: 'Videos' }
  if (normalizedPath === '/flights') return { page: 'Flights' }
  if (normalizedPath === '/integrations') return { page: 'Integrations' }
  if (normalizedPath === '/admin') return { page: 'Admin' }
  if (normalizedPath === '/pitchdeck') return { page: 'PitchDeck' }
  if (normalizedPath.startsWith('/integrations/')) {
    return {
      page: 'IntegrationDetail',
      integrationId: decodeURIComponent(normalizedPath.replace('/integrations/', '')),
    }
  }
  return { page: 'Home' }
}

export function getPathFromPage(page: Page, integrationId?: string): string {
  if (page === 'Home') return '/home'
  if (page === 'Projects') return '/projects'
  if (page === 'Games') return '/games'
  if (page === 'Videos') return '/videos'
  if (page === 'Flights') return '/flights'
  if (page === 'Integrations') return '/integrations'
  if (page === 'Admin') return '/admin'
  if (page === 'PitchDeck') return '/pitchdeck'
  if (page === 'IntegrationDetail' && integrationId) return `/integrations/${encodeURIComponent(integrationId)}`
  return '/integrations'
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function getAutoThemeForTime(now: Date): Exclude<ThemeMode, 'auto'> {
  const hour = now.getHours()
  return hour >= 7 && hour < 19 ? 'light' : 'dark'
}
