import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PairStatus = 'paired' | 'pending' | 'unpaired'

async function getPairStatus(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, friendId: string | null): Promise<PairStatus> {
  if (friendId) return 'paired'

  const { count } = await supabase
    .from('pair_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)

  return (count ?? 0) > 0 ? 'pending' : 'unpaired'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, display_name, friend_id, avatar_color')
    .eq('id', session.user.id)
    .single()

  if (meError || !me) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('user_id', me.friend_id ? [me.id, me.friend_id] : [me.id])
    .order('created_at', { ascending: false })

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  const { data: friend } = me.friend_id
    ? await supabase
        .from('users')
        .select('id, display_name, avatar_color')
        .eq('id', me.friend_id)
        .single()
    : { data: null as null }

  const pairStatus = await getPairStatus(supabase, me.id, me.friend_id)

  return NextResponse.json({
    pairStatus,
    me,
    friend,
    tasks: tasks ?? [],
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const title = String(body?.title ?? '').trim()
  const description = body?.description ? String(body.description).trim() : null
  const status = String(body?.status ?? 'not_started')
  const due_date = body?.due_date ? String(body.due_date) : null

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  if (!['not_started', 'in_progress', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: session.user.id,
      title,
      description,
      status,
      due_date,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
