import { AllowRoles } from '../auth/auth.decorators';
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @AllowRoles('admin', 'staff')
  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.create(createClientDto);
  }

  @Get()
  findAll(@Query('ci') ci?: string) {
    return this.clientService.findAll(ci);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.findOne(id);
  }

  @AllowRoles('admin', 'staff')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientService.update(id, updateClientDto);
  }

  @AllowRoles('admin', 'staff')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.remove(id);
  }
}
