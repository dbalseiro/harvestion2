import { useEffect, useState } from 'react'
import { HARVEST_STORAGE_KEY, type HarvestSettings, type MessageResponse } from '@/lib/harvest'

function getChromeStorage() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    throw new Error('chrome.storage API is not available. Make sure the extension has storage permission.')
  }
  return chrome.storage.local
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TestState = 'idle' | 'testing' | 'ok' | 'error'

export default function App() {
  const [accountId, setAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [testState, setTestState] = useState<TestState>('idle')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const storage = getChromeStorage()
        const stored = await storage.get(HARVEST_STORAGE_KEY)
        const settings = stored[HARVEST_STORAGE_KEY] as HarvestSettings | undefined
        if (!settings) {
          return
        }

        setAccountId(settings.accountId)
        setAccessToken(settings.accessToken)
      } catch {
        // Storage API might not be fully available on initial load
      }
    }

    void load()
  }, [])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!accountId.trim() || !accessToken.trim()) {
      setSaveState('error')
      setFeedback('Both Harvest Account ID and Personal Access Token are required.')
      return
    }

    try {
      setSaveState('saving')
      setFeedback('')

      const storage = getChromeStorage()

      const payload: HarvestSettings = {
        accountId: accountId.trim(),
        accessToken: accessToken.trim(),
      }

      await storage.set({
        [HARVEST_STORAGE_KEY]: payload,
      })

      setSaveState('saved')
      setFeedback('Settings saved to extension local storage.')
    } catch (error) {
      setSaveState('error')
      setFeedback(error instanceof Error ? error.message : 'Failed to save settings.')
    }
  }

  const handleTestConnection = async () => {
    if (!accountId.trim() || !accessToken.trim()) {
      setTestState('error')
      setFeedback('Save valid credentials first, then test the Harvest connection.')
      return
    }

    setTestState('testing')
    setFeedback('')

    const response = (await chrome.runtime.sendMessage({
      type: 'harvest:getProjects',
    })) as MessageResponse<Array<{ id: number }>>

    if (!response.ok) {
      setTestState('error')
      setFeedback(response.error)
      return
    }

    const projectList = response.data

    setTestState('ok')
    setFeedback(`Connected successfully. Found ${projectList.length} project(s).`)
  }

  const saveButtonLabel = saveState === 'saving' ? 'Saving...' : 'Save Settings'
  const testButtonLabel = testState === 'testing' ? 'Testing...' : 'Test Connection'

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 text-stone-900">
      <section className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[0_26px_65px_-30px_rgba(56,39,8,0.5)]">
        <header className="border-b border-black/10 bg-gradient-to-r from-amber-200/60 via-orange-100 to-emerald-100 px-7 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">Harvestion</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Integration Settings</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-700">
            Add your Harvest credentials once. The popup will then load real projects and project-specific tasks.
          </p>
        </header>

        <form className="space-y-5 px-7 py-6" onSubmit={handleSave}>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Harvest Account ID</span>
            <input
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              placeholder="e.g. 123456"
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Personal Access Token</span>
            <input
              type="password"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="Paste your Harvest token"
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />
            <p className="text-xs text-stone-500">
              Token is stored in chrome.storage.local on this browser profile.
            </p>
          </label>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={saveState === 'saving'}
              className="rounded-xl border border-orange-500 bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saveButtonLabel}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testState === 'testing' || saveState === 'saving'}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {testButtonLabel}
            </button>
          </div>

          {feedback && (
            <p
              className={`rounded-xl border px-3.5 py-2.5 text-sm ${
                saveState === 'error' || testState === 'error'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              }`}
            >
              {feedback}
            </p>
          )}
        </form>
      </section>
    </main>
  )
}
