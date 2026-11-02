import { Redis } from "ioredis";

export function createValkeyClient(url = process.env.VALKEY_URL ?? "redis://localhost:6379"): Redis {
  const client = new Redis(url, {
    enableOfflineQueue: false, 
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    commandTimeout: 500,       
    retryStrategy: (times) => Math.min(times * 200, 2000), // reconnexion en arrière-plan
  });
  
  client.on("error", () => {});
  return client;
}
