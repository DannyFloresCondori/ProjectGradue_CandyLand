import { ClientService } from './client.service';
import { Client } from './entities/client.entity';
import type { Repository } from 'typeorm';

describe('ClientService', () => {
  it('returns the existing client when the phone already exists', async () => {
    const existingClient = {
      id: 'client-1',
      full_name: 'Juan Pérez',
      phone: '71234567',
      direction: 'Calle 1',
      isActive: true,
      createdAt: new Date(),
      order: [],
      sale: [],
    } as Client;

    const repository = {
      findOneBy: jest.fn().mockResolvedValue(existingClient),
      findOne: jest.fn().mockResolvedValue(existingClient),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Client>;

    const service = new ClientService(repository);

    const result = await service.create({ phone: '71234567', full_name: 'Juan Pérez' } as any);

    expect(result).toEqual(existingClient);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns the existing client when the CI already exists', async () => {
    const existingClient = {
      id: 'client-2',
      full_name: 'Ana Gómez',
      ci: '1234567',
      phone: '70000001',
      direction: 'Av. 6',
      isActive: true,
      createdAt: new Date(),
      order: [],
      sale: [],
    } as Client;

    const repository = {
      findOne: jest.fn().mockResolvedValue(existingClient),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Client>;

    const service = new ClientService(repository);

    const result = await service.create({ ci: '1234567', full_name: 'Ana Gómez' } as any);

    expect(result).toEqual(existingClient);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('filters clients by CI when listing', async () => {
    const clients = [
      { id: 'client-1', full_name: 'Juan', ci: '111', isActive: true },
      { id: 'client-2', full_name: 'Ana', ci: '222', isActive: true },
    ] as Client[];

    const repository = {
      find: jest.fn().mockImplementation(async (options?: any) => {
        if (options?.where?.[0]?.ci === '222') {
          return [clients[1]];
        }
        return clients;
      }),
    } as unknown as Repository<Client>;

    const service = new ClientService(repository);

    const result = await service.findAll('222');

    expect(repository.find).toHaveBeenCalled();
    expect(result).toEqual([clients[1]]);
  });

  it('throws a conflict when the database rejects a duplicated CI', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn().mockRejectedValue({ code: '23505', detail: "Key (ci)=(1234567) already exists" }),
    } as unknown as Repository<Client>;

    const service = new ClientService(repository);

    await expect(
      service.create({ ci: '1234567', full_name: 'Ana Gómez' } as any),
    ).rejects.toMatchObject({ status: 409, response: { message: 'Ya existe un cliente con este CI' } });
  });
});
