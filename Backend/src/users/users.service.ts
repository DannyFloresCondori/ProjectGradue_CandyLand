import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const { roleId, password, ...date } = createUserDto;

    const role = await this.findRoleOrThrow(createUserDto.roleId);

    // Validar administrador único
    if (role.name.toLowerCase() === 'Administrador' || role.name.toLowerCase() === 'admin') {
      const existingAdmin = await this.userRepository.findOne({
        where: {
          role: {
            id: role.id,
          },
        },
        relations: ['role'],
      });

      if (existingAdmin) {
        throw new BadRequestException('Ya existe un administrador registrado');
      }
    }
    //una  vez verificado la validacion de rol se hasheara el password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      ...date,
      role,
      password: hashedPassword,
    });

    const userSaved = await this.userRepository.save(user);

    return await this.userRepository.findOne({
      where: { id: userSaved.id },
      relations: ['role'],
    });
  }

  async findAll() {
    return await this.userRepository.find({ relations: ['role'] });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const userExist = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
    if (!userExist) {
      throw new NotFoundException(
        `Usuario con id${id} no encontrado en el sistema`,
      );
    }

    const { roleId, password, ...data } = updateUserDto;

    //en caso de que mande contraseña se hasheara
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    // En caso de que quiera cambiar de rol
    let role: Role | undefined;
    if (roleId) {
      role = await this.findRoleOrThrow(roleId);
    }

    const userUpdated = await this.userRepository.preload({
      id,
      ...data,
      ...(hashedPassword && { password: hashedPassword }),
      ...(role && { role }),
    });

    await this.userRepository.save(userUpdated!);
    return await this.userRepository.findOne({ where: { id }, relations: ['role'] });
  }

  async remove(id: string) {
    const userExist = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
    if (!userExist) {
      throw new NotFoundException(
        `Usuario con id${id} no encontrado en el sistema`,
      );
    }
    await this.userRepository.delete({ id });
    return { message: `Usuario eliminado correctamente` };
  }

  private async findRoleOrThrow(roleId: string) {
    const role = await this.roleRepository.findOneBy({
      id: roleId,
      isActive: true,
    });

    if (!role) {
      throw new NotFoundException(
        `Role con el id ${roleId} no existe o no esta activo`,
      );
    }
    return role;
  }
}
