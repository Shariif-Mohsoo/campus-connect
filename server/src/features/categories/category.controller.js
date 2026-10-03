import { store } from '../../shared/database/store.js';

/**
 * Controller: Get all dynamic categories with capacities and active organizer counts
 * Accessible to authenticated users and public viewers.
 */
export const getCategories = async (req, res) => {
  try {
    const categories = store.getCategories();
    return res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get single category by ID / key
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = store.getCategoryById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: `Category "${id}" not found.` });
    }
    return res.json({
      success: true,
      category
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Create new extracurricular category (Super Admin / HOD action)
 * (Requirement 1 & 2)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, id, icon, color, desc, maxOrganizers, formConfig } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const created = store.createCategory({
      name,
      id,
      icon,
      color,
      desc,
      maxOrganizers: maxOrganizers !== undefined ? maxOrganizers : 3,
      formConfig
    });

    return res.status(201).json({
      success: true,
      message: `Category "${created.name}" created successfully with organizer capacity of ${created.maxOrganizers}.`,
      category: created
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }
};

/**
 * Controller: Update existing category (Super Admin / HOD action)
 * (Requirement 1, 2 & 10)
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = store.updateCategory(id, updates);

    return res.json({
      success: true,
      message: `Category "${updated.name}" updated successfully.`,
      category: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      code: error.code,
      currentCount: error.currentCount,
      newLimit: error.newLimit
    });
  }
};

/**
 * Controller: Safe delete category (Super Admin / HOD action)
 * Blocks deletion if active organizers, proposals, or registrations are attached.
 * (Requirement 10)
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = store.deleteCategory(id);

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details
    });
  }
};
