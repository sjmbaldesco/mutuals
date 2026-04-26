import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, PartyPopper, Plus, Clock } from 'lucide-react'
import { PairRequestBanner } from './pair-request-banner'

type IntersectionWindow = {
  start_time: string
  end_time: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return null

  // Get current user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, display_name, friend_id, avatar_color')
    .eq('id', session.user.id)
    .single()

  const { data: friendProfile } = profile?.friend_id
    ? await supabase
        .from('users')
        .select('id, display_name, avatar_color')
        .eq('id', profile.friend_id)
        .single()
    : { data: null as null }

  // Fetch Pending Events
  const { data: pendingEvents } = await supabase
    .from('proposed_events')
    .select('*')
    .eq('status', 'pending')
    .order('proposed_start', { ascending: true })

  const { data: incomingPairRequest } = await supabase
    .from('pair_requests')
    .select('id, from_user:users!pair_requests_from_user_id_fkey(display_name, email)')
    .eq('to_user_id', session.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const normalizedIncomingPairRequest = incomingPairRequest
    ? {
        ...incomingPairRequest,
        from_user: Array.isArray(incomingPairRequest.from_user)
          ? incomingPairRequest.from_user[0]
          : incomingPairRequest.from_user,
      }
    : null

  const { count: hasPendingPairRequestCount } = await supabase
    .from('pair_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`)

  const pairStatus: 'paired' | 'pending' | 'unpaired' = profile?.friend_id
    ? 'paired'
    : (hasPendingPairRequestCount ?? 0) > 0
      ? 'pending'
      : 'unpaired'

  const { data: myInProgressTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, status')
    .eq('user_id', session.user.id)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(3)

  const { count: friendInProgressCount } = profile?.friend_id
    ? await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.friend_id)
        .eq('status', 'in_progress')
    : { count: 0 as number | null }

  // Intersections will be populated via the API route built in Phase 6.
  // Using an empty array to show the empty state for now.
  const upcomingIntersections: IntersectionWindow[] = []

  return (
    <div className="space-y-8">
      {!profile?.friend_id && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            You&apos;re not paired with anyone yet.{' '}
            <Link href="/pair" className="font-semibold underline underline-offset-2">
              Find your Mutual →
            </Link>
          </p>
        </section>
      )}

      {normalizedIncomingPairRequest && <PairRequestBanner request={normalizedIncomingPairRequest} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good to see you, {profile?.display_name} 👋
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening with your shared plans.
        </p>
      </div>

      {friendProfile && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full text-white font-semibold flex items-center justify-center"
                style={{ backgroundColor: friendProfile.avatar_color ?? '#7C3AED' }}
              >
                {friendProfile.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-gray-500">Your Mutual</p>
                <p className="text-lg font-semibold text-gray-900">{friendProfile.display_name}</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                pairStatus === 'paired'
                  ? 'bg-green-100 text-green-700'
                  : pairStatus === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {pairStatus}
            </span>
          </div>
          <Link
            href="/tasks"
            className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View their tasks →
          </Link>
        </section>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Task Snapshot</h2>
          <Link href="/tasks" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            View all tasks →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-900">Your In Progress</p>
            <div className="mt-2 space-y-2">
              {(myInProgressTasks ?? []).length > 0 ? (
                myInProgressTasks?.map((task) => (
                  <div key={task.id} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.due_date ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : 'No due date'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No tasks in progress.</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-900">
              {friendProfile ? `${friendProfile.display_name}: ${(friendInProgressCount ?? 0).toString()} tasks in progress` : 'Your Mutual: 0 tasks in progress'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {friendProfile
                ? 'Open Tasks to view their full board.'
                : 'Pair with a Mutual to see their task activity.'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Shared Windows */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              Upcoming Shared Windows
            </h2>
          </div>

          {upcomingIntersections.length > 0 ? (
            <div className="space-y-4">
              {upcomingIntersections.slice(0, 3).map((window, i) => (
                <div key={i} className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-lg">
                  <Clock className="w-4 h-4 mr-3 text-blue-500" />
                  <span className="font-medium text-sm">
                    {new Date(window.start_time).toLocaleString()} - {new Date(window.end_time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              <Link 
                href="/calendar"
                className="block text-center text-sm font-medium text-blue-600 hover:text-blue-500 mt-4"
              >
                View full calendar →
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-4">No shared free time found.</p>
              <Link
                href="/calendar"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Availability
              </Link>
            </div>
          )}
        </section>

        {/* Pending Events */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <PartyPopper className="w-5 h-5 mr-2 text-purple-500" />
              Pending Events
            </h2>
          </div>

          {pendingEvents && pendingEvents.length > 0 ? (
            <div className="space-y-4">
              {pendingEvents.map((event) => (
                <div key={event.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-gray-50">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {new Date(event.proposed_start).toLocaleDateString()}
                    </span>
                    <span>
                      ${event.estimated_cost} ({event.cost_type.replace('_', ' ')})
                    </span>
                  </div>
                  <Link 
                    href={`/events/${event.id}`}
                    className="mt-3 inline-block text-sm font-medium text-purple-600 hover:text-purple-500"
                  >
                    Review Proposal →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <PartyPopper className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-4">No pending event proposals.</p>
              <Link
                href="/events"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Propose an Event
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
