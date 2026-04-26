import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Home, Calendar, Wallet, PartyPopper, ListTodo, Users } from 'lucide-react'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, friend_id, avatar_color')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const { data: friendProfile } = profile?.friend_id
    ? await supabase
        .from('users')
        .select('display_name, avatar_color')
        .eq('id', profile.friend_id)
        .single()
    : { data: null as null }

  const desktopNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Tasks', href: '/tasks', icon: ListTodo },
    { name: 'Budget', href: '/budget', icon: Wallet },
    { name: 'Events', href: '/events', icon: PartyPopper },
    { name: 'Pair', href: '/pair', icon: Users },
  ]

  const mobileNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Tasks', href: '/tasks', icon: ListTodo },
    { name: 'Budget', href: '/budget', icon: Wallet },
    { name: 'Events', href: '/events', icon: PartyPopper },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Mutuals</h1>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center px-3 py-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: profile?.avatar_color ?? '#7C3AED' }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.display_name}</p>
              {friendProfile ? (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className="h-4 w-4 rounded-full text-[10px] font-semibold text-white flex items-center justify-center"
                    style={{ backgroundColor: friendProfile.avatar_color ?? '#7C3AED' }}
                  >
                    {friendProfile.display_name.charAt(0).toUpperCase()}
                  </span>
                  <span>Paired with {friendProfile.display_name}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-500">No Mutual yet</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="md:hidden mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: profile?.avatar_color ?? '#7C3AED' }}
                >
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate">{profile.display_name}</p>
                  {friendProfile ? (
                    <p className="text-xs text-gray-500">Paired with {friendProfile.display_name}</p>
                  ) : (
                    <p className="text-xs text-gray-500">No Mutual yet</p>
                  )}
                </div>
              </div>
              <Link href="/pair" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Pair
              </Link>
            </div>
          </div>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 pb-2 pt-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
