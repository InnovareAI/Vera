/**
 * Notify Google Chat Edge Function
 * 
 * Sends formatted notifications to Google Chat webhook
 * Can be called directly or by other edge functions
 * 
 * Supports:
 * - Simple text messages
 * - Rich card notifications
 * - Opportunity alerts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface NotificationRequest {
    type: 'text' | 'card' | 'opportunity'
    message?: string
    title?: string
    subtitle?: string
    content?: string
    url?: string
    buttons?: Array<{ text: string; url: string }>
    // For opportunity type
    opportunity?: {
        source: string
        author: string
        title: string
        content: string
        url: string
        category: string
        score: number
        suggestedResponse?: string
    }
}

function buildSimpleMessage(text: string): object {
    return { text }
}

function buildCardMessage(request: NotificationRequest): object {
    return {
        cardsV2: [{
            cardId: `vera-${Date.now()}`,
            card: {
                header: {
                    title: request.title || 'VERA Notification',
                    subtitle: request.subtitle || '',
                    imageUrl: "https://via.placeholder.com/48/7C3AED/FFFFFF?text=V",
                    imageType: "CIRCLE"
                },
                sections: [
                    {
                        widgets: [
                            {
                                textParagraph: {
                                    text: request.content || request.message || ''
                                }
                            }
                        ]
                    },
                    ...(request.buttons && request.buttons.length > 0 ? [{
                        widgets: [{
                            buttonList: {
                                buttons: request.buttons.map(btn => ({
                                    text: btn.text,
                                    onClick: {
                                        openLink: { url: btn.url }
                                    }
                                }))
                            }
                        }]
                    }] : [])
                ]
            }
        }]
    }
}

function buildOpportunityCard(request: NotificationRequest): object {
    const opp = request.opportunity!

    const categoryConfig: Record<string, { emoji: string; label: string; color: string }> = {
        high_intent: { emoji: '🎯', label: 'HIGH-FIT OPPORTUNITY', color: '#22C55E' },
        problem_aware: { emoji: '💡', label: 'PROBLEM-AWARE PROSPECT', color: '#3B82F6' },
        pain_point: { emoji: '😓', label: 'PAIN POINT DETECTED', color: '#F59E0B' },
        general: { emoji: '📌', label: 'GENERAL MATCH', color: '#6B7280' }
    }

    const config = categoryConfig[opp.category] || categoryConfig.general

    return {
        cardsV2: [{
            cardId: `opportunity-${Date.now()}`,
            card: {
                header: {
                    title: `${config.emoji} ${config.label}`,
                    subtitle: `${opp.source} • ${opp.author}`,
                    imageUrl: "https://via.placeholder.com/48/7C3AED/FFFFFF?text=V",
                    imageType: "CIRCLE"
                },
                sections: [
                    {
                        header: "Post",
                        widgets: [
                            {
                                textParagraph: {
                                    text: `<b>${opp.title}</b>`
                                }
                            },
                            ...(opp.content ? [{
                                textParagraph: {
                                    text: opp.content.length > 400
                                        ? opp.content.slice(0, 400) + '...'
                                        : opp.content
                                }
                            }] : [])
                        ]
                    },
                    ...(opp.suggestedResponse ? [{
                        header: "💬 Suggested Response",
                        widgets: [{
                            textParagraph: {
                                text: opp.suggestedResponse
                            }
                        }]
                    }] : []),
                    {
                        widgets: [
                            {
                                textParagraph: {
                                    text: `<b>Relevance Score:</b> ${(opp.score * 100).toFixed(0)}%`
                                }
                            }
                        ]
                    },
                    {
                        widgets: [{
                            buttonList: {
                                buttons: [
                                    {
                                        text: "View Post",
                                        onClick: {
                                            openLink: { url: opp.url }
                                        }
                                    }
                                ]
                            }
                        }]
                    }
                ]
            }
        }]
    }
}

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const webhookUrl = Deno.env.get('GOOGLE_CHAT_WEBHOOK_URL')

        if (!webhookUrl) {
            return new Response(JSON.stringify({
                success: false,
                error: 'GOOGLE_CHAT_WEBHOOK_URL not configured'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const request: NotificationRequest = await req.json()

        let payload: object

        switch (request.type) {
            case 'text':
                payload = buildSimpleMessage(request.message || 'No message provided')
                break
            case 'card':
                payload = buildCardMessage(request)
                break
            case 'opportunity':
                if (!request.opportunity) {
                    throw new Error('opportunity field required for type=opportunity')
                }
                payload = buildOpportunityCard(request)
                break
            default:
                payload = buildSimpleMessage(request.message || 'Notification from VERA')
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Google Chat webhook failed:', errorText)
            return new Response(JSON.stringify({
                success: false,
                error: `Webhook failed: ${response.status}`,
                details: errorText
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Notification sent'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Notify error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
