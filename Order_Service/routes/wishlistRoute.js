import { Router } from "express";
import { authRole } from "../middleware/authMiddleware.js";
import {
  getAllWishlistController,
  //addCartController,
} from "../controllers/wishlistController.js";

const router = Router();

router.get("/", authRole, getAllWishlistController);
router.post("/", authRole);
router.get("/:wishlistId/items", authRole);
router.post(":wishlistId/items", authRole);
router.delete(":wishlistId/items/:itemId", authRole);

export default router;
