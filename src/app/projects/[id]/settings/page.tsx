'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { Project, PlatformId } from '@/types/project'

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+']
const STYLE_OPTIONS = ['professional', 'casual', 'technical', 'creative', 'educational']
const FORMALITY_OPTIONS = ['formal', 'semi-formal', 'casual']

const PLATFORMS: { id: PlatformId; label: string; icon: string }[] = [
  { id: 'linkedin', label: 'LinkedIn', icon: 'in' },
  { id: 'twitter', label: 'X (Twitter)', icon: 'X' },
  { id: 'medium', label: 'Medium', icon: 'M' },
  { id: 'newsletter', label: 'Newsletter', icon: 'NL' },
  { id: 'instagram', label: 'Instagram', icon: 'IG' },
  { id: 'tiktok', label: 'TikTok', icon: 'TT' },
  { id: 'blog', label: 'Blog', icon: 'B' },
]

interface ProductForm {
  name: string
  description: string
  url: string
}

export default function ProjectSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brand: true,
    products: false,
    icp: false,
    tone: false,
    platforms: false,
  })

  // Brand Info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [secondaryColor, setSecondaryColor] = useState('#a855f7')

  // Products
  const [products, setProducts] = useState<ProductForm[]>([{ name: '', description: '', url: '' }])

  // ICP
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [targetIndustries, setTargetIndustries] = useState<string[]>([])
  const [painPoints, setPainPoints] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [companySize, setCompanySize] = useState('')
  const [roleInput, setRoleInput] = useState('')
  const [industryInput, setIndustryInput] = useState('')
  const [painInput, setPainInput] = useState('')
  const [goalInput, setGoalInput] = useState('')

  // Tone of Voice
  const [style, setStyle] = useState('professional')
  const [formality, setFormality] = useState('semi-formal')
  const [personality, setPersonality] = useState<string[]>([])
  const [personalityInput, setPersonalityInput] = useState('')
  const [dosText, setDosText] = useState('')
  const [dontsText, setDontsText] = useState('')

  // Platforms
  const [enabledPlatforms, setEnabledPlatforms] = useState<PlatformId[]>([])

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const data: Project = await res.json()

      setName(data.name || '')
      setDescription(data.description || '')
      setWebsiteUrl(data.website_url || '')
      setIndustry(data.industry || '')
      setPrimaryColor(data.brand_colors?.primary || '#7c3aed')
      setSecondaryColor(data.brand_colors?.secondary || '#a855f7')

      if (data.products && data.products.length > 0) {
        setProducts(data.products.map((p) => ({ name: p.name, description: p.description, url: p.url || '' })))
      }

      setTargetRoles(data.icp?.target_roles || [])
      setTargetIndustries(data.icp?.target_industries || [])
      setCompanySize(data.icp?.company_size || '')
      setPainPoints(data.icp?.pain_points || [])
      setGoals(data.icp?.goals || [])

      setStyle(data.tone_of_voice?.style || 'professional')
      setFormality(data.tone_of_voice?.formality || 'semi-formal')
      setPersonality(data.tone_of_voice?.personality || [])
      setDosText((data.tone_of_voice?.dos || []).join('\n'))
      setDontsText((data.tone_of_voice?.donts || []).join('\n'))

      setEnabledPlatforms(data.enabled_platforms || [])
    } catch (err) {
      console.error('Failed to fetch project:', err)
      setError('Failed to load project.')
    } finally {
      setLoading(false)
    }
  }

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    input: string,
    setInput: (v: string) => void,
    tags: string[],
    setTags: (v: string[]) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed])
      }
      setInput('')
    }
  }

  const removeTag = (tags: string[], setTags: (v: string[]) => void, index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const togglePlatform = (id: PlatformId) => {
    setEnabledPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const addProduct = () => {
    setProducts([...products, { name: '', description: '', url: '' }])
  }

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index))
    }
  }

  const updateProduct = (index: number, field: keyof ProductForm, value: string) => {
    const updated = [...products]
    updated[index] = { ...updated[index], [field]: value }
    setProducts(updated)
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      website_url: websiteUrl.trim() || null,
      industry: industry.trim() || null,
      brand_colors: { primary: primaryColor, secondary: secondaryColor },
      products: products.filter((p) => p.name.trim()).map((p) => ({
        name: p.name.trim(),
        description: p.description.trim(),
        url: p.url.trim() || undefined,
      })),
      icp: {
        target_roles: targetRoles.length > 0 ? targetRoles : undefined,
        target_industries: targetIndustries.length > 0 ? targetIndustries : undefined,
        company_size: companySize || undefined,
        pain_points: painPoints.length > 0 ? painPoints : undefined,
        goals: goals.length > 0 ? goals : undefined,
      },
      tone_of_voice: {
        style,
        formality,
        personality: personality.length > 0 ? personality : undefined,
        dos: dosText.trim() ? dosText.trim().split('\n').filter(Boolean) : undefined,
        donts: dontsText.trim() ? dontsText.trim().split('\n').filter(Boolean) : undefined,
      },
      enabled_platforms: enabledPlatforms,
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update project')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Failed to update project:', err)
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      router.push('/projects')
    } catch (err) {
      console.error('Failed to delete project:', err)
      setError('Failed to delete project.')
      setDeleting(false)
    }
  }

  const fetchBrandInfo = async () => {
    if (!websiteUrl.trim()) return
    setExtracting(true)
    setError(null)

    try {
      const res = await fetch('/api/projects/extract-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to extract brand info')
      }

      const { data } = await res.json()

      // Populate fields — override existing values
      if (data.description) setDescription(data.description)
      if (data.industry) setIndustry(data.industry)

      if (data.products?.length > 0) {
        setProducts(data.products.map((p: { name: string; description: string }) => ({
          name: p.name,
          description: p.description || '',
          url: '',
        })))
        setOpenSections((prev) => ({ ...prev, products: true }))
      }

      if (data.icp) {
        if (data.icp.target_roles?.length > 0) setTargetRoles(data.icp.target_roles)
        if (data.icp.target_industries?.length > 0) setTargetIndustries(data.icp.target_industries)
        if (data.icp.pain_points?.length > 0) setPainPoints(data.icp.pain_points)
        if (data.icp.goals?.length > 0) setGoals(data.icp.goals)
        if (data.icp.company_size) setCompanySize(data.icp.company_size)
        setOpenSections((prev) => ({ ...prev, icp: true }))
      }

      if (data.tone_of_voice) {
        if (data.tone_of_voice.style) setStyle(data.tone_of_voice.style)
        if (data.tone_of_voice.formality) setFormality(data.tone_of_voice.formality)
        if (data.tone_of_voice.personality?.length > 0) setPersonality(data.tone_of_voice.personality)
        setOpenSections((prev) => ({ ...prev, tone: true }))
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Brand extraction failed:', err)
      setError(err.message || 'Failed to extract brand info from website.')
    } finally {
      setExtracting(false)
    }
  }

  const renderTagInput = (
    label: string,
    placeholder: string,
    tags: string[],
    setTags: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void
  ) => (
    <div>
      <label className="block text-sm font-bold text-gray-400 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 text-violet-400 text-sm font-bold rounded-full border border-violet-500/20"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tags, setTags, i)}
              className="hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => handleTagKeyDown(e, input, setInput, tags, setTags)}
        placeholder={placeholder}
        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
      />
      <p className="text-xs text-gray-600 mt-1">Press Enter to add</p>
    </div>
  )

  const renderSectionHeader = (key: string, title: string) => (
    <button
      onClick={() => toggleSection(key)}
      className="w-full flex items-center justify-between p-6 text-left"
    >
      <h2 className="text-xl font-black text-white">{title}</h2>
      <svg
        className={`w-5 h-5 text-gray-500 transition-transform ${openSections[key] ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Settings</h2>
        <p className="text-gray-500 text-sm">Configure your project brand, ICP, tone of voice, and platforms</p>
      </div>

      {/* Success Toast */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-emerald-400 text-sm font-bold">Project updated successfully!</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Brand Info */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
        {renderSectionHeader('brand', 'Brand Info')}
        {openSections.brand && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Project Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. InnovareAI" className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this brand/project do?" rows={3} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Website URL</label>
              <div className="flex gap-3">
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
                <button
                  type="button"
                  onClick={fetchBrandInfo}
                  disabled={extracting || !websiteUrl.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap text-sm"
                >
                  {extracting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Fetch Brand Info
                    </>
                  )}
                </button>
              </div>
              {extracting && (
                <p className="text-xs text-violet-400 mt-2 animate-pulse">Scanning website and extracting brand information with AI...</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Industry</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. AI/Tech, SaaS, Healthcare" className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent" />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent" />
                  <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
        {renderSectionHeader('products', 'Products & Services')}
        {openSections.products && (
          <div className="px-6 pb-6 space-y-4">
            <div className="flex justify-end">
              <button onClick={addProduct} className="px-4 py-2 text-sm font-bold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 rounded-lg border border-violet-500/20 transition-all">
                + Add Product
              </button>
            </div>
            {products.map((product, i) => (
              <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 space-y-4 relative">
                {products.length > 1 && (
                  <button onClick={() => removeProduct(i)} className="absolute top-4 right-4 p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Product {i + 1}</div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Name</label>
                  <input type="text" value={product.name} onChange={(e) => updateProduct(i, 'name', e.target.value)} placeholder="Product name" className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Description</label>
                  <textarea value={product.description} onChange={(e) => updateProduct(i, 'description', e.target.value)} placeholder="What does this product/service do?" rows={2} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">URL (optional)</label>
                  <input type="url" value={product.url} onChange={(e) => updateProduct(i, 'url', e.target.value)} placeholder="https://..." className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ICP */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
        {renderSectionHeader('icp', 'Ideal Customer Profile')}
        {openSections.icp && (
          <div className="px-6 pb-6 space-y-4">
            {renderTagInput('Target Roles', 'e.g. CTO, VP Engineering', targetRoles, setTargetRoles, roleInput, setRoleInput)}
            {renderTagInput('Target Industries', 'e.g. SaaS, FinTech', targetIndustries, setTargetIndustries, industryInput, setIndustryInput)}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Company Size</label>
              <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors">
                <option value="" className="bg-gray-900">Select size...</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size} className="bg-gray-900">{size} employees</option>
                ))}
              </select>
            </div>
            {renderTagInput('Pain Points', 'e.g. Manual content creation', painPoints, setPainPoints, painInput, setPainInput)}
            {renderTagInput('Goals', 'e.g. Increase LinkedIn engagement', goals, setGoals, goalInput, setGoalInput)}
          </div>
        )}
      </div>

      {/* Tone of Voice */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
        {renderSectionHeader('tone', 'Tone of Voice')}
        {openSections.tone && (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors capitalize">
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-gray-900 capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Formality</label>
                <select value={formality} onChange={(e) => setFormality(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors capitalize">
                  {FORMALITY_OPTIONS.map((f) => (
                    <option key={f} value={f} className="bg-gray-900 capitalize">{f}</option>
                  ))}
                </select>
              </div>
            </div>
            {renderTagInput('Personality Traits', 'e.g. Witty, Empathetic', personality, setPersonality, personalityInput, setPersonalityInput)}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Dos (one per line)</label>
              <textarea value={dosText} onChange={(e) => setDosText(e.target.value)} placeholder={"Use data-driven insights\nReference industry trends"} rows={4} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Don&apos;ts (one per line)</label>
              <textarea value={dontsText} onChange={(e) => setDontsText(e.target.value)} placeholder={"Avoid jargon overload\nDon't be salesy"} rows={4} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* Platforms */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
        {renderSectionHeader('platforms', 'Platforms')}
        {openSections.platforms && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {PLATFORMS.map((platform) => {
                const active = enabledPlatforms.includes(platform.id)
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-6 rounded-2xl border-2 text-center transition-all ${
                      active
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-gray-800 bg-gray-800/30 hover:border-gray-700'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-lg font-black mb-3 ${
                      active
                        ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      {platform.icon}
                    </div>
                    <span className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                      {platform.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-6 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold rounded-xl transition-all"
        >
          Delete Project
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-white mb-2">Delete Project</h3>
              <p className="text-gray-500 text-sm">
                Are you sure you want to delete <span className="text-white font-bold">{name}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold rounded-xl transition-all border border-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
