import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateToppingDto } from './dto/create-topping.dto';
import { UpdateToppingDto } from './dto/update-topping.dto';
import { Topping } from './entities/topping.entity';

@Injectable()
export class ToppingService {
  constructor(
    @InjectRepository(Topping)
    private readonly toppingRepository: Repository<Topping>,
  ) {}

  async create(createToppingDto: CreateToppingDto) {
    const existingTopping = await this.toppingRepository.findOneBy({
      name: createToppingDto.name,
    });

    if (existingTopping) {
      throw new BadRequestException('El topping ya existe');
    }

    const topping = this.toppingRepository.create(createToppingDto);
    await this.toppingRepository.save(topping);
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

    const updatedTopping = await this.toppingRepository.preload({
      id,
      ...updateToppingDto,
    });
    if (!updatedTopping) {
      throw new NotFoundException('Topping no encontrado');
    }
    await this.toppingRepository.save(updatedTopping);
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
