import { generateSourceRecommendations } from "./src/providers/AgentAI/recommendations.provider";
import * as dotenv from 'dotenv';
dotenv.config();

const mockStats = {
    sourceName: "CryptoKing",
    platform: "TELEGRAM",
    stats: {
        optimal_exit: [],
        coins: [{
            name: "BTC",
            totalProfitPercentage: "7.44%",
            count: 3,
            goodSignals: 2,
            badSignals: 1
        },
        {
            name: "ETH",
            totalProfitPercentage: "13%",
            count: 5,
            goodSignals: 1,
            badSignals: 4
        }],
        top: [
            { percentage: "1%", weight: 0.5, profitability: 120 },
            { percentage: "5%", weight: 0.3, profitability: 80 },
            { percentage: "10%", weight: 0.2, profitability: 40 }
        ]
    },
    recentSignalsCount: 50,
    followers: 1000
};

console.log("Testing generateSourceRecommendations...");
generateSourceRecommendations(mockStats).then(recs => {
    console.log("Recommendations:", JSON.stringify(recs, null, 2));
}).catch(err => {
    console.error("Error:", err);
});
