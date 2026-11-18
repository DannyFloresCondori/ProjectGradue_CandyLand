import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateToppingDto } from './dto/create-topping.dto';
import { UpdateToppingDto } from './dto/update-topping.dto';
import { Topping } from './entities/topping.entity';
import { ensureNameIsAvailable, saveWithUniqueNameConstraint } from 'src/common/normalized-name';

const DUPLICATE_TOPPING_MESSAGE = 'Este topping ya está registrado';

@Injectable()
export class ToppingService {
  constructor(
    @InjectRepository(Topping)
    private readonly toppingRepository: Repository<Topping>,
  ) {}

  async create(createToppingDto: CreateToppingDto) {
    const name = createToppingDto.name.trim();
    await ensureNameIsAvailable(this.toppingRepository, name, DUPLICATE_TOPPING_MESSAGE);
    const topping = this.toppingRepository.create({ ...createToppingDto, name });
    await saveWithUniqueNameConstraint(this.toppingRepository, topping, DUPLICATE_TOPPING_MESSAGE);
    return topping;
  }

  async findAll() {
    const toppings = await this.toppingRepository.find({
      where:{ isActive: true },
    })
    if (toppings.length === 0 ) {
      throw new NotFoundException('No se encontro ningun topping registrado');
    }
    return toppings;
  }

  async findAllIncludingInactive() {
    return this.toppingRepository.find();
  }

  async reactivate(id: string) {
    const topping = await this.toppingRepository.findOneBy({ id });
    if (!topping) throw new NotFoundException('Topping no encontrado');

    if (!topping.isActive) {
      topping.isActive = true;
      await this.toppingRepository.save(topping);
    }

    return topping;
  }

  async findOne(id: string) {
    const topping = await this.toppingRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!topping) {
      throw new NotFoundException('Topping no encontrado o inactivo');
    }
    return topping;
  }

  async update(id: string, updateToppingDto: UpdateToppingDto) {
    const topping = await this.toppingRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!topping) {
      throw new NotFoundException('Topping no encontrado o inactivo');
    }

    const name = updateToppingDto.name?.trim();
    if (name !== undefined) {
      await ensureNameIsAvailable(this.toppingRepository, name, DUPLICATE_TOPPING_MESSAGE, id);
    }

    const updatedTopping = await this.toppingRepository.preload({
      id,
      ...updateToppingDto,
      ...(name !== undefined ? { name } : {}),
    });
    if (!updatedTopping) {
      throw new NotFoundException('Topping no encontrado');
    }
    await saveWithUniqueNameConstraint(this.toppingRepository, updatedTopping, DUPLICATE_TOPPING_MESSAGE);
    return updatedTopping;
  }

  async remove(id: string) {
    const topping = await this.toppingRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!topping) {
      throw new NotFoundException('Topping no encontrado');
    }
    await this.toppingRepository.update(id, {
      isActive: false,
    });
    return { message: `El topping ${topping.name} ha sido desactivado` };
  }
}
