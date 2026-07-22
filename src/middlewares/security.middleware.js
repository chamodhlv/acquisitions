import aj from '#config/arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';

    let limit;
    let message;

    switch (role) {
      case 'admin':
        limit = 20;
        message = 'Too many requests from admin. Please try again later.';
        break;
      case 'user':
        limit = 10;
        message = 'Too many requests from user. Please try again later.';
        break;
      case 'guest':
      default:
        limit = 5;
        message = 'Too many requests from guest. Please try again later.';
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '30s',
        max: limit,
        name: `${role}-rate-limit`,
      })
    );

    const decision = await client.protect(req);

    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn(`Bot request blocked`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(403).json({ error: 'Access denied. Bot detected.' });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn(`Shield request blocked`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({ error: 'Access denied. Shield detected.' });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn(`Rate limit, request blocked`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(429).json({ error: message });
    }

    next();
  } catch (error) {
    logger.error('Error in Arcjet middleware:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'something went wrong with the security middleware',
    });
  }
};

export default securityMiddleware;
