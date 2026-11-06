export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/acordar-cron')

    const { iniciarAgendador } = await import('./lib/backup/scheduler')
    iniciarAgendador()

    const { iniciarAgendadorFiorilli } = await import('./lib/fiorilli/agendador')
    iniciarAgendadorFiorilli()
  }
}
