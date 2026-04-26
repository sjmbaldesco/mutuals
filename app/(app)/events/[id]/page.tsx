'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PartyPopper, CheckCircle2, XCircle, Clock, DollarSign, ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EventDetailPage() {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const fetchEvent = async () => {
      const res = await fetch(`/api/events/${params.id}`)
      if (res.ok) {
        setEvent(await res.json())
      } else {
        router.push('/events')
      }
      setLoading(false)
    }
    fetchEvent()
  }, [params.id, router])

  const handleStatusChange = async (newStatus: 'confirmed' | 'cancelled') => {
    setUpdating(true)
    const res = await fetch(`/api/events/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (res.ok) {
      setEvent({ ...event, status: newStatus })
      toast.success(`Event ${newStatus}`)
    } else {
      const { error } = await res.json()
      toast.error(error)
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/events" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Events
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <p className="text-gray-500 mt-1">Proposed by {event.proposer_name}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
            event.status === 'pending' ? 'bg-amber-100 text-amber-800' :
            event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {event.status}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">When</h3>
            <div className="flex items-center text-gray-900 font-medium">
              <Clock className="w-5 h-5 mr-3 text-purple-500" />
              <div>
                <p>{new Date(event.proposed_start).toLocaleString([], { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-sm text-gray-500">to {new Date(event.proposed_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Cost</h3>
            <div className="flex items-center text-gray-900 font-medium">
              <DollarSign className="w-5 h-5 mr-3 text-green-500" />
              <div>
                <p>${event.estimated_cost}</p>
                <p className="text-sm text-gray-500">{event.cost_type.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {event.description && (
          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Details</h3>
            <p className="text-gray-700">{event.description}</p>
          </div>
        )}

        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Financial Feasibility</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${
              event.viable 
                ? 'bg-green-50 border-green-100 text-green-700' 
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-2">Your Verdict</p>
              {event.viable ? (
                <div className="flex items-center"><CheckCircle2 className="w-5 h-5 mr-2" /><span className="font-medium">✓ You can afford this</span></div>
              ) : (
                <div className="flex items-center"><XCircle className="w-5 h-5 mr-2" /><span className="font-medium">✗ Over your budget</span></div>
              )}
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 border-gray-200 text-gray-600">
              <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-2">Friend's Verdict</p>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2 opacity-50" />
                <span className="font-medium italic">Private (Requires Friend's View)</span>
              </div>
              <p className="text-[10px] mt-2 opacity-70">Cannot be computed securely without an RPC</p>
            </div>
          </div>
        </div>
      </div>

      {event.status === 'pending' && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => handleStatusChange('cancelled')}
            disabled={updating}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4 mr-2" /> Cancel Event
          </button>
          <button
            onClick={() => handleStatusChange('confirmed')}
            disabled={updating || !event.viable}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-500 disabled:opacity-50 transition-colors"
            title={!event.viable ? "You cannot afford this event" : ""}
          >
            <Check className="w-4 h-4 mr-2" /> Confirm Event
          </button>
        </div>
      )}
    </div>
  )
}
