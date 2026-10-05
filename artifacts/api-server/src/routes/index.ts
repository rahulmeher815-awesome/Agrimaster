import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agriconnectRouter from "./agriconnect";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agriconnectRouter);

export default router;
