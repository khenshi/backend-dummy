import { Prisma, Property } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { createPropertySchema, listPropertyQuerySchema, propertyIdSchema, updatePropertySchema } from './property.schema.js';

function serializeProperty(property: Omit<Property, 'imageData'>) {
  const { imageMimeType, ...data } = property;
  return {
    ...data,
    price: Number(property.price),
    imageUrl: imageMimeType ? `/api/properties/${property.id}/image` : null,
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

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    omit: { imageData: true },
  });
  return properties.map(serializeProperty);
}

export async function getPropertyById(id: string) {
  id = validateId(id);
  const property = await prisma.property.findUnique({
    where: { id },
    omit: { imageData: true },
  });
  if (!property) {
    throw new ApiError('Property not found', 404);
  }

  return serializeProperty(property);
}

export async function getPropertyImage(id: string) {
  id = validateId(id);
  const image = await prisma.property.findUnique({
    where: { id },
    select: { imageData: true, imageMimeType: true },
  });
  if (!image) {
    throw new ApiError('Property not found', 404);
  }
  if (!image.imageData || !image.imageMimeType) {
    throw new ApiError('Property image not found', 404);
  }

  return { data: Buffer.from(image.imageData), mimeType: image.imageMimeType };
}

export async function createProperty(input: Record<string, unknown>, file?: Express.Multer.File) {
  const parsed = createPropertySchema.parse(input);

  const data: Prisma.PropertyCreateInput = {
    title: parsed.title,
    description: parsed.description,
    availableDate: new Date(parsed.availableDate),
    inspectionAt: parsed.inspectionAt ? toNullableDate(parsed.inspectionAt) : null,
    isAvailable: parsed.isAvailable,
    latitude: Number(parsed.latitude),
    longitude: Number(parsed.longitude),
    price: parsed.price,
    numberOfRooms: parsed.numberOfRooms,
    propertyType: parsed.propertyType,
    imageData: file ? new Uint8Array(file.buffer) : undefined,
    imageMimeType: file?.mimetype,
  };

  const property = await prisma.property.create({
    data,
    omit: { imageData: true },
  });
  return serializeProperty(property);
}

export async function updateProperty(id: string, input: Record<string, unknown>, file?: Express.Multer.File) {
  id = validateId(id);
  const existing = await prisma.property.findUnique({
    where: { id },
    select: { id: true },
  });
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
    updateData.latitude = Number(parsed.latitude);
  }
  if (parsed.longitude !== undefined) {
    updateData.longitude = Number(parsed.longitude);
  }
  if (parsed.price !== undefined) {
    updateData.price = parsed.price;
  }
  if (parsed.numberOfRooms !== undefined) {
    updateData.numberOfRooms = parsed.numberOfRooms;
  }
  if (parsed.propertyType !== undefined) {
    updateData.propertyType = parsed.propertyType;
  }

  if (file) {
    updateData.imageData = new Uint8Array(file.buffer);
    updateData.imageMimeType = file.mimetype;
  }

  const property = await prisma.property.update({
    where: { id },
    data: updateData,
    omit: { imageData: true },
  });

  return serializeProperty(property);
}

export async function deleteProperty(id: string) {
  id = validateId(id);
  const existing = await prisma.property.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError('Property not found', 404);
  }

  await prisma.property.delete({ where: { id } });
}
