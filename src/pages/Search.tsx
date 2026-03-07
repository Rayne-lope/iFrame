import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Sparkles } from 'lucide-react'
import { searchMulti } from '@/api/tmdb'
import { useDebounce } from '@/hooks/useDebounce'
import MovieGrid from '@/components/ui/MovieGrid'
import type { MediaItem } from '@/types/tmdb'

type FilterTab = 'all' | 'movie' | 'tv'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [inputValue, setInputValue] = useState(initialQuery)
  const [filter, setFilter] = useState<FilterTab>('all')

  const debouncedQuery = useDebounce(inputValue, 350)

  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [debouncedQuery, setSearchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  })

  const allResults = (data?.results ?? []) as MediaItem[]
  const filtered =
    filter === 'all'
      ? allResults.filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      : allResults.filter((item) => item.media_type === filter)

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'movie', label: 'Movies' },
    { key: 'tv', label: 'TV' },
  ]

  return (
    <div className="page-shell">
      <section className="page-block p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="page-title">Search Library</h1>
            <p className="page-subtitle mt-1">Find movies and series with live TMDB discovery.</p>
          </div>
          <span className="gold-chip">
            <Sparkles className="w-3.5 h-3.5" />
            Smart Results
          </span>
        </div>

        <div className="search-page-input-shell mb-4">
          <SearchIcon className="search-page-input-icon w-5 h-5" />
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Search movies, TV shows, cast..."
            autoFocus
            className="search-page-input"
          />
        </div>

        {debouncedQuery.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={
                  filter === tab.key
                    ? 'gold-chip !text-sm'
                    : 'muted-chip !text-sm hover:text-foreground hover:border-accent/35 transition-colors'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6">
        {debouncedQuery.length > 1 && !isLoading && filtered.length > 0 && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{debouncedQuery}"
            </p>
          </div>
        )}

        {isLoading && debouncedQuery.length > 1 && <MovieGrid items={[]} loading />}

        {!isLoading && debouncedQuery.length > 1 && filtered.length === 0 && (
          <div className="page-block p-8 sm:p-12 text-center">
            <SearchIcon className="w-14 h-14 text-muted-foreground/70 mx-auto mb-4" />
            <p className="text-foreground font-semibold text-lg">No results for "{debouncedQuery}"</p>
            <p className="text-muted-foreground text-sm mt-2">Try another title, year, or keyword.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && <MovieGrid items={filtered} />}

        {debouncedQuery.length <= 1 && (
          <div className="page-block p-8 sm:p-12 text-center">
            <SearchIcon className="w-14 h-14 text-muted-foreground/70 mx-auto mb-4" />
            <p className="text-foreground font-semibold">Start typing to search</p>
            <p className="text-muted-foreground text-sm mt-1">At least 2 characters to begin.</p>
          </div>
        )}
      </div>
    </div>
  )
}
