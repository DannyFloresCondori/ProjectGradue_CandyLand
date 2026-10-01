import { roleGroupOf } from '../auth/auth.decorators';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Not, Repository } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { Sale, SalesStatus } from 'src/sale/entities/sale.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly configService: ConfigService,
  ) {}

  // Como la API exige autenticación, el primer administrador se crea al iniciar el
  // servidor si la base no tiene usuarios y el .env define ADMIN_USERNAME y ADMIN_PASSWORD.
  async onModuleInit() {
    if ((await this.userRepository.count()) > 0) return;

    const username = this.configService.get<string>('ADMIN_USERNAME');
    const password = this.configService.get<string>('ADMIN_PASSWORD');
    if (!username || !password) {
      this.logger.warn('No hay usuarios registrados: defina ADMIN_USERNAME y ADMIN_PASSWORD en .env para crear el administrador inicial.');
      return;
    }

    const adminRole = (await this.roleRepository.find()).find((role) => roleGroupOf(role.name) === 'admin');
    if (!adminRole) {
      this.logger.warn('No existe un rol de administrador para crear el usuario inicial.');
      return;
    }

    await this.userRepository.save(
      this.userRepository.create({
        name: username,
        password: await bcrypt.hash(password, 10),
        role: adminRole,
      }),
    );
    this.logger.log(`Administrador inicial "${username}" creado.`);
  }
  async create(createUserDto: CreateUserDto) {
    const { roleId, password, ...date } = createUserDto;

    const role = await this.findRoleOrThrow(createUserDto.roleId);

    // Validar administrador único
    if (roleGroupOf(role.name) === 'admin') {
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
    const users = await this.userRepository.find({ relations: ['role'] });
    return Promise.all(users.map((user) => this.withSalesCount(user)));
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return this.withSalesCount(user);
  }

  private async withSalesCount(user: User) {
    const salesCount = await this.saleRepository.count({
      where: {
        user: { id: user.id },
        status: Not(SalesStatus.CANCELED),
      },
    });

    return { ...user, salesCount };
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
