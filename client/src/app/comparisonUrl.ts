function uniqueIds(candidateId?: string | null, candidateIds: string[] = []) {
  return [...new Set([candidateId, ...candidateIds].filter((id): id is string => Boolean(id && id.trim())))];
}

export function buildComparisonUrl(referenceId?: string | null, candidateId?: string | null, candidateIds: string[] = []) {
  const params = new URLSearchParams();
  const selectedCandidates = uniqueIds(candidateId, candidateIds);
  const primaryCandidateId = candidateId?.trim() || selectedCandidates[0];

  if (referenceId?.trim()) params.set("referenceId", referenceId);
  if (primaryCandidateId) params.set("candidateId", primaryCandidateId);
  selectedCandidates.filter((id) => id !== primaryCandidateId).forEach((id) => params.append("candidateIds", id));

  const search = params.toString();
  return search ? `/compare?${search}` : "/compare";
}
