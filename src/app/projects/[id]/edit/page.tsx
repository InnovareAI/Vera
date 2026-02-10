'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditProjectRedirect() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => {
    router.replace(`/projects/${projectId}/settings`)
  }, [projectId, router])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 mt-4 font-medium">Redirecting to settings...</p>
      </div>
    </div>
  )
}
