import type { Request, Response } from 'express';

export function healthRoute(req: Request, res: Response) {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'admin',
      version: process.env.npm_package_version || '0.0.1',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'admin',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}



