'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, PartyPopper, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [costType, setCostType] = useState<'per_person' | 'total'>('total')
  const [proposedStart, setProposedStart] = useState('')
  const [proposedEnd, setProposedEnd] = useState('')

  const fetchEvents = async () => {
    const res = await fetch('/api/events')
    if (res.ok) {
      setEvents(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        estimated_cost: estimatedCost,
        cost_type: costType,
        proposed_start: new Date(proposedStart).toISOString(),
        proposed_end: new Date(proposedEnd).toISOString(),
      })
    })

    if (res.ok) {
      setShowForm(false)
      setTitle('')
      setDescription('')
      setEstimatedCost('')
      setProposedStart('')
      setProposedEnd('')
      fetchEvents()
      toast.success('Event proposed successfully')
    } else {
      const { error } = await res.json()
      toast.error(error)
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <PartyPopper className="w-6 h-6 mr-2 text-purple-600" />
            Event Proposals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Propose activities and check if they fit your budget.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Propose Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handlePropose} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-purple-600 sm:text-sm" placeholder="Dinner at Joe's" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Type</label>
              <select value={costType} onChange={e => setCostType(e.target.value as any)} className="w-full rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-purple-600 sm:text-sm bg-white">
                <option value="total">Total for both of us</option>
                <option value="per_person">Per person</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
              <input required value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} type="number" step="0.01" className="w-full rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-purple-600 sm:text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} type="text" className="w-full rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-purple-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input required value={proposedStart} onChange={e => setProposedStart(e.target.value)} type="datetime-local" className="w-full rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-purple-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input required value={proposedEnd} onChange={e => setProposedEnd(e.target.value)} type="datetime-local" className="w-full rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-purple-600 sm:text-sm" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50">
              {submitting ? 'Proposing...' : 'Send Proposal'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-white flex flex-col rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    event.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {event.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(event.proposed_start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    ${event.estimated_cost} ({event.cost_type.replace('_', ' ')})
                  </div>
                </div>

                <div className={`p-3 rounded-lg flex items-center border ${
                  event.viable 
                    ? 'bg-green-50 border-green-100 text-green-700' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  {event.viable ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /><span className="text-sm font-medium">✓ You can afford this</span></>
                  ) : (
                    <><XCircle className="w-4 h-4 mr-2" /><span className="text-sm font-medium">✗ Over your budget</span></>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 border-t border-gray-100 p-4">
                <Link 
                  href={`/events/${event.id}`}
                  className="w-full block text-center text-sm font-medium text-purple-600 hover:text-purple-500"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
              No events proposed yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
