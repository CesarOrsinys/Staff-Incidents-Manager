import { Router, Request, Response } from 'express';
import { RepositoryContainer } from '../../src/adapters/infrastructure/di/RepositoryContainer.js';
import { AuthenticateManagerUseCase } from '../../src/core/usecases/AuthenticateManagerUseCase.js';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const authRepo = RepositoryContainer.getAuthRepository();
    const useCase = new AuthenticateManagerUseCase(authRepo);

    const user = await useCase.execute(username, password);
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    res.json({
      success: true,
      token,
      user
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err.message || 'errInvalidCredentials'
    });
  }
});

authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authRepo = RepositoryContainer.getAuthRepository();
    const user = await authRepo.getById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'errUserNotFound' });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const authRepo = RepositoryContainer.getAuthRepository();
    const users = await authRepo.getAll();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
