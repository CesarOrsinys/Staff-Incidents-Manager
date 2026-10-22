import { IAuthRepository } from '../ports/IAuthRepository.js';
import { ManagerUser } from '../domain/entities/ManagerUser.js';

export class AuthenticateManagerUseCase {
  constructor(private authRepo: IAuthRepository) {}

  async execute(usernameOrEmail: string, password: string): Promise<ManagerUser> {
    if (!usernameOrEmail || !password) {
      throw new Error('errMissingCredentials');
    }

    const user = await this.authRepo.authenticate(usernameOrEmail, password);
    if (!user) {
      throw new Error('errInvalidCredentials');
    }

    if (!user.active) {
      throw new Error('errUserInactive');
    }

    return user;
  }
}
