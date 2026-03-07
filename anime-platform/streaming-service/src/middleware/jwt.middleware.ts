import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    this.secret = secret;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, this.secret) as any;
        req.headers['x-user-id'] = decoded.sub || decoded.id;
      } catch (err) {
        this.logger.warn('Invalid JWT token', err.message);
      }
    }
    next();
  }
}
