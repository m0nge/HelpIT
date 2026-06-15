import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ticketsRouter from "./tickets";
import assetsRouter from "./assets";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/tickets", ticketsRouter);
router.use("/assets", assetsRouter);
router.use("/users", usersRouter);

export default router;
