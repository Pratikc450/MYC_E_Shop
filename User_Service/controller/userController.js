import userService from "../service/userService.js"
import roleService from "../service/roleService.js"
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
        
        req.session.user = token.user//session saved 
        

        //add to rolelist
        const {id ,name} = req.session.user.role

        const rolelist = await roleService.addRoleService(id,name);

        if(rolelist){console.log("added to role list",id,name)}


        
        res.status(200).json({ messsage:"logged in succesful",token});


    }catch(err){
        next(err);
    }
}

const getUserById = async(req, res, next) => {
    try{
        const id = req.params.userId;
        const user =  await userService.getUaserService(id);
        res.status(200).json({user})
    }catch(err){
        next(err);
    }
}

const editUser = async(req, res, next) => {
    try{
        const id = req.params.userId;
        
        // const id  = req.session.user._id;
        const data = req.body;
        const isupdated = await userService.editUserService(id,data);
        
        //session created again
        if(isupdated){
            console.log(isupdated)
            req.session.user = isupdated
        }
        
        res.status(200).json({message:"user updated"})
        
    }catch(err){
        next(err);
    }
}


const delUser = async (req,res,next) => {
        try{
            const id = req.params.userId;
            const deleteUser = await userService.deleteUserService(id);
            res.status(200).json({message:"user deleted succesfully",deleteUser})
        }catch(err){
            next(err);
        }
}




export default {
    register,
    login,
    getUserById,
    editUser,
    delUser,
}   