import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Sale } from 'src/sale/entities/sale.entity';

@Module({
  imports:[TypeOrmModule.forFeature([User, Role, Sale])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
