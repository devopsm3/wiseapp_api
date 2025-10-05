import { PrismaClient, PlatformName, SourcePrice } from "@prisma/client"
import { faker } from "@faker-js/faker"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding sources...")

    for (let i = 0; i < 200; i++) {
        const sourcePrice = faker.helpers.arrayElement([
            SourcePrice.MONTHLY,
            SourcePrice.LIFETIME,
            SourcePrice.FREE,
        ])
        await prisma.source.create({
            data: {
                platform_logo: PlatformName.TELEGRAM,
                platform_user_picture: faker.image.avatar(),
                user_id_source: faker.internet.username(),
                user_name_source: faker.internet.username(),
                user_username_source: faker.internet.username(),
                user_db_id: faker.number.int({ min: 1, max: 1000 }),
                user_verified: faker.datatype.boolean(),
                user_creation_date: faker.date.past().getTime() / 1000,
                followers_count: Number(faker.number.int({ min: 100, max: 100000 })),
                source_price: sourcePrice,
                source_price_value: sourcePrice === SourcePrice.FREE ? null : String(faker.number.int({ min: 10, max: 50 })),
                price: sourcePrice === SourcePrice.FREE ? null : Number(faker.number.int({ min: 100, max: 5000 })),
        
                source_activated: faker.datatype.boolean(),
                source_reverse_signal_activated: faker.datatype.boolean(),

                source_total_quantity_signals: faker.number.int({ min: 0, max: 500 }),
                source_global_probility: faker.number.int({ min: 0, max: 100 }),

                source_reverse_signal_profit: faker.number.int({ min: 0, max: 100 }),

                source_bullish_total_quantity: faker.number.int({ min: 0, max: 500 }),
                source_bullish_percentage: faker.number.int({ min: 0, max: 100 }),
                source_bullish_probility: faker.number.int({ min: 0, max: 100 }),

                source_bearish_total_quantity: faker.number.int({ min: 0, max: 500 }),
                source_bearish_percentage: faker.number.int({ min: 0, max: 100 }),
                source_bearish_probility: faker.number.int({ min: 0, max: 100 }),

                btc_total_quantity: faker.number.int({ min: 0, max: 500 }),
                btc_probility: faker.number.int({ min: 0, max: 100 }),

                eth_total_quantity: faker.number.int({ min: 0, max: 500 }),
                eth_probility: faker.number.int({ min: 0, max: 100 }),

                sol_total_quantity: faker.number.int({ min: 0, max: 500 }),
                sol_probility: faker.number.int({ min: 0, max: 100 }),

                alts_total_quantity: faker.number.int({ min: 0, max: 500 }),
                alts_probility: faker.number.int({ min: 0, max: 100 }),

                createdAt: new Date(),
                updatedAt: new Date(),
            },
        })
    }

    console.log("✅ Done seeding!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
