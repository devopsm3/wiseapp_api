export const toNumberSafe = (v: any): number | null => {
    if (v === null || v === undefined) return null
    if (typeof v === "number") return v
    if (typeof v === "string") {
        const n = Number(v)
        return isNaN(n) ? null : n
    }
    // Prisma Decimal has toNumber()
    if (typeof v === "object" && typeof v.toNumber === "function") {
        try {
            return v.toNumber()
        } catch {
            return null
        }
    }
    // fallback
    const n = Number(v)
    return isNaN(n) ? null : n
}

export const formatTimeFromNow = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
  
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
  
    if (minutes < 60) {
        // Less than 1 hour -> show minutes only
        return `${minutes}min`
    }
  
    if (hours < 24) {
        // Less than 24 hours -> show hours + minutes
        const mins = minutes % 60
        return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`
    }
  
    // More than 1 day -> show days + hours
    const hrs = hours % 24
    return `${days}d${hrs > 0 ? ` ${hrs}h` : ""}`
}
  
export const formatDateTime = (date: Date): string => {
    const pad = (num: number): string => String(num).padStart(2, "0")
  
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1) // Months are 0-based
    const year = date.getFullYear()
  
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
  
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}