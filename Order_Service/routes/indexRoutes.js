import { Router } from "express";
import orderRoutes from "./orderRoutes.js";
import { authenticate } from "../middleware/authService.js";
const router = Router();

router.use("/", authenticate, orderRoutes);

export default router;
