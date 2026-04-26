import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuthedContext() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { supabase, userId: null }
  }

  return { supabase, userId: session.user.id }
}

export async function GET() {
  const { supabase, userId } = await getAuthedContext()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, display_name, email, friend_id, avatar_color')
    .eq('id', userId)
    .single()

  if (meError || !me) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  let friend: null | {
    id: string
    display_name: string
    email: string
    avatar_color: string | null
  } = null

  if (me.friend_id) {
    const { data: friendData } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_color')
      .eq('id', me.friend_id)
      .single()
    friend = friendData ?? null
  }

  const { data: outgoingPending } = await supabase
    .from('pair_requests')
    .select('id, from_user_id, to_user_id, status, created_at, to_user:users!pair_requests_to_user_id_fkey(display_name, email)')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: incomingPending } = await supabase
    .from('pair_requests')
    .select('id, from_user_id, to_user_id, status, created_at, from_user:users!pair_requests_from_user_id_fkey(display_name, email)')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const pairStatus = me.friend_id
    ? 'paired'
    : outgoingPending || incomingPending
      ? 'pending'
      : 'unpaired'

  return NextResponse.json({
    me,
    friend,
    pairStatus,
    outgoingPending,
    incomingPending,
  })
}

export async function POST(request: Request) {
  const { supabase, userId } = await getAuthedContext()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const friendEmail = String(body?.friendEmail ?? '')
    .trim()
    .toLowerCase()

  if (!friendEmail) {
    return NextResponse.json({ error: 'Friend email is required' }, { status: 400 })
  }

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, email, friend_id')
    .eq('id', userId)
    .single()

  if (meError || !me) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (me.friend_id) {
    return NextResponse.json({ error: 'You are already paired' }, { status: 400 })
  }

  if (me.email.toLowerCase() === friendEmail) {
    return NextResponse.json({ error: 'You cannot pair with yourself' }, { status: 400 })
  }

  const { data: friend, error: friendError } = await supabase
    .from('users')
    .select('id, friend_id')
    .eq('email', friendEmail)
    .single()

  if (friendError || !friend) {
    return NextResponse.json({ error: "That email isn't registered yet." }, { status: 404 })
  }

  if (friend.friend_id) {
    return NextResponse.json({ error: 'That user is already paired' }, { status: 400 })
  }

  const { data: existingPending } = await supabase
    .from('pair_requests')
    .select('id')
    .eq('status', 'pending')
    .or(
      `and(from_user_id.eq.${userId},to_user_id.eq.${friend.id}),and(from_user_id.eq.${friend.id},to_user_id.eq.${userId})`
    )
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json({ error: 'There is already a pending pair request between both users.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pair_requests')
    .insert({
      from_user_id: userId,
      to_user_id: friend.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}

export async function DELETE() {
  const { supabase, userId } = await getAuthedContext()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, friend_id')
    .eq('id', userId)
    .single()

  if (meError || !me) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!me.friend_id) {
    return NextResponse.json({ success: true })
  }

  const { error: selfUnpairError } = await supabase
    .from('users')
    .update({ friend_id: null })
    .eq('id', me.id)

  if (selfUnpairError) {
    return NextResponse.json({ error: selfUnpairError.message }, { status: 500 })
  }

  const { error: friendUnpairError } = await supabase
    .from('users')
    .update({ friend_id: null })
    .eq('id', me.friend_id)

  if (friendUnpairError) {
    await supabase.from('users').update({ friend_id: me.friend_id }).eq('id', me.id)
    return NextResponse.json({ error: friendUnpairError.message }, { status: 500 })
  }

  await supabase
    .from('pair_requests')
    .delete()
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)

  return NextResponse.json({ success: true })
}
