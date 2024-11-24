import express from "express";

const userRoute = express.Router();

userRoute.post('/register',);
userRoute.post('/login',);
userRoute.post('/logout',);
userRoute.get('/:userId',);
userRoute.put('/:userId',);
userRoute.delete('/:userId',);
userRoute.get('/roles',);
userRoute.get('/forgot-password',);
userRoute.get('/reset-password',);
userRoute.get('/',);

export default userRoute;