'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface Brand {
    id: string
    name: string
    description?: string
    logo_url?: string
    voice_summary?: string
    created_at: string
}

interface BrandContextType {
    brands: Brand[]
    currentBrand: Brand | null
    setCurrentBrand: (brand: Brand) => void
    createBrand: (name: string, description?: string) => Promise<Brand | null>
    refreshBrands: () => Promise<void>
    isLoading: boolean
}

const BrandContext = createContext<BrandContextType | null>(null)

export function useBrand() {
    const context = useContext(BrandContext)
    if (!context) {
        throw new Error('useBrand must be used within a BrandProvider')
    }
    return context
}

export function BrandProvider({ children }: { children: ReactNode }) {
    const [brands, setBrands] = useState<Brand[]>([])
    const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchBrands()
    }, [])

    const fetchBrands = async () => {
        try {
            const res = await fetch('/api/brands')
            if (res.ok) {
                const data = await res.json()
                setBrands(data)

                // Set first brand as default if none selected
                if (data.length > 0 && !currentBrand) {
                    const savedBrandId = localStorage.getItem('vera_current_brand')
                    const savedBrand = savedBrandId
                        ? data.find((b: Brand) => b.id === savedBrandId)
                        : null
                    setCurrentBrand(savedBrand || data[0])
                }
            }
        } catch (error) {
            console.error('Failed to fetch brands:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSetCurrentBrand = (brand: Brand) => {
        setCurrentBrand(brand)
        localStorage.setItem('vera_current_brand', brand.id)
    }

    const createBrand = async (name: string, description?: string): Promise<Brand | null> => {
        try {
            const res = await fetch('/api/brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            })

            if (res.ok) {
                const newBrand = await res.json()
                setBrands(prev => [...prev, newBrand])
                return newBrand
            }
        } catch (error) {
            console.error('Failed to create brand:', error)
        }
        return null
    }

    return (
        <BrandContext.Provider value={{
            brands,
            currentBrand,
            setCurrentBrand: handleSetCurrentBrand,
            createBrand,
            refreshBrands: fetchBrands,
            isLoading,
        }}>
            {children}
        </BrandContext.Provider>
    )
}

// Brand Switcher Component
export function BrandSwitcher() {
    const { brands, currentBrand, setCurrentBrand, createBrand, isLoading } = useBrand()
    const [isOpen, setIsOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)

    const handleCreateBrand = async () => {
        if (!newName.trim()) return

        setCreating(true)
        const brand = await createBrand(newName)

        if (brand) {
            setCurrentBrand(brand)
            setShowCreate(false)
            setNewName('')
        }
        setCreating(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-xl animate-pulse">
                <div className="w-8 h-8 bg-gray-700 rounded-lg" />
                <div className="w-24 h-4 bg-gray-700 rounded" />
            </div>
        )
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
            >
                {/* Logo */}
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {currentBrand?.logo_url ? (
                        <img
                            src={currentBrand.logo_url}
                            alt={currentBrand.name}
                            className="w-full h-full rounded-lg object-cover"
                        />
                    ) : (
                        currentBrand?.name?.charAt(0) || '?'
                    )}
                </div>

                <div className="text-left">
                    <p className="text-white font-medium text-sm">
                        {currentBrand?.name || 'Select Brand'}
                    </p>
                </div>

                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute left-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                            {brands.map(brand => (
                                <button
                                    key={brand.id}
                                    onClick={() => {
                                        setCurrentBrand(brand)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 ${brand.id === currentBrand?.id ? 'bg-violet-500/10 border-l-2 border-violet-500' : ''
                                        }`}
                                >
                                    <div className="w-7 h-7 bg-gradient-to-br from-violet-500/50 to-purple-500/50 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                        {brand.name.charAt(0)}
                                    </div>
                                    <span className="text-white text-sm flex-1 text-left">{brand.name}</span>
                                    {brand.id === currentBrand?.id && (
                                        <span className="text-violet-400">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-gray-800" />

                        {showCreate ? (
                            <div className="p-3 space-y-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Brand name..."
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowCreate(false); setNewName('') }}
                                        className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateBrand}
                                        disabled={creating || !newName.trim()}
                                        className="flex-1 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-sm disabled:opacity-50"
                                    >
                                        {creating ? '...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                                <span className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center">+</span>
                                <span className="text-sm">Add Brand</span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
