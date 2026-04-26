'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null)
  const [friendEmail, setFriendEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; isShareLink?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Fetch user profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, display_name, email, friend_id')
        .eq('id', session.user.id)
        .single()

      if (error || !profile) {
        router.push('/login')
        return
      }

      // If already paired, go to dashboard
      if (profile.friend_id) {
        router.push('/dashboard')
        return
      }

      setUser(profile)
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)
    setMessage(null)
    setCopied(false)

    // 1. Query users table for friend's email
    const { data: friend, error: friendError } = await supabase
      .from('users')
      .select('id, friend_id')
      .eq('email', friendEmail)
      .single()

    if (friendError || !friend) {
      setMessage({
        text: "Your friend hasn't signed up yet. Share this link:",
        isShareLink: true,
      })
      setSubmitting(false)
      return
    }

    if (friend.friend_id) {
      setError("This user is already paired with someone else.")
      setSubmitting(false)
      return
    }

    if (friend.id === user.id) {
      setError("You cannot pair with yourself.")
      setSubmitting(false)
      return
    }

    // 2. UPDATE both rows
    // Update current user
    const { error: updateSelfError } = await supabase
      .from('users')
      .update({ friend_id: friend.id })
      .eq('id', user.id)

    if (updateSelfError) {
      setError(updateSelfError.message)
      setSubmitting(false)
      return
    }

    // Update friend
    const { error: updateFriendError } = await supabase
      .from('users')
      .update({ friend_id: user.id })
      .eq('id', friend.id)

    if (updateFriendError) {
      // Revert self update if friend update fails
      await supabase.from('users').update({ friend_id: null }).eq('id', user.id)
      setError(updateFriendError.message)
      setSubmitting(false)
      return
    }

    // Redirect to dashboard
    router.push('/dashboard')
    router.refresh()
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/signup`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Welcome, {user.display_name}!</h2>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
          <p className="mt-4 text-gray-600">
            Mutuals is built for two. To get started, pair your account with your friend.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="friend-email" className="block text-sm font-medium text-gray-700">
              Friend's Email Address
            </label>
            <div className="mt-2">
              <input
                id="friend-email"
                name="friendEmail"
                type="email"
                required
                className="relative block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Enter their email"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-blue-800 bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
              <p>{message.text}</p>
              {message.isShareLink && (
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup`}
                    className="flex-1 rounded-md border-0 py-1.5 px-2 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Pairing...' : 'Connect Accounts'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
