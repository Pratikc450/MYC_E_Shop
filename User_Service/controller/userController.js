import userService from "../service/userService.js"
import {sendRegisterMail} from "../mail/registermail.js"

const register = async(req,res,next) => {
    // const { name, email, password } = req.body;
    // Add user to the database
    try{
    const ans = await userService.registerService(req.body);
        if(ans){
            sendRegisterMail(ans.email,ans.first_name,ans.last_name)
        }
    res.status(201).json({ message: 'User created successfully',details: ans});
    }catch(err){
        next(err);
    }
}



const login = async(req, res, next) => { 
    try{
        const {email, password} = req.body;
        
        const token = await userService.loginService(email, password);
        
     
        res.status(200).json({ messsage:"logged in succesful",token :token});


    }catch(err){
        next(err);(err);
    }
}



export default {
    register,
    login,
}   