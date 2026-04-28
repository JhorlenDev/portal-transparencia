const cronStateKey = Symbol.for('portal-transparencia.acordar-cron')

interface CronState {
  started: boolean
}

const globalCronState = globalThis as typeof globalThis & { [cronStateKey]?: CronState }

if (!globalCronState[cronStateKey]) {
  globalCronState[cronStateKey] = { started: false }
}

const state = globalCronState[cronStateKey]
const enabled = process.env.ACORDAR_CRON_ENABLED === 'true'
const intervalMinutes = Number(process.env.ACORDAR_CRON_MINUTES || '0')
const webhookUrl = process.env.ACORDAR_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL

if (enabled && !state.started && Number.isFinite(intervalMinutes) && intervalMinutes > 0 && webhookUrl) {
  state.started = true

  const targetUrl = webhookUrl.endsWith('/api/acordar/webhook')
    ? webhookUrl
    : `${webhookUrl.replace(/\/$/, '')}/api/acordar/webhook`

  const run = async () => {
    try {
      const response = await fetch(targetUrl, { cache: 'no-store' })
      if (!response.ok) {
        console.error(`Acordar cron failed with status ${response.status}`)
      }
    } catch (error) {
      console.error('Acordar cron failed:', error)
    }
  }

  setInterval(run, intervalMinutes * 60 * 1000)
  console.log(`Acordar cron interno ativo a cada ${intervalMinutes} minuto(s): ${targetUrl}`)
}

export {}
