import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, PartyPopper, Plus, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return null

  // Get current user profile
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, friend_id')
    .eq('id', session.user.id)
    .single()

  // Fetch Pending Events
  const { data: pendingEvents } = await supabase
    .from('proposed_events')
    .select('*')
    .eq('status', 'pending')
    .order('proposed_start', { ascending: true })

  // Intersections will be populated via the API route built in Phase 6.
  // Using an empty array to show the empty state for now.
  const upcomingIntersections: any[] = [] 

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good to see you, {profile?.display_name} 👋
        </h1>
        <p className="mt-1 text-gray-500">
          Here's what's happening with your shared plans.
        </p>
      </div>

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
