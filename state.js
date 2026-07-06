// GET  /api/state  -> current shared board
// POST /api/state  -> merge supplied fields, bump version, save
// Backed by Upstash Redis (added to the Vercel project via the Marketplace).
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
});

const KEY = "seedboard:state";
const EMPTY = { version: 0, completed: [], reassignments: {}, added: [] };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL) {
    return res.status(500).json({ error: "Redis store is not connected. Add Upstash Redis to the Vercel project." });
  }

  try {
    if (req.method === "GET") {
      const state = (await redis.get(KEY)) || EMPTY;
      return res.status(200).json(state);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const cur = (await redis.get(KEY)) || EMPTY;
      const next = {
        version: (cur.version || 0) + 1,
        completed: Array.isArray(body.completed) ? body.completed : cur.completed,
        reassignments:
          body.reassignments && typeof body.reassignments === "object"
            ? body.reassignments
            : cur.reassignments,
        added: Array.isArray(body.added) ? body.added : cur.added,
        updatedAt: new Date().toISOString()
      };
      await redis.set(KEY, next);
      return res.status(200).json(next);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("state error", e);
    return res.status(500).json({ error: "Failed to read/write board state." });
  }
}
