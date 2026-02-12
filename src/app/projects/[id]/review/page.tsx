'use client'

import { useWorkspace } from '@/contexts/AuthContext'
import { ContentReview } from '@/components/content-engine/ContentReview'

export default function ReviewPage() {
  const { currentWorkspace } = useWorkspace()

  if (!currentWorkspace) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-500">Loading workspace...</p>
      </div>
    )
  }

  return <ContentReview workspaceId={currentWorkspace.id} />
}
