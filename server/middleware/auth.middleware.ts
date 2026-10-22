import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'staff_incidents_jwt_secret_dev_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'errUnauthorized', message: 'Token de autorización requerido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    if (decoded.role !== 'MANAGER') {
      res.status(403).json({ error: 'errForbidden', message: 'Acceso restringido a Gerencia.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'errInvalidToken', message: 'Token no válido o expirado.' });
  }
}

export function generateToken(user: { id: string; username: string; role: string }): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
