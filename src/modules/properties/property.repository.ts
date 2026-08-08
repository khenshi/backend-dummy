import { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export class PropertyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(where?: Prisma.PropertyWhereInput) {
    return this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUnique(id: string) {
    return this.prisma.property.findUnique({ where: { id } });
  }

  async create(data: Prisma.PropertyCreateInput) {
    return this.prisma.property.create({ data });
  }

  async update(id: string, data: Prisma.PropertyUpdateInput) {
    return this.prisma.property.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.property.delete({ where: { id } });
  }
}
