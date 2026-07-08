import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { LoginUserDto } from "./dto/login-dto";
import * as bcrypt from 'bcrypt';



@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async login(loginUserDto: LoginUserDto) {
  const { username, password } = loginUserDto;

  const user = await this.userRepository.findOne({
    where: {
      name: username,
    },
    relations: {
      role: true,
    },
  });

  if (!user) {
    throw new UnauthorizedException(
      'Usuario o contraseña incorrectos',
    );
  }

  const validPassword = await bcrypt.compare(
    password,
    user.password,
  );

  if (!validPassword) {
    throw new UnauthorizedException(
      'Usuario o contraseña incorrectos',
    );
  }

  const roleName = user.role?.name?.trim() || 'cajero';

  return {
    message: 'Inicio de sesión exitoso',
    token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
    user: {
      id: user.id,
      name: user.name,
      fullName: user.name,
      username: user.name,
      email: user.name.includes('@') ? user.name : `${user.name}@candyland.local`,
      role: roleName,
      roleData: user.role ? { id: user.role.id, name: roleName, isActive: user.role.isActive } : null,
    },
  };
}
}