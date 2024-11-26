import { getAllWishlistService } from "../service/wishlistService.js";

export const getAllWishlistController = async (req, res, next) => {
  try {
    const orders = await getAllWishlistService(req.user);
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};
