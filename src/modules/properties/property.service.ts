import fs from 'fs/promises';
import path from 'path';
import { Prisma, Property } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { PropertyRepository } from './property.repository.js';
import { createPropertySchema, listPropertyQuerySchema, propertyIdSchema, updatePropertySchema } from './property.schema.js';

const repository = new PropertyRepository(prisma);

function serializeProperty(property: Property) {
  const { imagePath, ...data } = property;
  return {
    ...data,
    latitude: Number(property.latitude),
    longitude: Number(property.longitude),
    price: Number(property.price),
    imageUrl: imagePath ? `/uploads/${imagePath}` : null,
  };
}

function toNullableDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError('Invalid date', 400);
  }

  return parsed;
}

async function deleteLocalImage(imagePath?: string | null) {
  if (!imagePath) {
    return;
  }

  const absolutePath = path.resolve(process.cwd(), 'uploads', path.basename(imagePath));
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Unable to remove property image');
    }
  }
}

function validateId(id: string) {
  return propertyIdSchema.parse({ id }).id;
}

export async function getAllProperties(query: Record<string, unknown>) {
  const filters = listPropertyQuerySchema.parse(query);
  const where: Prisma.PropertyWhereInput = {};

  if (filters.search !== undefined) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.isAvailable !== undefined) {
    where.isAvailable = filters.isAvailable;
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
    };
  }
  if (filters.minRooms !== undefined) {
    where.numberOfRooms = { gte: filters.minRooms };
  }

  const properties = await repository.findMany(where);
  return properties.map(serializeProperty);
}

export async function getPropertyById(id: string) {
  id = validateId(id);
  const property = await repository.findUnique(id);
  if (!property) {
    throw new ApiError('Property not found', 404);
  }

  return serializeProperty(property);
}

export async function createProperty(input: Record<string, unknown>, file?: Express.Multer.File) {
  const parsed = createPropertySchema.parse(input);

  const data: Prisma.PropertyCreateInput = {
    title: parsed.title,
    description: parsed.description,
    availableDate: new Date(parsed.availableDate),
    inspectionAt: parsed.inspectionAt ? toNullableDate(parsed.inspectionAt) : null,
    isAvailable: parsed.isAvailable,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    price: parsed.price,
    numberOfRooms: parsed.numberOfRooms,
    imagePath: file ? file.filename : null,
  };

  const property = await repository.create(data);
  return serializeProperty(property);
}

export async function updateProperty(id: string, input: Record<string, unknown>, file?: Express.Multer.File) {
  id = validateId(id);
  const existing = await repository.findUnique(id);
  if (!existing) {
    throw new ApiError('Property not found', 404);
  }

  const parsed = updatePropertySchema.parse(input);
  const updateData: Prisma.PropertyUpdateInput = {};

  if (parsed.title !== undefined) {
    updateData.title = parsed.title;
  }
  if (parsed.description !== undefined) {
    updateData.description = parsed.description;
  }
  if (parsed.availableDate !== undefined) {
    updateData.availableDate = new Date(parsed.availableDate);
  }
  if (parsed.inspectionAt !== undefined) {
    updateData.inspectionAt = parsed.inspectionAt ? toNullableDate(parsed.inspectionAt) : null;
  }
  if (parsed.isAvailable !== undefined) {
    updateData.isAvailable = parsed.isAvailable;
  }
  if (parsed.latitude !== undefined) {
    updateData.latitude = parsed.latitude;
  }
  if (parsed.longitude !== undefined) {
    updateData.longitude = parsed.longitude;
  }
  if (parsed.price !== undefined) {
    updateData.price = parsed.price;
  }
  if (parsed.numberOfRooms !== undefined) {
    updateData.numberOfRooms = parsed.numberOfRooms;
  }

  if (file) {
    updateData.imagePath = file.filename;
  }

  const property = await repository.update(id, updateData);

  if (file && existing.imagePath) {
    await deleteLocalImage(existing.imagePath);
  }

  return serializeProperty(property);
}

export async function deleteProperty(id: string) {
  id = validateId(id);
  const existing = await repository.findUnique(id);
  if (!existing) {
    throw new ApiError('Property not found', 404);
  }

  await repository.delete(id);
  await deleteLocalImage(existing.imagePath);
}
