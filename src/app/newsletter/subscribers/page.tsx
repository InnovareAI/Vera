'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface NewsletterConfig {
  id: string
  workspace_id: string
  name: string
  is_active: boolean
}

interface Subscriber {
  id: string
  newsletter_id: string
  email: string
  first_name: string | null
  last_name: string | null
  tags: string[]
  status: 'active' | 'unsubscribed' | 'bounced'
  subscribed_at: string
  unsubscribed_at: string | null
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function statusBadge(status: Subscriber['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</Badge>
    case 'unsubscribed':
      return <Badge className="bg-neutral-600/20 text-neutral-400 border border-neutral-600/30">Unsubscribed</Badge>
    case 'bounced':
      return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Bounced</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function SubscribersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()

  const [configs, setConfigs] = useState<NewsletterConfig[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed' | 'bounced'>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Add subscriber dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', tags: '' })
  const [addSaving, setAddSaving] = useState(false)

  // Import CSV dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [csvData, setCsvData] = useState('')
  const [importSaving, setImportSaving] = useState(false)
  const [importResult, setImportResult] = useState<{ imported?: number; errors?: string[] } | null>(null)

  // -------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------

  useEffect(() => {
    if (currentWorkspace) {
      fetchConfigs()
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (selectedConfigId) {
      fetchSubscribers()
    }
  }, [selectedConfigId, statusFilter])

  const fetchConfigs = async () => {
    if (!currentWorkspace) return
    try {
      const res = await fetch(`/api/newsletter/config?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()
      const cfgs = Array.isArray(data) ? data : []
      setConfigs(cfgs)
      if (cfgs.length > 0 && !selectedConfigId) {
        setSelectedConfigId(cfgs[0].id)
      }
    } catch (err) {
      console.error('Failed to load configs', err)
    }
  }

  const fetchSubscribers = async () => {
    if (!selectedConfigId) return
    setLoading(true)
    try {
      let url = `/api/newsletter/subscribers?newsletter_id=${selectedConfigId}`
      if (statusFilter !== 'all') url += `&status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setSubscribers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load subscribers', err)
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    subscribers.forEach((s) => (s.tags || []).forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [subscribers])

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchEmail = sub.email.toLowerCase().includes(q)
        const matchName = (sub.first_name || '').toLowerCase().includes(q) || (sub.last_name || '').toLowerCase().includes(q)
        if (!matchEmail && !matchName) return false
      }
      // Tag
      if (tagFilter !== 'all' && !(sub.tags || []).includes(tagFilter)) return false
      return true
    })
  }, [subscribers, search, tagFilter])

  const statCounts = useMemo(() => {
    const all = subscribers
    return {
      active: all.filter((s) => s.status === 'active').length,
      unsubscribed: all.filter((s) => s.status === 'unsubscribed').length,
      bounced: all.filter((s) => s.status === 'bounced').length,
    }
  }, [subscribers])

