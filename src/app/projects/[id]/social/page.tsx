import { redirect } from 'next/navigation'
export default async function SocialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/projects/${id}/social/create`)
}
