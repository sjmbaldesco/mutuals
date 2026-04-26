import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Get current user profile to find friend_id
  const { data: profile } = await supabase
    .from('users')
    .select('friend_id')
    .eq('id', userId)
    .single()

  if (!profile?.friend_id) {
    return NextResponse.json([]) // No friend, no intersection
  }

  const friendId = profile.friend_id

  // Fetch all future availability for both users
  const now = new Date().toISOString()
  const { data: availabilities, error } = await supabase
    .from('availability')
    .select('*')
    .in('user_id', [userId, friendId])
    .gte('end_time', now)
    .order('start_time', { ascending: true })

  if (error || !availabilities) {
    return NextResponse.json({ error: error?.message || 'Error fetching availabilities' }, { status: 500 })
  }

  const userBlocks = availabilities.filter(a => a.user_id === userId)
  const friendBlocks = availabilities.filter(a => a.user_id === friendId)

  // Compute intersections
  const intersections = []
  
  for (const u of userBlocks) {
    for (const f of friendBlocks) {
      const uStart = new Date(u.start_time).getTime()
      const uEnd = new Date(u.end_time).getTime()
      const fStart = new Date(f.start_time).getTime()
      const fEnd = new Date(f.end_time).getTime()

      // Check for overlap
      if (uStart < fEnd && uEnd > fStart) {
        const overlapStart = new Date(Math.max(uStart, fStart))
        const overlapEnd = new Date(Math.min(uEnd, fEnd))
        intersections.push({
          start_time: overlapStart.toISOString(),
          end_time: overlapEnd.toISOString()
        })
      }
    }
  }

  // Sort intersections by start time
  intersections.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return NextResponse.json(intersections)
}
