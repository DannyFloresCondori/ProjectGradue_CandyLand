import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultRoles();
  }

  private async ensureDefaultRoles() {
    const defaults = [
      { name: 'Administrador', description: 'Administrador del sistema' },
      { name: 'Cajero', description: 'Cajero del negocio' },
      { name: 'Inventario', description: 'Encargado de inventario' },
    ];

    for (const roleData of defaults) {
      const existing = await this.roleRepository.findOne({ where: { name: roleData.name } });
      if (!existing) {
        await this.roleRepository.save(this.roleRepository.create(roleData));
      }
    }
  }

  async create(createRoleDto: CreateRoleDto) {
    const role = await this.roleRepository.findOneBy({
      name: createRoleDto.name,
    });
    if (!role) {
      const newRole = this.roleRepository.create(createRoleDto);
      await this.roleRepository.save(newRole);
      return newRole;
    }
    throw new NotFoundException(`El rol de ${createRoleDto.name} ya existe`);
  }

  async findAll() {
    return await this.roleRepository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) {
      throw new NotFoundException(`El rol con id ${id} no existe`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) {
      throw new NotFoundException(`El rol con id ${id} no existe`);
    }
    const updatedRole = await this.roleRepository.preload({
      id,
      ...updateRoleDto,
    });
    await this.roleRepository.save(updatedRole!);
    return updatedRole;
  }

  async remove(id: string) {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) {
      throw new NotFoundException(`El rol con id ${id} no existe`);
    }
    await this.roleRepository.update({ id }, { isActive: false});
    return { message : `El rol ${role.name} se desactivo correctamente`};
  }
}
