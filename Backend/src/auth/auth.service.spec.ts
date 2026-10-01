import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock };
  let jwtService: JwtService;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'clave-de-prueba', signOptions: { expiresIn: '1h' } })],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('retorna un token y datos del usuario cuando las credenciales son válidas', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'admin',
      password: passwordHash,
      isActive: true,
      role: { id: 'role-1', name: 'admin', isActive: true },
    });

    const result = await service.login({ username: 'admin', password: 'secret123' });

    expect(result.message).toBe('Inicio de sesión exitoso');
    expect(result.user.role).toBe('admin');
    // el token es un JWT firmado que contiene el usuario y su rol
    const payload = await jwtService.verifyAsync(result.token);
    expect(payload).toMatchObject({ sub: 'user-1', username: 'admin', role: 'admin' });
  });

  it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1', name: 'admin', password: passwordHash, isActive: true,
      role: { id: 'role-1', name: 'admin', isActive: true },
    });

    await expect(service.login({ username: 'admin', password: 'otra' })).rejects.toThrow(UnauthorizedException);
  });

  it('impide el inicio de sesión de un usuario desactivado', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    userRepository.findOne.mockResolvedValue({
      id: 'user-2', name: 'cajero', password: passwordHash, isActive: false,
      role: { id: 'role-2', name: 'Cajero', isActive: true },
    });

    await expect(service.login({ username: 'cajero', password: 'secret123' })).rejects.toThrow(UnauthorizedException);
  });

  it('lanza UnauthorizedException si el usuario no existe', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.login({ username: 'no-user', password: 'x' })).rejects.toThrow(UnauthorizedException);
  });
});