  // -------------------------------------------------------------------
  // Selection handlers
  // -------------------------------------------------------------------

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSubscribers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredSubscribers.map((s) => s.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // -------------------------------------------------------------------
  // Add subscriber
  // -------------------------------------------------------------------

  const handleAddSubscriber = async () => {
    if (!addForm.email.trim() || !selectedConfigId) return
    setAddSaving(true)
    try {
      const tags = addForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletter_id: selectedConfigId,
          email: addForm.email.trim(),
          first_name: addForm.first_name.trim() || null,
          last_name: addForm.last_name.trim() || null,
          tags,
        }),
      })
      if (res.ok) {
        setAddDialogOpen(false)
        setAddForm({ email: '', first_name: '', last_name: '', tags: '' })
        fetchSubscribers()
      }
    } catch (err) {
      console.error('Add subscriber failed', err)
    } finally {
      setAddSaving(false)
    }
  }

  // -------------------------------------------------------------------
  // CSV Import
  // -------------------------------------------------------------------

  const handleImportCsv = async () => {
    if (!csvData.trim() || !selectedConfigId) return
    setImportSaving(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/newsletter/subscribers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletter_id: selectedConfigId,
          csv_data: csvData,
        }),
      })
      const data = await res.json()
      setImportResult(data)
      if (data.success) {
        fetchSubscribers()
      }
    } catch (err) {
      console.error('CSV import failed', err)
    } finally {
      setImportSaving(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvData(ev.target?.result as string || '')
    }
    reader.readAsText(file)
  }

  // -------------------------------------------------------------------
  // Bulk delete
  // -------------------------------------------------------------------

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(
        ids.map((id) =>
          fetch('/api/newsletter/subscribers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriber_id: id }),
          })
        )
      )
      setSelectedIds(new Set())
      fetchSubscribers()
    } catch (err) {
      console.error('Bulk delete failed', err)
    }
  }

  // -------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 mt-4 font-medium">Powering up Vera.AI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-violet-500/30">
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-neutral-950 to-transparent pointer-events-none z-40" />

      {/* Header */}
      <header className="relative z-50 border-b border-neutral-800/50 bg-neutral-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-semibold text-neutral-100 italic">V</span>
              </div>
              <span className="text-2xl font-semibold tracking-tighter text-neutral-100">Vera.AI</span>
            </Link>
            <span className="text-neutral-600">|</span>
            <Link href="/newsletter" className="text-neutral-400 hover:text-neutral-100 text-sm font-medium transition-colors">
              Newsletter
            </Link>
            <span className="text-neutral-700">/</span>
            <h1 className="text-neutral-100 font-medium text-sm">Subscribers</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Import CSV */}
            <Dialog open={importDialogOpen} onOpenChange={(v) => { setImportDialogOpen(v); if (!v) { setCsvData(''); setImportResult(null) } }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:border-neutral-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-neutral-700 text-neutral-100 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-neutral-100">Import Subscribers from CSV</DialogTitle>
                  <DialogDescription className="text-neutral-400">
                    Upload a CSV file or paste CSV data. Required column: <code className="text-violet-400">email</code>.
                    Optional: <code className="text-violet-400">first_name</code>, <code className="text-violet-400">last_name</code>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest mb-2 block">Upload CSV File</Label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-500/20 file:text-violet-400 hover:file:bg-violet-500/30 cursor-pointer"
                    />
                  </div>
                  <div className="text-center text-neutral-600 text-xs">or paste CSV below</div>
                  <Textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="email,first_name,last_name&#10;john@example.com,John,Doe&#10;jane@example.com,Jane,Smith"
                    className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 min-h-[120px] font-mono text-xs"
                  />
                  {importResult && (
                    <div className={`rounded-lg p-3 text-sm ${importResult.imported ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                      {importResult.imported ? (
                        <p>Successfully imported {importResult.imported} subscriber(s).</p>
                      ) : null}
                      {importResult.errors && importResult.errors.length > 0 && (
                        <ul className="list-disc pl-4 mt-1">
                          {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={handleImportCsv}
                    disabled={importSaving || !csvData.trim()}
                  >
                    {importSaving ? 'Importing...' : 'Import Subscribers'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Subscriber */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Add Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-neutral-700 text-neutral-100">
                <DialogHeader>
                  <DialogTitle className="text-neutral-100">Add Subscriber</DialogTitle>
                  <DialogDescription className="text-neutral-400">Add a new subscriber to your newsletter.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest mb-1 block">Email *</Label>
                    <Input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="subscriber@example.com"
                      className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest mb-1 block">First Name</Label>
                      <Input
                        value={addForm.first_name}
                        onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                        placeholder="John"
                        className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                      />
                    </div>
                    <div>
                      <Label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest mb-1 block">Last Name</Label>
                      <Input
                        value={addForm.last_name}
                        onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                        placeholder="Doe"
                        className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest mb-1 block">Tags (comma-separated)</Label>
                    <Input
                      value={addForm.tags}
                      onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
                      placeholder="vip, early-adopter"
                      className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-600"
                    />
                  </div>
                  <Separator className="bg-neutral-800" />
                  <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-neutral-400 hover:text-neutral-100">Cancel</Button>
                    <Button variant="gradient" onClick={handleAddSubscriber} disabled={addSaving || !addForm.email.trim()}>
                      {addSaving ? 'Adding...' : 'Add Subscriber'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300 text-xs font-semibold uppercase tracking-widest transition-colors">Dashboard</Link>
          <span className="text-neutral-700 text-xs">/</span>
          <Link href="/newsletter" className="text-neutral-500 hover:text-neutral-300 text-xs font-semibold uppercase tracking-widest transition-colors">Newsletter</Link>
          <span className="text-neutral-700 text-xs">/</span>
          <span className="text-violet-400 text-xs font-semibold uppercase tracking-widest">Subscribers</span>
        </div>

        <div>
          <h2 className="text-4xl font-semibold tracking-tight text-neutral-100 mb-2">Subscriber Management</h2>
          <p className="text-lg text-neutral-400">View, manage, and grow your newsletter audience.</p>
        </div>

        {/* Newsletter selector */}
        {configs.length > 0 && (
          <div className="flex items-center gap-4">
            <Label className="text-neutral-400 font-semibold text-xs uppercase tracking-widest whitespace-nowrap">Newsletter</Label>
            <Select value={selectedConfigId} onValueChange={(v) => { setSelectedConfigId(v); setSelectedIds(new Set()) }}>
              <SelectTrigger className="w-72 bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectValue placeholder="Select newsletter" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {configs.map((cfg) => (
                  <SelectItem key={cfg.id} value={cfg.id} className="text-neutral-100 hover:bg-neutral-800">
                    {cfg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Active', value: statCounts.active, color: 'emerald' },
            { label: 'Unsubscribed', value: statCounts.unsubscribed, color: 'gray' },
            { label: 'Bounced', value: statCounts.bounced, color: 'red' },
          ].map((stat) => (
            <div key={stat.label} className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-xl">
              <p className="text-neutral-500 font-semibold uppercase tracking-widest text-xs mb-1">{stat.label}</p>
              <span className="text-5xl font-semibold text-neutral-100">{loading ? <Skeleton className="h-12 w-16" /> : stat.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-neutral-900/20 border border-neutral-800/50 rounded-[2.5rem] p-8">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 focus:border-violet-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-40 bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                <SelectItem value="all" className="text-neutral-100 hover:bg-neutral-800">All Statuses</SelectItem>
                <SelectItem value="active" className="text-neutral-100 hover:bg-neutral-800">Active</SelectItem>
                <SelectItem value="unsubscribed" className="text-neutral-100 hover:bg-neutral-800">Unsubscribed</SelectItem>
                <SelectItem value="bounced" className="text-neutral-100 hover:bg-neutral-800">Bounced</SelectItem>
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-40 bg-neutral-900 border-neutral-700 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="all" className="text-neutral-100 hover:bg-neutral-800">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag} className="text-neutral-100 hover:bg-neutral-800">{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                Unsubscribe {selectedIds.size} selected
              </Button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 mx-auto text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V5.228A2 2 0 015.228 3h13.544A2 2 0 0121 5.228v5.018M12 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-neutral-500 font-medium">No subscribers found</p>
              <p className="text-neutral-600 text-sm mt-1">
                {search || statusFilter !== 'all' || tagFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Add your first subscriber or import from CSV.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredSubscribers.length && filteredSubscribers.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-neutral-500 font-semibold uppercase tracking-widest text-xs">Email</TableHead>
                    <TableHead className="text-neutral-500 font-semibold uppercase tracking-widest text-xs">First Name</TableHead>
                    <TableHead className="text-neutral-500 font-semibold uppercase tracking-widest text-xs">Last Name</TableHead>
                    <TableHead className="text-neutral-500 font-semibold uppercase tracking-widest text-xs">Tags</TableHead>
                    <TableHead className="text-neutral-500 font-semibold uppercase tracking-widest text-xs">Status</TableHead>
                    <TableHead className="text-neutral-500 font-semibold uppercase tracking-widest text-xs">Subscribed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id} className="border-neutral-800/50 hover:bg-neutral-900/40 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(sub.id)}
                          onCheckedChange={() => toggleSelect(sub.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-neutral-100">{sub.email}</TableCell>
                      <TableCell className="text-neutral-400">{sub.first_name || '--'}</TableCell>
                      <TableCell className="text-neutral-400">{sub.last_name || '--'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(sub.tags || []).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-violet-400 border-violet-500/30 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-neutral-500 text-sm">{formatDate(sub.subscribed_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-neutral-600">
            Showing {filteredSubscribers.length} of {subscribers.length} subscriber(s)
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-neutral-800/50 text-center">
        <p className="text-neutral-600 text-sm">Powered by Vera.AI Intelligence Engine &copy; 2026 InnovareAI</p>
      </footer>
    </div>
  )
}
