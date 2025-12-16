import { prisma } from "../prisma"


export function calculateDeletionRate(totalChecks: number, deletedCount: number): number {
    if (totalChecks === 0) return 0
    return (deletedCount / totalChecks) * 100
}

export function calculateTruthScore(deletionRate: number, totalPosts: number): number {
    // Base score is inverse of deletion rate
    const baseScore = 100 - deletionRate

    // Confidence factor: more posts = higher confidence in the score
    // Reaches 100% confidence at 100+ posts
    const confidenceFactor = Math.min(1, totalPosts / 100)

    // Apply confidence weighting 
    // Low confidence sources get pulled toward 50 (neutral)
    const weightedScore = baseScore * confidenceFactor + 50 * (1 - confidenceFactor)

    return Math.max(0, Math.min(100, weightedScore))
}

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
    const totalPosts = await prisma.sourcePost.count({
        where: { sourceId }
    })

    // Calculate metrics
    const deletionRate = calculateDeletionRate(totalChecks, deletedCount)
    const truthScore = calculateTruthScore(deletionRate, totalPosts)

    // Update source
    await prisma.source.update({
        where: { id: sourceId },
        data: {
            source_validation_total_checks: totalChecks,
            source_validation_deleted_count: deletedCount,
            source_validation_deletion_rate: deletionRate,
            source_validation_last_check: new Date(),
            source_truth_score: truthScore
        }
    })

    console.log(`📊 Updated source ${sourceId} metrics:`)
    console.log(`   ✓ Checks: ${totalChecks}, Deleted: ${deletedCount}`)
    console.log(`   ✓ Deletion Rate: ${deletionRate.toFixed(2)}%`)
    console.log(`   ✓ Truth Score: ${truthScore.toFixed(2)}/100`)
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
