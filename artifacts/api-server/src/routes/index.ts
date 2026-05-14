import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import clientRouter from "./client";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/client", clientRouter);
router.use("/contact", contactRouter);

export default router;
