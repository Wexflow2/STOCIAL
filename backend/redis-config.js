const Redis = require('ioredis');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      redisClient.on('error', (err) => {
        console.log('Redis Client Error (optional - running without cache):', err.message);
        redisClient = null;
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected - caching enabled');
      });

      redisClient.connect().catch((err) => {
        console.log('⚠️  Redis not available - running without cache');
        redisClient = null;
      });
    } catch (err) {
      console.log('⚠️  Redis disabled - running without cache');
      redisClient = null;
    }
  }
  return redisClient;
};

const cacheMiddleware = (keyPrefix, ttl = 300) => {
  return async (req, res, next) => {
    const redis = getRedisClient();
    if (!redis || !redis.status === 'ready') {
      return next();
    }

    try {
      const key = `${keyPrefix}:${req.originalUrl || req.url}`;
      const cachedData = await redis.get(key);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redis.setex(key, ttl, JSON.stringify(data)).catch(() => {});
        return originalJson(data);
      };
      next();
    } catch (error) {
      next();
    }
  };
};

const invalidateCache = async (pattern) => {
  const redis = getRedisClient();
  if (!redis || redis.status !== 'ready') return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
};

module.exports = { getRedisClient, cacheMiddleware, invalidateCache };
