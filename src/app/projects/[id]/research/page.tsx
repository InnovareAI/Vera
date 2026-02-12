'use client'

import { useParams, redirect } from 'next/navigation'

export default function ResearchRedirect() {
  const params = useParams()
  redirect(`/projects/${params.id}/strategy/research`)
}
