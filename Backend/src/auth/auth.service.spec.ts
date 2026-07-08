import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('retorna un token y datos del usuario cuando las credenciales son válidas', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'admin',
      password: passwordHash,
      role: { id: 'role-1', name: 'admin', isActive: true },
    });

    const result = await service.login({ username: 'admin', password: 'secret123' });

    expect(result.message).toBe('Inicio de sesión exitoso');
    expect(result.token).toBeDefined();
    expect(result.user.role).toBe('admin');
  });

  it('lanza UnauthorizedException si el usuario no existe', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.login({ username: 'no-user', password: 'x' })).rejects.toThrow(UnauthorizedException);
  });
});
