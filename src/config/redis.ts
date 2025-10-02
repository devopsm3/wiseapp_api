const connection = {
    host: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    port: parseInt(process.env.REDIS_PORT as string)
}   

export default connection