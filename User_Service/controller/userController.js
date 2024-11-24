import {registerService} from "../service/userService.js"


const register = async(req,res,next) => {
    // const { name, email, password } = req.body;
    // Add user to the database
    const res = await registerService(req.body);
        if(!res){
            
        }
    res.status(201).json({ message: 'User created successfully' });
}


export default {
    register,
}   