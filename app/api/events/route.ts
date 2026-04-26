import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all proposed events (RLS limits this to user and their friend automatically)
  const { data: events, error } = await supabase
    .from('proposed_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch current user's budget balance to attach viability to all events
  const { data: budgetEntries } = await supabase
    .from('budget_entries')
    .select('type, amount')
    .eq('user_id', session.user.id)

  const balance = (budgetEntries || []).reduce((acc, entry) => {
    return entry.type === 'income' ? acc + Number(entry.amount) : acc - Number(entry.amount)
  }, 0)

  const eventsWithViability = events.map(event => {
    const perPersonCost = event.cost_type === 'total' ? Number(event.estimated_cost) / 2 : Number(event.estimated_cost)
    return {
      ...event,
      viable: balance >= perPersonCost
    }
  })

  return NextResponse.json(eventsWithViability)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, estimated_cost, cost_type, proposed_start, proposed_end } = body

  if (!title || !estimated_cost || !cost_type || !proposed_start || !proposed_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('proposed_events')
    .insert({
      proposed_by: session.user.id,
      title,
      description,
      estimated_cost: Number(estimated_cost),
      cost_type,
      proposed_start,
      proposed_end,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
