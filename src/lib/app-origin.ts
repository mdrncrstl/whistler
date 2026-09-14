export const productionAppOrigin = 'https://masterdeck.app'
export const deckBasePath = '/deck'
// Keep the old export name for internal compatibility while the public route is /deck.
export const workspaceBasePath = deckBasePath
export const legacyWorkspaceBasePath = '/app'
export const previousWorkspaceBasePath = '/workspace'

const legacyWorkspaceBasePaths = [legacyWorkspaceBasePath, previousWorkspaceBasePath]

type AppLocation = Pick<Location, 'origin' | 'hostname' | 'pathname' | 'search' | 'hash'>
type WorkspaceLocation = Pick<Location, 'pathname' | 'search' | 'hash'>

function matchingLegacyWorkspaceBasePath(pathname: string) {
  return legacyWorkspaceBasePaths.find((basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`))
}

export function canonicalWorkspacePathname(pathname: string) {
  const legacyBasePath = matchingLegacyWorkspaceBasePath(pathname)
  return legacyBasePath ? `${deckBasePath}${pathname.slice(legacyBasePath.length)}` : pathname
}

export function legacyWorkspaceDestination(location: WorkspaceLocation) {
  return `${canonicalWorkspacePathname(location.pathname)}${location.search}${location.hash}`
}

const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]'])

export function canonicalAppOrigin(location: Pick<Location, 'origin' | 'hostname'> = window.location) {
  return localHostnames.has(location.hostname.toLowerCase()) ? location.origin : productionAppOrigin
}

export function canonicalAppUrl(path = '/', location: Pick<Location, 'origin' | 'hostname'> = window.location) {
  const normalizedPath = canonicalWorkspacePathname(path.startsWith('/') ? path : `/${path}`)
  return `${canonicalAppOrigin(location)}${normalizedPath}`
}

export function canonicalHostRedirect(location: AppLocation) {
  const hostname = location.hostname.toLowerCase()
  const isCanonicalHost = location.origin === productionAppOrigin
  const isLocalHost = localHostnames.has(hostname)
  const isVercelHost = hostname.endsWith('.vercel.app')
  const isLegacyCustomHost = hostname === 'www.masterdeck.app'

  if (isCanonicalHost || isLocalHost || (!isVercelHost && !isLegacyCustomHost)) return null
  return `${productionAppOrigin}${canonicalWorkspacePathname(location.pathname)}${location.search}${location.hash}`
}

export function redirectToCanonicalHost(location: AppLocation = window.location) {
  const destination = canonicalHostRedirect(location)
  if (!destination) return false
  window.location.replace(destination)
  return true
}
