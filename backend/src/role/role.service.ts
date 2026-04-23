import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRoleDto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        code: createRoleDto.code,
        name: createRoleDto.name,
        description: createRoleDto.description,
        isSystem: createRoleDto.isSystem ?? false,
        isActive: createRoleDto.isActive ?? true,
      },
    });
  }

  findAll() {
    return this.prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }

  async findByCode(code: string) {
    const role = await this.prisma.role.findUnique({
      where: { code },
    });

    if (!role) {
      throw new NotFoundException(`Role with code ${code} not found`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.role.delete({
      where: { id },
    });
  }
}
