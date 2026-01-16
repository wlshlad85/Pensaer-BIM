/**
 * Pensaer Fuzzy Search
 *
 * Simple but effective fuzzy search implementation.
 * No external dependencies required.
 */

export interface SearchResult<T> {
  item: T;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: string;
  indices: [number, number][]; // Start and end indices of matches
}

/**
 * Calculate fuzzy match score between query and text.
 * Returns score (0-1) and match indices.
 */
function fuzzyMatch(
  query: string,
  text: string
): { score: number; indices: [number, number][] } | null {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) {
    return { score: 1, indices: [[0, text.length - 1]] };
  }

  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) {
    return { score: 0.9, indices: [[0, query.length - 1]] };
  }

  // Contains query as substring
  const substringIndex = textLower.indexOf(queryLower);
  if (substringIndex !== -1) {
    return {
      score: 0.7 - substringIndex * 0.01, // Penalize later matches
      indices: [[substringIndex, substringIndex + query.length - 1]],
    };
  }

  // Fuzzy character matching
  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;
  const indices: [number, number][] = [];
  let matchStart = -1;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      if (matchStart === -1) matchStart = i;

      queryIndex++;
      consecutiveMatches++;

      // Bonus for consecutive matches
      score += 1 + consecutiveMatches * 0.5;

      // Bonus for matching at word boundaries
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '-') {
        score += 2;
      }
    } else {
      if (matchStart !== -1) {
        indices.push([matchStart, i - 1]);
        matchStart = -1;
      }
      consecutiveMatches = 0;
    }
  }

  // Close final match range
  if (matchStart !== -1) {
    indices.push([matchStart, matchStart + consecutiveMatches - 1]);
  }

  // All characters must match
  if (queryIndex !== queryLower.length) {
    return null;
  }

  // Normalize score (0 to 0.6 range for fuzzy matches)
  const normalizedScore = Math.min(0.6, score / (query.length * 3));

  return { score: normalizedScore, indices };
}

/**
 * Search through items using fuzzy matching.
 *
 * @param items - Array of items to search
 * @param query - Search query string
 * @param getSearchFields - Function to extract searchable text fields from an item
 * @returns Sorted array of matching results with scores
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  getSearchFields: (item: T) => { field: string; value: string; weight?: number }[]
): SearchResult<T>[] {
  if (!query.trim()) {
    // No query - return all items with neutral score
    return items.map((item) => ({ item, score: 0, matches: [] }));
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const fields = getSearchFields(item);
    let bestScore = 0;
    const matches: SearchMatch[] = [];

    for (const { field, value, weight = 1 } of fields) {
      const match = fuzzyMatch(query, value);
      if (match) {
        const weightedScore = match.score * weight;
        if (weightedScore > bestScore) {
          bestScore = weightedScore;
        }
        matches.push({ field, indices: match.indices });
      }
    }

    if (bestScore > 0) {
      results.push({ item, score: bestScore, matches });
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Simple search helper for command palette.
 * Searches label, description, and keywords.
 */
export function searchCommands<T extends { label: string; description: string; keywords?: string[] }>(
  commands: T[],
  query: string
): T[] {
  if (!query.trim()) {
    return commands;
  }

  const results = fuzzySearch(commands, query, (cmd) => [
    { field: 'label', value: cmd.label, weight: 1.5 },
    { field: 'description', value: cmd.description, weight: 1 },
    ...(cmd.keywords || []).map((kw) => ({ field: 'keyword', value: kw, weight: 0.8 })),
  ]);

  return results.map((r) => r.item);
}
