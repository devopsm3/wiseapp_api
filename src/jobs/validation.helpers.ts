import { prisma } from "../prisma"

export async function updateSourceMetrics(sourceId: number): Promise<void> {
    // Get all validation results for this source's posts
    const validations = await prisma.postValidation.findMany({
        where: {
            SourcePost: {
                sourceId: sourceId
            }
        },
        select: {
            exists: true,
            errorMessage: true
        }
    })

    // Only count successful checks (no errors)
    const successfulChecks = validations.filter(v => !v.errorMessage)
    const totalChecks = successfulChecks.length
    const deletedCount = successfulChecks.filter(v => !v.exists).length

    if (totalChecks === 0) {
        return
    }
    // Calculate metrics

    // Update source
    await prisma.source.update({
        where: { id: sourceId },
        data: {
            deleted_count: deletedCount
        }
    })

    console.log(`📊 Updated source ${sourceId} => Deleted: ${deletedCount}`)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldCheckPost(postCreatedAt: Date, currentDay: number): boolean {
    const now = new Date()
    const ageInDays = Math.floor((now.getTime() - postCreatedAt.getTime()) / (1000 * 60 * 60 * 24))

    if (ageInDays < 7) {
        // Recent posts: check daily
        return true
    } else if (ageInDays >= 7 && ageInDays < 30) {
        // Medium age: check every 3 days
        return true
        // return currentDay % 3 === 0
    } else {
        // Old posts: check every 7 days (weekly)
        return true
        // return currentDay % 7 === 0
    }
}
