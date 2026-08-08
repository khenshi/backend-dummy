import { NextFunction, Request, Response } from 'express';
import { createProperty, deleteProperty, getAllProperties, getPropertyById, updateProperty } from './property.service.js';
import { deleteUploadedFile } from '../../middleware/upload.js';

export async function listProperties(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAllProperties(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const property = await getPropertyById(id);
    res.json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
}

export async function createPropertyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const property = await createProperty(req.body, req.file);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    await deleteUploadedFile(req.file);
    next(error);
  }
}

export async function updatePropertyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const property = await updateProperty(id, req.body, req.file);
    res.json({ success: true, data: property });
  } catch (error) {
    await deleteUploadedFile(req.file);
    next(error);
  }
}

export async function deletePropertyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteProperty(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
