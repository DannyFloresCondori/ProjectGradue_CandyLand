import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto) {
    const normalizedName = createClientDto.full_name?.trim();
    const normalizedPhone = createClientDto.phone?.trim();
    const normalizedDirection = createClientDto.direction?.trim();
    const normalizedCi = createClientDto.ci?.trim();

    if (normalizedCi) {
      const existingClientByCi = await this.clientRepository.findOne({
        where: { ci: normalizedCi },
      });
      if (existingClientByCi) {
        return existingClientByCi;
      }
    }

    if (normalizedPhone) {
      const existingClientByPhone = await this.clientRepository.findOne({
        where: { phone: normalizedPhone },
      });
      if (existingClientByPhone) {
        return existingClientByPhone;
      }
    }

    if (normalizedName && normalizedDirection) {
      const existingClientByNameAndAddress = await this.clientRepository.findOne({
        where: {
          full_name: normalizedName,
          direction: normalizedDirection,
        },
      });
      if (existingClientByNameAndAddress) {
        return existingClientByNameAndAddress;
      }
    }

    const client = this.clientRepository.create({
      ...createClientDto,
      full_name: normalizedName,
      phone: normalizedPhone,
      direction: normalizedDirection,
      ci: normalizedCi,
    });

    try {
      return await this.clientRepository.save(client);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Ya existe un cliente con este CI');
      }
      throw error;
    }
  }

  async findAll(ci?: string) {
    if (ci) {
      const normalizedCi = ci.trim();
      // Search by exact CI match (case-insensitive with Like)
      const clients = await this.clientRepository.find({
        where: [
          { ci: normalizedCi },
          // Also try without case sensitivity for better matching
        ],
      });
      
      // If exact match not found, try case-insensitive search
      if (clients.length === 0) {
        const allClients = await this.clientRepository.find();
        return allClients.filter(
          (client) => client.ci?.trim().toLowerCase() === normalizedCi.toLowerCase()
        );
      }
      
      return clients;
    }
    // Return all clients ordered by creation date
    return await this.clientRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const client = await this.clientRepository.findOneBy({ id });
    if(!client){
      throw new NotFoundException('El cliente no se encuentra en el sistema');
    }
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const client = await this.clientRepository.preload({
      id,
      ...updateClientDto,
    });
    if (!client){
      throw new NotFoundException('El cliente no se encuentra en el sistema');
    }
    await this.clientRepository.save(client);
    return client;
  }

  async remove(id: string) {
    const client = await this.clientRepository.findOneBy({ id });
    if(!client){
      throw new NotFoundException('Cliente inexistente');
    }
    await this.clientRepository.remove(client);
    return { message: 'Cliente eliminado exitosamente' };
    
  }
}
