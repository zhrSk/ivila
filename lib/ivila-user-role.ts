export type IvilaUserRole = 'admin' | 'agent'

type IvilaUserLike = {
  role?: string | null
  email?: string | null
  username?: string | null
}

/**
 * Old Payload installations can have the original e-mail admin without the
 * newer `role` / phone-username fields. New consultant accounts are created
 * with username=phone, so this legacy fallback does not apply to them.
 */
function isLegacyEmailAdmin(user: IvilaUserLike | null | undefined) {
  const email = typeof user?.email === 'string' ? user.email.trim() : ''
  const username = typeof user?.username === 'string' ? user.username.trim() : ''
  return Boolean(email && !username)
}

export function effectiveUserRole(user: IvilaUserLike | null | undefined): IvilaUserRole {
  if (isLegacyEmailAdmin(user)) return 'admin'
  if (user?.role === 'admin') return 'admin'
  return 'agent'
}

export function isEffectiveAdmin(user: IvilaUserLike | null | undefined) {
  return effectiveUserRole(user) === 'admin'
}
