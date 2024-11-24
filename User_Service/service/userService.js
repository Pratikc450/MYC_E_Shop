import userRepo from "../repository/userRepo.js";
import bcrypt from "bcryptjs"
import AppError from "../error/AppError.js"
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: "./.env"}); // Specify a custom .env file path




const registerService = async (userInfo) => {
    const hashedPassword = await bcrypt.hash(userInfo.password,10);
    userInfo.password = hashedPassword;
    return await userRepo.registerRepo(userInfo);
};
    
const loginService = async(email, password) => {

    const user =  await userRepo.fetchUser(email);
    


    if(!user){throw new AppError('email not valid ');}
    const isMatch =  await bcrypt.compare(password,user.password);
    if(!isMatch){
        throw new AppError('Invalid password');
    }
   
    const acessToken =await generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    return {acessToken, refreshToken, user};


}




const generateAccessToken = async (user)=>{
    return jwt.sign({ id:user._id, email: user.email, role: user.role  },process.env.jwtSecret, { expiresIn :process.env.jwtAccessExpire});
    
}
//generate refresh token 
const generateRefreshToken = async (user)=>{
    return jwt.sign({ id:user._id, email:user.email, role: user.role ,type:"refresh" },process.env.jwtSecret, { expiresIn :process.env.jwtAccessExpire});
}














export default {
    registerService,
    loginService,

};
