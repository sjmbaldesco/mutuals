import Link from 'next/link'
import { AlertCircle, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Page not found</h1>
          <p className="text-gray-500">
            Sorry, we couldn't find the page you're looking for. It might have been removed or doesn't exist.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
