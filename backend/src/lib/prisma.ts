import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL não foi definida')
}

const adapter = new PrismaNeon({
  connectionString,
})

export const prisma = new PrismaClient({
  adapter,
})