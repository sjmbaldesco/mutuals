'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type IncomingRequest = {
  id: string
  from_user?: {
    display_name?: string
    email?: string
  }
}

export function PairRequestBanner({ request }: { request: IncomingRequest }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (action: 'accept' | 'decline') => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/pair-requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Action failed')
      setLoading(false)
      return
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm text-blue-900">
        Pair Request from{' '}
        <span className="font-semibold">
          {request.from_user?.display_name ?? request.from_user?.email ?? 'a user'}
        </span>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => act('accept')}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => act('decline')}
          disabled={loading}
          className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}
