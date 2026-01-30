'use client'

import { useState } from 'react'
import { useApproval, getStatusConfig, AuditLogEntry } from '@/hooks/useApproval'

interface ApprovalPanelProps {
    contentId: string
    currentStatus: string
    workspaceId: string
    userId: string
    onStatusChange?: (newStatus: string) => void
    compact?: boolean
}

export function ApprovalPanel({
    contentId,
    currentStatus,
    workspaceId,
    userId,
    onStatusChange,
    compact = false
}: ApprovalPanelProps) {
    const {
        userInfo,
        isLoading,
        actionLoading,
        canPerform,
        getRoleInfo,
        submitForReview,
        approve,
        reject,
        requestChanges,
        schedule,
        restore,
        fetchAuditLog
    } = useApproval({ workspaceId, userId })

    const [showFeedback, setShowFeedback] = useState(false)
    const [showScheduler, setShowScheduler] = useState(false)
    const [showAuditLog, setShowAuditLog] = useState(false)
    const [feedbackText, setFeedbackText] = useState('')
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('')
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
    const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const statusConfig = getStatusConfig(currentStatus)
    const roleInfo = getRoleInfo()

    const handleAction = async (
        action: () => Promise<{ success: boolean; error?: string }>,
        successMessage: string
    ) => {
        const result = await action()
        if (result.success) {
            setActionFeedback({ type: 'success', message: successMessage })
            onStatusChange?.(currentStatus)
            setTimeout(() => setActionFeedback(null), 3000)
        } else {
            setActionFeedback({ type: 'error', message: result.error || 'Action failed' })
            setTimeout(() => setActionFeedback(null), 5000)
        }
        setShowFeedback(false)
        setFeedbackText('')
    }

    const handleSchedule = async () => {
        if (!scheduleDate || !scheduleTime) return
        const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        await handleAction(
            () => schedule(contentId, scheduledFor),
            'Content scheduled successfully!'
        )
        setShowScheduler(false)
    }

    const loadAuditLog = async () => {
        const log = await fetchAuditLog(contentId)
        setAuditLog(log)
        setShowAuditLog(true)
    }

    if (isLoading) {
        return (
            <div className="animate-pulse bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
        )
    }

    // Compact view for card actions
    if (compact) {
        return (
            <div className="flex gap-2">
                {/* Submit for Review */}
                {(currentStatus === 'draft' || currentStatus === 'changes_requested') && canPerform('submit') && (
                    <button
                        onClick={() => handleAction(() => submitForReview(contentId), 'Submitted for review!')}
                        disabled={actionLoading === contentId}
                        className="px-2 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 text-xs font-medium disabled:opacity-50 transition-all"
                    >
                        {actionLoading === contentId ? '...' : '📤 Submit'}
                    </button>
                )}

                {/* Approve */}
                {(currentStatus === 'pending' || currentStatus === 'pending_review') && canPerform('approve') && (
                    <button
                        onClick={() => handleAction(() => approve(contentId), 'Approved!')}
                        disabled={actionLoading === contentId}
                        className="px-2 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-xs font-medium disabled:opacity-50 transition-all"
                    >
                        {actionLoading === contentId ? '...' : '✓ Approve'}
                    </button>
                )}

                {/* Request Changes */}
                {(currentStatus === 'pending' || currentStatus === 'pending_review') && canPerform('request_changes') && (
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="px-2 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs font-medium transition-all"
                    >
                        ✏️ Changes
                    </button>
                )}

                {/* Reject */}
                {(currentStatus === 'pending' || currentStatus === 'pending_review') && canPerform('reject') && (
                    <button
                        onClick={() => handleAction(() => reject(contentId, feedbackText), 'Rejected')}
                        disabled={actionLoading === contentId}
                        className="px-2 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs font-medium disabled:opacity-50 transition-all"
                    >
                        ✕
                    </button>
                )}

                {/* Restore */}
                {(currentStatus === 'rejected' || currentStatus === 'dismissed') && canPerform('restore') && (
                    <button
                        onClick={() => handleAction(() => restore(contentId), 'Restored to draft')}
                        disabled={actionLoading === contentId}
                        className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium disabled:opacity-50 transition-all"
                    >
                        ↩️ Restore
                    </button>
                )}

                {/* Feedback Modal */}
                {showFeedback && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFeedback(false)}>
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Changes</h3>
                            <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Describe what changes are needed..."
                                className="w-full h-32 bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all"
                            />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => handleAction(() => requestChanges(contentId, feedbackText), 'Changes requested')}
                                    disabled={!feedbackText.trim()}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 font-medium shadow-sm transition-all"
                                >
                                    Request Changes
                                </button>
                                <button
                                    onClick={() => setShowFeedback(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Full panel view
    return (
        <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-4 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{statusConfig.icon}</span>
                    <div>
                        <h3 className="text-gray-900 font-medium">Approval Status</h3>
                        <p className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</p>
                    </div>
                </div>
                {roleInfo && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleInfo.bg} ${roleInfo.color}`}>
                        {roleInfo.label}
                    </span>
                )}
            </div>

            {/* Action Feedback */}
            {actionFeedback && (
                <div className={`p-3 rounded-xl text-sm font-medium ${actionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {actionFeedback.message}
                </div>
            )}

            {/* Permission Notice */}
            {!canPerform('approve') && (currentStatus === 'pending' || currentStatus === 'pending_review') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
                    ⚠️ You don't have permission to approve content. Only admins and owners can approve.
                </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                {/* Submit for Review */}
                {(currentStatus === 'draft' || currentStatus === 'changes_requested') && canPerform('submit') && (
                    <button
                        onClick={() => handleAction(() => submitForReview(contentId), 'Submitted for review!')}
                        disabled={actionLoading === contentId}
                        className="col-span-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 transition-all"
                    >
                        {actionLoading === contentId ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <>📤 Submit for Review</>
                        )}
                    </button>
                )}

                {/* Approve & Reject */}
                {(currentStatus === 'pending' || currentStatus === 'pending_review') && (
                    <>
                        {canPerform('approve') && (
                            <button
                                onClick={() => handleAction(() => approve(contentId), 'Approved!')}
                                disabled={actionLoading === contentId}
                                className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                {actionLoading === contentId ? '...' : '✅ Approve'}
                            </button>
                        )}

                        {canPerform('reject') && (
                            <button
                                onClick={() => setShowFeedback(true)}
                                className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 font-medium flex items-center justify-center gap-2 transition-all"
                            >
                                ❌ Reject
                            </button>
                        )}

                        {canPerform('request_changes') && (
                            <button
                                onClick={() => setShowFeedback(true)}
                                className="col-span-2 px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 font-medium flex items-center justify-center gap-2 transition-all"
                            >
                                ✏️ Request Changes
                            </button>
                        )}
                    </>
                )}

                {/* Schedule */}
                {currentStatus === 'approved' && canPerform('schedule') && (
                    <button
                        onClick={() => setShowScheduler(true)}
                        className="col-span-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl hover:from-blue-600 hover:to-sky-600 font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                        📅 Schedule Publishing
                    </button>
                )}

                {/* Restore */}
                {(currentStatus === 'rejected' || currentStatus === 'dismissed') && canPerform('restore') && (
                    <button
                        onClick={() => handleAction(() => restore(contentId), 'Restored to draft')}
                        disabled={actionLoading === contentId}
                        className="col-span-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                        ↩️ Restore to Draft
                    </button>
                )}
            </div>

            {/* Audit Log Button */}
            <button
                onClick={loadAuditLog}
                className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm flex items-center justify-center gap-2 transition-all"
            >
                📋 View Approval History
            </button>

            {/* Feedback Modal */}
            {showFeedback && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFeedback(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-200 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {canPerform('reject') ? 'Reject or Request Changes' : 'Request Changes'}
                        </h3>
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Provide feedback on what needs to be changed..."
                            className="w-full h-32 bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-violet-400 focus:border-violet-400 resize-none transition-all"
                        />
                        <div className="flex gap-3 mt-4">
                            {canPerform('request_changes') && (
                                <button
                                    onClick={() => handleAction(() => requestChanges(contentId, feedbackText), 'Changes requested')}
                                    disabled={!feedbackText.trim()}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 font-medium shadow-sm transition-all"
                                >
                                    Request Changes
                                </button>
                            )}
                            {canPerform('reject') && (
                                <button
                                    onClick={() => handleAction(() => reject(contentId, feedbackText), 'Content rejected')}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 font-medium shadow-sm transition-all"
                                >
                                    Reject
                                </button>
                            )}
                            <button
                                onClick={() => setShowFeedback(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduler Modal */}
            {showScheduler && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowScheduler(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-200 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Schedule Publishing</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-2 font-medium">Date</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-2 font-medium">Time</label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSchedule}
                                disabled={!scheduleDate || !scheduleTime}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl hover:from-blue-600 hover:to-sky-600 disabled:opacity-50 font-medium shadow-sm transition-all"
                            >
                                Schedule
                            </button>
                            <button
                                onClick={() => setShowScheduler(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Log Modal */}
            {showAuditLog && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAuditLog(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 border border-gray-200 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Approval History</h3>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {auditLog.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">No history yet</p>
                            ) : (
                                auditLog.map((entry) => (
                                    <div key={entry.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-900 font-medium capitalize">
                                                {entry.action.replace('_', ' ')}
                                            </span>
                                            <span className="text-gray-400 text-xs">
                                                {new Date(entry.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600">
                                                {entry.performer?.full_name || entry.performer?.email || 'Unknown'}
                                            </span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-gray-500 capitalize">{entry.performer_role}</span>
                                        </div>
                                        {entry.notes && (
                                            <p className="text-gray-500 text-sm mt-2 italic">"{entry.notes}"</p>
                                        )}
                                        {entry.previous_status && entry.new_status && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="text-gray-400">{entry.previous_status}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="text-violet-600 font-medium">{entry.new_status}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => setShowAuditLog(false)}
                            className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// Role Badge Component
export function RoleBadge({ role }: { role: string }) {
    const roleConfig = {
        owner: { label: 'Owner', color: 'text-purple-700', bg: 'bg-purple-100', icon: '👑' },
        admin: { label: 'Admin', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: '🛡️' },
        editor: { label: 'Editor', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '✏️' },
        viewer: { label: 'Viewer', color: 'text-gray-600', bg: 'bg-gray-100', icon: '👁️' }
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    )
}

// Status Badge Component
export function StatusBadge({ status }: { status: string }) {
    const config = getStatusConfig(status)

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    )
}
