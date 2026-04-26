'use client' // Error components must be Client Components
 
import { useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
 
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Something went wrong!</h2>
          <p className="text-gray-500 text-sm">
            We encountered an unexpected error while loading this page.
          </p>
        </div>
 
        <div className="pt-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
