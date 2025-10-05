export const getStartTimeISO_LocalMidnight = (daysAgo = 0): string => {
    const now = new Date()
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    localMidnight.setDate(localMidnight.getDate() - Math.max(0, Math.floor(daysAgo)))
    return localMidnight.toISOString()
}