'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TaskStatus = 'not_started' | 'in_progress' | 'completed'

type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
}

type Profile = {
  id: string
  display_name: string
  avatar_color?: string | null
}

type TaskPayload = {
  me: Profile
  friend: Profile | null
  pairStatus: 'paired' | 'pending' | 'unpaired'
  tasks: Task[]
}

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'not_started', 'completed']

function statusLabel(status: TaskStatus) {
  if (status === 'in_progress') return 'In Progress'
  if (status === 'completed') return 'Completed'
  return 'Not Started'
}

function badgeClass(status: TaskStatus) {
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700'
  if (status === 'completed') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-700'
}

function formatDate(date: string | null) {
  if (!date) return 'No due date'
  return new Date(`${date}T00:00:00`).toLocaleDateString()
}

function ProgressRow({
  label,
  completed,
  total,
}: {
  label: string
  completed: number
  total: number
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">
        {label}: {completed} of {total} tasks completed
      </p>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), [])
  const [payload, setPayload] = useState<TaskPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'not_started' as TaskStatus,
  })
  const [editDraft, setEditDraft] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'not_started' as TaskStatus,
  })

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to load tasks')
    setPayload(json)
  }, [])

  useEffect(() => {
    const run = async () => {
      try {
        await fetchTasks()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [fetchTasks])

  useEffect(() => {
    if (!payload?.friend?.id) return

    const channel = supabase
      .channel(`friend_tasks_${payload.friend.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${payload.friend.id}` },
        () => {
          void fetchTasks()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchTasks, payload?.friend?.id, supabase])

  const myTasks = useMemo(
    () => (payload?.tasks ?? []).filter((task) => task.user_id === payload?.me.id),
    [payload]
  )

  const friendTasks = useMemo(
    () => (payload?.friend ? (payload?.tasks ?? []).filter((task) => task.user_id === payload.friend?.id) : []),
    [payload]
  )

  const groupedMyTasks = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, items: myTasks.filter((task) => task.status === status) })),
    [myTasks]
  )

  const groupedFriendTasks = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, items: friendTasks.filter((task) => task.status === status) })),
    [friendTasks]
  )

  const myCompleted = myTasks.filter((task) => task.status === 'completed').length
  const friendCompleted = friendTasks.filter((task) => task.status === 'completed').length

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTask.title,
        description: newTask.description || null,
        due_date: newTask.due_date || null,
        status: newTask.status,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create task')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setShowAddForm(false)
    setNewTask({ title: '', description: '', due_date: '', status: 'not_started' })
    await fetchTasks()
  }

  const quickStatusChange = async (taskId: string, status: TaskStatus) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) await fetchTasks()
  }

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) await fetchTasks()
  }

  const saveEdit = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editDraft.title,
        description: editDraft.description || null,
        due_date: editDraft.due_date || null,
        status: editDraft.status,
      }),
    })
    if (res.ok) {
      setEditingTaskId(null)
      await fetchTasks()
    }
  }

  if (loading) return <p className="text-sm text-gray-600">Loading tasks...</p>
  if (!payload) return <p className="text-sm text-red-700">{error ?? 'Unable to load tasks'}</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="mt-1 text-sm text-gray-600">Track your progress and stay in sync with your Mutual.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressRow label={payload.me.display_name} completed={myCompleted} total={myTasks.length} />
        <ProgressRow
          label={payload.friend?.display_name ?? 'Your Mutual'}
          completed={friendCompleted}
          total={friendTasks.length}
        />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Add Task
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={createTask} className="mb-5 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <input
                required
                value={newTask.title}
                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Task title"
              />
              <input
                value={newTask.description}
                onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Description (optional)"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, status: e.target.value as TaskStatus }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Create Task'}
              </button>
            </form>
          )}

          <div className="space-y-4">
            {groupedMyTasks.map((group) => (
              <div key={group.status}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {statusLabel(group.status)}
                </h3>
                <div className="space-y-2">
                  {group.items.map((task) => (
                    <article key={task.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4
                          className={`font-medium text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                        >
                          {task.title}
                        </h4>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(task.status)}`}>
                          {statusLabel(task.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(task.due_date)}</p>
                      {task.description && <p className="mt-1 truncate text-sm text-gray-600">{task.description}</p>}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => quickStatusChange(task.id, e.target.value as TaskStatus)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(task.id)
                            setEditDraft({
                              title: task.title,
                              description: task.description ?? '',
                              due_date: task.due_date ?? '',
                              status: task.status,
                            })
                          }}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteTask(task.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>

                      {editingTaskId === task.id && (
                        <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <input
                            value={editDraft.title}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
                          />
                          <input
                            value={editDraft.description}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={editDraft.due_date}
                              onChange={(e) => setEditDraft((prev) => ({ ...prev, due_date: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                            />
                            <select
                              value={editDraft.status}
                              onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value as TaskStatus }))}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => void saveEdit(task.id)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                          >
                            Save Changes
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                  {group.items.length === 0 && (
                    <p className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                      No tasks in this section.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {payload.friend ? `${payload.friend.display_name}'s Tasks` : "Mutual's Tasks"}
          </h2>
          {!payload.friend ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Pair with a Mutual to see their tasks.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedFriendTasks.map((group) => (
                <div key={group.status}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {statusLabel(group.status)}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((task) => (
                      <article key={task.id} className="rounded-xl border border-gray-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4
                            className={`font-medium text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                          >
                            {task.title}
                          </h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(task.status)}`}>
                            {statusLabel(task.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(task.due_date)}</p>
                        {task.description && <p className="mt-1 truncate text-sm text-gray-600">{task.description}</p>}
                      </article>
                    ))}
                    {group.items.length === 0 && (
                      <p className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                        No tasks in this section.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
