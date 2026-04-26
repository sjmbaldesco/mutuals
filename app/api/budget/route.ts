import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('budget_entries')
    .select('*')
    .eq('user_id', session.user.id)
    .order('entry_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const available_balance = data.reduce((acc, entry) => {
    return entry.type === 'income' ? acc + Number(entry.amount) : acc - Number(entry.amount)
  }, 0)

  return NextResponse.json({ entries: data, available_balance })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, amount, description, entry_date } = body

  if (!type || !amount || !entry_date) {
    return NextResponse.json({ error: 'type, amount, and entry_date are required' }, { status: 400 })
  }

  if (type !== 'income' && type !== 'expense') {
    return NextResponse.json({ error: 'type must be income or expense' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('budget_entries')
    .insert({
      user_id: session.user.id,
      type,
      amount: Number(amount),
      description,
      entry_date
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('budget_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
