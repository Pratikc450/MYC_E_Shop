import { getAllWishlistRepo } from "../repo/wishlistRepo.js";

export const getAllWishlistService = async (user) => {
  try {
    return await getAllWishlistRepo(user.id);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
