import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from './category.controller.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';

const router = express.Router();

// Public / Authenticated: List all categories and get category details
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Super Admin / HOD Governance: Category CRUD & Organizer Limit Management
router.post('/', requireAuth, requireAdmin, createCategory);
router.put('/:id', requireAuth, requireAdmin, updateCategory);
router.delete('/:id', requireAuth, requireAdmin, deleteCategory);

export default router;
