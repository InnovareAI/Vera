import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/newsletter/issues/[id]/preview - Render HTML preview
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: issue } = await supabase
      .from('vera_newsletter_issues')
      .select('*, vera_newsletter_config(*)')
      .eq('id', id)
      .single()

    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const config = issue.vera_newsletter_config
    const bodyHtml = issue.body_html || `<div>${issue.body_markdown || ''}</div>`
    const footer = config?.footer_html || '<p style="color: #6b7280; font-size: 12px;">Sent via Vera.AI by InnovareAI</p>'
    const unsubLink = config?.unsubscribe_url || '#'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${issue.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { padding: 32px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; }
    .content { padding: 32px; color: #1f2937; line-height: 1.6; }
    .footer { padding: 24px 32px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb; }
    a { color: #3b82f6; }
    h1, h2, h3 { color: #111827; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:24px;">${config?.name || 'Newsletter'}</h1>
      ${issue.preview_text ? `<p style="margin:8px 0 0;opacity:0.9;">${issue.preview_text}</p>` : ''}
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      ${footer}
      <p><a href="${unsubLink}" style="color:#6b7280;font-size:12px;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
