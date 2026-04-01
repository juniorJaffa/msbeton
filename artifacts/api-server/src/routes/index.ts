import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import clientRouter from "./client";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/client", clientRouter);

export default router;
