'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import toast from 'react-hot-toast'

// Helper to get days of current week (Starting today)
function getNext7Days() {
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    days.push(date)
  }
  return days
}

export default function CalendarPage() {
  const [blocks, setBlocks] = useState<any[]>([])
  const [intersections, setIntersections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  // Form State
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [label, setLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const days = getNext7Days()

  const fetchData = async () => {
    // Fetch own blocks
    const resBlocks = await fetch('/api/availability')
    if (resBlocks.ok) {
      setBlocks(await resBlocks.json())
    }
    
    // Fetch intersections
    const resIntersections = await fetch('/api/availability/intersection')
    if (resIntersections.ok) {
      setIntersections(await resIntersections.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    // Realtime subscription
    const channel = supabase.channel('availability_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability' },
        (payload) => {
          fetchData() // Refresh on any change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        label
      })
    })

    if (res.ok) {
      setShowForm(false)
      setStartTime('')
      setEndTime('')
      setLabel('')
      fetchData()
      toast.success('Availability added')
    } else {
      const { error } = await res.json()
      toast.error(error)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/availability?id=${id}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      fetchData()
      toast.success('Block deleted')
    } else {
      toast.error('Failed to delete block')
    }
  }

  // Group items by day
  const getItemsForDay = (dayDate: Date, items: any[]) => {
    return items.filter(item => {
      const itemDate = new Date(item.start_time)
      return (
        itemDate.getDate() === dayDate.getDate() &&
        itemDate.getMonth() === dayDate.getMonth() &&
        itemDate.getFullYear() === dayDate.getFullYear()
      )
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2 text-blue-600" />
            Shared Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your free time and discover overlaps with your friend.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Availability
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input 
              type="datetime-local" 
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
            />
          </div>
          <div className="w-full md:w-auto flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input 
              type="datetime-local" 
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
            />
          </div>
          <div className="w-full md:w-auto flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Label (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Free after work"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
            />
          </div>
          <div className="w-full md:w-auto">
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Block'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px] grid grid-cols-7 divide-x divide-gray-200">
              {days.map((day, i) => {
                const dayBlocks = getItemsForDay(day, blocks)
                const dayIntersections = getItemsForDay(day, intersections)

                return (
                  <div key={i} className="min-h-[400px] bg-white">
                    {/* Header */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50 text-center">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">
                        {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-2 space-y-2">
                      {/* Intersections (Shared Windows) */}
                      {dayIntersections.map((intersection, idx) => (
                        <div key={`int-${idx}`} className="p-2 bg-green-100 border border-green-200 rounded-md text-green-800 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                          <div className="text-[10px] font-bold uppercase tracking-wide mb-1 opacity-80">Shared Time</div>
                          <div className="text-xs font-medium">
                            {new Date(intersection.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                            <br />
                            {new Date(intersection.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}

                      {/* Personal Blocks */}
                      {dayBlocks.map((block) => (
                        <div key={block.id} className="p-2 bg-blue-50 border border-blue-100 rounded-md text-blue-900 group relative">
                          <button 
                            onClick={() => handleDelete(block.id)}
                            className="absolute top-1 right-1 p-1 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded md:opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-xs font-medium pr-5">
                            {new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                            <br />
                            {new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {block.label && (
                            <div className="text-[10px] mt-1 text-blue-600 font-medium truncate">
                              {block.label}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
