import { Router } from 'express';
import { createPropertyHandler, deletePropertyHandler, getProperty, getPropertyImageHandler, listProperties, updatePropertyHandler } from './property.controller.js';
import { upload } from '../../middleware/upload.js';

const router = Router();

router.get('/', listProperties);
router.get('/:id/image', getPropertyImageHandler);
router.get('/:id', getProperty);
router.post('/', upload.single('image'), createPropertyHandler);
router.patch('/:id', upload.single('image'), updatePropertyHandler);
router.delete('/:id', deletePropertyHandler);

export default router;
