import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch event
  const { data: event, error: eventError } = await supabase
    .from('proposed_events')
    .select('*')
    .eq('id', id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // 2. Compute current user's available balance
  const { data: budgetEntries } = await supabase
    .from('budget_entries')
    .select('type, amount')
    .eq('user_id', session.user.id)

  const balance = (budgetEntries || []).reduce((acc, entry) => {
    return entry.type === 'income' ? acc + Number(entry.amount) : acc - Number(entry.amount)
  }, 0)

  // 3. Compute per_person_cost
  const perPersonCost = event.cost_type === 'total' 
    ? Number(event.estimated_cost) / 2 
    : Number(event.estimated_cost)

  // 4. Determine viability for current user
  const viable = balance >= perPersonCost

  // 5. Get proposer info
  const { data: proposer } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', event.proposed_by)
    .single()

  return NextResponse.json({ 
    ...event, 
    viable,
    proposer_name: proposer?.display_name || 'Unknown'
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body

  if (status !== 'confirmed' && status !== 'cancelled') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('proposed_events')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
