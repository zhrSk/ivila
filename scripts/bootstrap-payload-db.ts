/**
 * One-time Vercel/Neon bootstrap for a brand-new ivila database.
 *
 * Payload's Postgres adapter only performs Drizzle schema push when
 * NODE_ENV !== 'production'. We opt into that behavior explicitly and only
 * when IVILA_BOOTSTRAP_SCHEMA=1 is present in the build environment.
 *
 * IMPORTANT: remove/disable IVILA_BOOTSTRAP_SCHEMA after the first successful
 * deployment. Future schema changes should use committed migrations.
 */

const enabled = process.env.IVILA_BOOTSTRAP_SCHEMA === '1'

if (!enabled) {
  console.log('[ivila bootstrap] skipped (IVILA_BOOTSTRAP_SCHEMA is not 1)')
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  console.error('[ivila bootstrap] DATABASE_URL is missing')
  process.exit(1)
}

if (!process.env.PAYLOAD_SECRET) {
  console.error('[ivila bootstrap] PAYLOAD_SECRET is missing')
  process.exit(1)
}

// This process is dedicated to bootstrap only. Changing NODE_ENV here does not
// affect the parent npm/Vercel build process that runs Next.js afterwards.
process.env.NODE_ENV = 'development'
delete process.env.PAYLOAD_MIGRATING

try {
  const [{ getPayload }, configModule] = await Promise.all([
    import('payload'),
    import('../payload.config'),
  ])

  const payload = await getPayload({ config: configModule.default })

  // If initialization returned, the Postgres adapter has completed its dev
  // schema push. Run a real query as a final verification.
  await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  console.log('[ivila bootstrap] Neon/Payload schema is ready')
  process.exit(0)
} catch (error) {
  console.error('[ivila bootstrap] failed')
  console.error(error)
  process.exit(1)
}
