import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const action = body?.action as 'accept' | 'decline' | undefined
  if (!action || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: reqRow, error: reqError } = await supabase
    .from('pair_requests')
    .select('id, from_user_id, to_user_id, status')
    .eq('id', id)
    .single()

  if (reqError || !reqRow) {
    return NextResponse.json({ error: 'Pair request not found' }, { status: 404 })
  }

  if (reqRow.to_user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (reqRow.status !== 'pending') {
    return NextResponse.json({ error: 'This request is no longer pending' }, { status: 400 })
  }

  if (action === 'decline') {
    const { error: declineError } = await supabase
      .from('pair_requests')
      .update({ status: 'declined' })
      .eq('id', id)
      .eq('to_user_id', session.user.id)

    if (declineError) {
      return NextResponse.json({ error: declineError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  const { data: participants } = await supabase
    .from('users')
    .select('id, friend_id')
    .in('id', [reqRow.from_user_id, reqRow.to_user_id])

  const fromUser = participants?.find((u) => u.id === reqRow.from_user_id)
  const toUser = participants?.find((u) => u.id === reqRow.to_user_id)

  if (!fromUser || !toUser) {
    return NextResponse.json({ error: 'Could not load pair participants' }, { status: 400 })
  }

  if (fromUser.friend_id || toUser.friend_id) {
    return NextResponse.json({ error: 'One of the users is already paired' }, { status: 400 })
  }

  // Best-effort atomic behavior with rollback if second write fails.
  const { error: setFromError } = await supabase
    .from('users')
    .update({ friend_id: reqRow.to_user_id })
    .eq('id', reqRow.from_user_id)

  if (setFromError) {
    return NextResponse.json({ error: setFromError.message }, { status: 500 })
  }

  const { error: setToError } = await supabase
    .from('users')
    .update({ friend_id: reqRow.from_user_id })
    .eq('id', reqRow.to_user_id)

  if (setToError) {
    await supabase.from('users').update({ friend_id: null }).eq('id', reqRow.from_user_id)
    return NextResponse.json({ error: setToError.message }, { status: 500 })
  }

  const { error: acceptError } = await supabase
    .from('pair_requests')
    .update({ status: 'accepted' })
    .eq('id', id)

  if (acceptError) {
    return NextResponse.json({ error: acceptError.message }, { status: 500 })
  }

  await supabase
    .from('pair_requests')
    .delete()
    .or(
      `and(from_user_id.eq.${reqRow.from_user_id},to_user_id.eq.${reqRow.to_user_id}),and(from_user_id.eq.${reqRow.to_user_id},to_user_id.eq.${reqRow.from_user_id})`
    )

  return NextResponse.json({ success: true })
}
