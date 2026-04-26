'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type PairState = {
  me: {
    id: string
    display_name: string
    email: string
    avatar_color: string | null
    friend_id: string | null
  }
  friend: null | {
    id: string
    display_name: string
    email: string
    avatar_color: string | null
  }
  pairStatus: 'unpaired' | 'pending' | 'paired'
  outgoingPending?: {
    id: string
    to_user?: { display_name?: string; email?: string }
  } | null
  incomingPending?: {
    id: string
    from_user?: { display_name?: string; email?: string }
  } | null
}

export default function PairPage() {
  const [data, setData] = useState<PairState | null>(null)
  const [friendEmail, setFriendEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchPairState = useCallback(async () => {
    const res = await fetch('/api/pair', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error ?? 'Failed to load pair data')
    }
    return json as PairState
  }, [])

  const loadPairState = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextData = await fetchPairState()
      setData(nextData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pair data')
    } finally {
      setLoading(false)
    }
  }, [fetchPairState])

  useEffect(() => {
    const run = async () => {
      try {
        const nextData = await fetchPairState()
        setData(nextData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pair data')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [fetchPairState])

  const statusColor = useMemo(() => {
    if (!data) return 'bg-gray-100 text-gray-700'
    if (data.pairStatus === 'paired') return 'bg-green-100 text-green-700'
    if (data.pairStatus === 'pending') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-700'
  }, [data])

  const sendPairRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendEmail }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to send request')
      setSubmitting(false)
      return
    }

    setSuccess('Pair request sent.')
    setFriendEmail('')
    setSubmitting(false)
    await loadPairState()
  }

  const unpair = async () => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const res = await fetch('/api/pair', { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to unpair')
      setSubmitting(false)
      return
    }
    setSuccess('You are now unpaired.')
    setSubmitting(false)
    await loadPairState()
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <p className="text-sm text-gray-600">Loading pair data...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pair</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your Mutual connection.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">You are logged in as</h2>
        <p className="mt-2 text-lg font-semibold text-gray-900">{data.me.display_name}</p>
        <p className="text-sm text-gray-600">{data.me.email}</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pair Status</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColor}`}>
            {data.pairStatus}
          </span>
        </div>

        {data.friend ? (
          <div className="mt-5 rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Currently paired with</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{data.friend.display_name}</p>
            <p className="text-sm text-gray-600">{data.friend.email}</p>
            <button
              type="button"
              onClick={unpair}
              disabled={submitting}
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Unpair
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {data.outgoingPending && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Pending request sent to {data.outgoingPending.to_user?.display_name ?? data.outgoingPending.to_user?.email ?? 'your friend'}.
              </div>
            )}

            {data.incomingPending && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                You have a pending request from {data.incomingPending.from_user?.display_name ?? data.incomingPending.from_user?.email}.
                Accept it from your dashboard banner.
              </div>
            )}

            {!data.outgoingPending && (
              <form onSubmit={sendPairRequest} className="space-y-3">
                <label htmlFor="friendEmail" className="block text-sm font-medium text-gray-700">
                  Friend&apos;s email
                </label>
                <input
                  id="friendEmail"
                  type="email"
                  required
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="friend@example.com"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  Send Pair Request
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>}
    </div>
  )
}
