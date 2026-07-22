import logger from '#config/logger.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/user.service.js';
import {
  userIdSchema,
  updateUserSchema,
} from '#validations/users.validation.js';
import { formatValidationError } from '#utils/format.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Fetching all users');
    const AllUsers = await getAllUsers();
    res.json({
      message: 'Users fetched successfully',
      users: AllUsers,
      count: AllUsers.length,
    });
  } catch (error) {
    logger.error('Error occurred while fetching all users', error);
    next(error);
  }
};

export const fetchUserById = async (req, res, next) => {
  try {
    const idValidation = userIdSchema.safeParse({ id: req.params.id });
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const userId = idValidation.data.id;
    logger.info(`Fetching user with id ${userId}`);

    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User fetched successfully',
      user,
    });
  } catch (error) {
    logger.error(
      `Error occurred while fetching user by id ${req.params.id}`,
      error
    );
    next(error);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const authUser = req.user;

    const idValidation = userIdSchema.safeParse({ id: req.params.id });
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: formatValidationError(idValidation.error),
      });
    }
    const targetUserId = idValidation.data.id;

    if (authUser.role !== 'admin' && authUser.id !== targetUserId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You can only update your own information' });
    }

    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: formatValidationError(validationResult.error),
      });
    }
    const updates = validationResult.data;

    if (updates.role && authUser.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: Only admins can change user roles' });
    }

    logger.info(`Updating user with id ${targetUserId}`);
    const updatedUser = await updateUserService(targetUserId, updates);

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error(
      `Error occurred while updating user with id ${req.params.id}`,
      error
    );
    next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const idValidation = userIdSchema.safeParse({ id: req.params.id });
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: formatValidationError(idValidation.error),
      });
    }
    const targetUserId = idValidation.data.id;

    logger.info(`Deleting user with id ${targetUserId}`);
    await deleteUserService(targetUserId);

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error(
      `Error occurred while deleting user with id ${req.params.id}`,
      error
    );
    next(error);
  }
};
