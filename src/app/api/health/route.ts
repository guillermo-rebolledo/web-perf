import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Redis from "ioredis";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  // If HEALTH_SECRET is configured, require it via x-health-secret header.
  if (env.HEALTH_SECRET) {
    const provided = request.headers.get("x-health-secret");
    if (provided !== env.HEALTH_SECRET) {
      return new NextResponse(null, { status: 401 });
    }
  }

  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);

  const status = db && redis ? "ok" : "degraded";
  const httpStatus = status === "ok" ? 200 : 503;

  return NextResponse.json({ status, db, redis }, { status: httpStatus });
}

async function checkDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    connectTimeout: 3000,
    maxRetriesPerRequest: 0,
    lazyConnect: true,
  });

  try {
    await client.connect();
    await client.ping();
    return true;
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}
