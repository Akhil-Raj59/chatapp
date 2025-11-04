import { Router } from "express";
import {
    getAllUsers,
    getMessages,
    getConversations
} from "../controllers/message.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/users").get(getAllUsers);

router.route("/conversations/:userId/messages").get(getMessages);

router.route("/conversations").get(getConversations);

export default router;