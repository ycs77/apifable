import MiniSearch from 'minisearch'

export function findSimilarNames(input: string, candidates: string[], limit = 5): string[] {
  const normalizedInput = input.trim().toLowerCase()
  if (!normalizedInput) return []

  const uniqueCandidates = [...new Set(candidates)]

  const substringMatches = uniqueCandidates
    .filter(candidate => {
      const normalizedCandidate = candidate.toLowerCase()
      return normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate)
    })
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(normalizedInput) ? 0 : 1
      const bStarts = b.toLowerCase().startsWith(normalizedInput) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      if (a.length !== b.length) return a.length - b.length
      return a.localeCompare(b)
    })

  if (substringMatches.length > 0) {
    return substringMatches.slice(0, limit)
  }

  const ms = new MiniSearch({
    fields: ['name'],
    idField: 'name',
  })

  ms.addAll(uniqueCandidates.map(name => ({ name })))

  return ms
    .search(input, {
      fuzzy: 0.2,
      prefix: true,
      boost: { name: 2 },
    })
    .map(result => result.id as string)
    .slice(0, limit)
}
