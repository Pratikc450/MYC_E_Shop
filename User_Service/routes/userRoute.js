import express from "express";
import userController from "../controller/userController.js"
const userRoute = express.Router();

userRoute.post('/register',userController.register);
userRoute.post('/login',userController.login);
userRoute.post('/logout',);
userRoute.get('/:userId',);
userRoute.put('/:userId',);
userRoute.delete('/:userId',);
userRoute.get('/roles',);
userRoute.get('/forgot-password',);
userRoute.get('/reset-password',);
userRoute.get('/',);

export default userRoute;