import { Router } from "express";
import { authenticate, authorizationAdmin } from "../middleware/auth.js";
const router = Router();

router.get("/", authenticate, authorizationAdmin);

export default router;
