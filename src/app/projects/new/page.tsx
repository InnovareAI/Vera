'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useWorkspace } from '@/contexts/AuthContext'
import type { PlatformId } from '@/types/project'

const STEPS = ['Brand Info', 'Products', 'ICP', 'Tone of Voice', 'Platforms']

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

export default function NewProjectPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Brand Info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [secondaryColor, setSecondaryColor] = useState('#a855f7')

  // Step 2: Products
  const [products, setProducts] = useState<ProductForm[]>([{ name: '', description: '', url: '' }])

  // Step 3: ICP
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [targetIndustries, setTargetIndustries] = useState<string[]>([])
  const [painPoints, setPainPoints] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [companySize, setCompanySize] = useState('')
  const [roleInput, setRoleInput] = useState('')
  const [industryInput, setIndustryInput] = useState('')
  const [painInput, setPainInput] = useState('')
  const [goalInput, setGoalInput] = useState('')

  // Step 4: Tone of Voice
  const [style, setStyle] = useState('professional')
  const [formality, setFormality] = useState('semi-formal')
  const [personality, setPersonality] = useState<string[]>([])
  const [personalityInput, setPersonalityInput] = useState('')
  const [dosText, setDosText] = useState('')
  const [dontsText, setDontsText] = useState('')

  // Step 5: Platforms
  const [enabledPlatforms, setEnabledPlatforms] = useState<PlatformId[]>([])

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

      if (data.description) setDescription(data.description)
      if (data.industry) setIndustry(data.industry)

      if (data.products?.length > 0) {
        setProducts(data.products.map((p: { name: string; description: string }) => ({
          name: p.name,
          description: p.description || '',
          url: '',
        })))
      }

      if (data.icp) {
        if (data.icp.target_roles?.length > 0) setTargetRoles(data.icp.target_roles)
        if (data.icp.target_industries?.length > 0) setTargetIndustries(data.icp.target_industries)
        if (data.icp.pain_points?.length > 0) setPainPoints(data.icp.pain_points)
        if (data.icp.goals?.length > 0) setGoals(data.icp.goals)
        if (data.icp.company_size) setCompanySize(data.icp.company_size)
      }

      if (data.tone_of_voice) {
        if (data.tone_of_voice.style) setStyle(data.tone_of_voice.style)
        if (data.tone_of_voice.formality) setFormality(data.tone_of_voice.formality)
        if (data.tone_of_voice.personality?.length > 0) setPersonality(data.tone_of_voice.personality)
      }
    } catch (err: any) {
      console.error('Brand extraction failed:', err)
      setError(err.message || 'Failed to extract brand info from website.')
    } finally {
      setExtracting(false)
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

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0
    return true
  }

  const handleSubmit = async () => {
    if (!currentWorkspace) return
    setSubmitting(true)
    setError(null)

    const body = {
      workspace_id: currentWorkspace.id,
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
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create project')
      }

      const data = await res.json()
      router.push(`/projects/${data.id}`)
    } catch (err: any) {
      console.error('Failed to create project:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-6">Please log in and select a workspace to continue.</p>
          <Link href="/login" className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl">
            Go to Login
          </Link>
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-violet-500/30">
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-40" />

      <header className="relative z-50 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white italic">V</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">Vera.AI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Dashboard
              </Link>
              <Link href="/projects" className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg transition-all">
                Projects
              </Link>
              <Link href="/settings" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Link href="/projects" className="text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors">
              Projects
            </Link>
            <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">New</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Create a New Project</h1>
          <p className="text-lg text-gray-400">Set up your brand, products, audience, and channels.</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-3">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => { if (i < step || canProceed()) setStep(i) }}
              className="flex items-center gap-2 group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i === step
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20'
                    : i < step
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-gray-800 text-gray-600 border border-gray-700'
                }`}
              >
                {i < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-widest hidden sm:block ${
                  i === step ? 'text-white' : i < step ? 'text-violet-400' : 'text-gray-600'
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px hidden sm:block ${i < step ? 'bg-violet-500/40' : 'bg-gray-800'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 space-y-6">
          {/* Step 1: Brand Info */}
          {step === 0 && (
            <>
              <h2 className="text-2xl font-black text-white">Brand Info</h2>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. InnovareAI"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this brand/project do?"
                  rows={3}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Website URL</label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
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
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. AI/Tech, SaaS, Healthcare"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Products */}
          {step === 1 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Products & Services</h2>
                <button
                  onClick={addProduct}
                  className="px-4 py-2 text-sm font-bold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 rounded-lg border border-violet-500/20 transition-all"
                >
                  + Add Product
                </button>
              </div>
              <div className="space-y-6">
                {products.map((product, i) => (
                  <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 space-y-4 relative">
                    {products.length > 1 && (
                      <button
                        onClick={() => removeProduct(i)}
                        className="absolute top-4 right-4 p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Product {i + 1}</div>
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">Name</label>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => updateProduct(i, 'name', e.target.value)}
                        placeholder="Product name"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">Description</label>
                      <textarea
                        value={product.description}
                        onChange={(e) => updateProduct(i, 'description', e.target.value)}
                        placeholder="What does this product/service do?"
                        rows={2}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">URL (optional)</label>
                      <input
                        type="url"
                        value={product.url}
                        onChange={(e) => updateProduct(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3: ICP */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-black text-white">Ideal Customer Profile</h2>
              {renderTagInput('Target Roles', 'e.g. CTO, VP Engineering', targetRoles, setTargetRoles, roleInput, setRoleInput)}
              {renderTagInput('Target Industries', 'e.g. SaaS, FinTech', targetIndustries, setTargetIndustries, industryInput, setIndustryInput)}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Company Size</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  <option value="" className="bg-gray-900">Select size...</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size} className="bg-gray-900">{size} employees</option>
                  ))}
                </select>
              </div>
              {renderTagInput('Pain Points', 'e.g. Manual content creation', painPoints, setPainPoints, painInput, setPainInput)}
              {renderTagInput('Goals', 'e.g. Increase LinkedIn engagement', goals, setGoals, goalInput, setGoalInput)}
            </>
          )}

          {/* Step 4: Tone of Voice */}
          {step === 3 && (
            <>
              <h2 className="text-2xl font-black text-white">Tone of Voice</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors capitalize"
                  >
                    {STYLE_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-gray-900 capitalize">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Formality</label>
                  <select
                    value={formality}
                    onChange={(e) => setFormality(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors capitalize"
                  >
                    {FORMALITY_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-gray-900 capitalize">{f}</option>
                    ))}
                  </select>
                </div>
              </div>
              {renderTagInput('Personality Traits', 'e.g. Witty, Empathetic', personality, setPersonality, personalityInput, setPersonalityInput)}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Dos (one per line)</label>
                <textarea
                  value={dosText}
                  onChange={(e) => setDosText(e.target.value)}
                  placeholder={"Use data-driven insights\nReference industry trends\nShare personal anecdotes"}
                  rows={4}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Don&apos;ts (one per line)</label>
                <textarea
                  value={dontsText}
                  onChange={(e) => setDontsText(e.target.value)}
                  placeholder={"Avoid jargon overload\nDon't be salesy\nNo clickbait headlines"}
                  rows={4}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
              </div>
            </>
          )}

          {/* Step 5: Platforms */}
          {step === 4 && (
            <>
              <h2 className="text-2xl font-black text-white">Enable Platforms</h2>
              <p className="text-gray-500 text-sm">Select the channels this project will publish to.</p>
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
                      <div
                        className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-lg font-black mb-3 ${
                          active
                            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}
                      >
                        {platform.icon}
                      </div>
                      <span className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                        {platform.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.push('/projects')}
            className="px-6 py-3 text-gray-400 hover:text-white font-bold rounded-xl hover:bg-white/5 transition-all"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
