import db from  "../models/userModel.js"


const registerRepo = async (userInfo) => {
     const newUser = new db(userInfo);
        newUser.save()
        return newUser;  
}

const  fetchUser = async (email) => {
    return await db.findOne({email: email});

}

const getUserById = async (id) => {
    return  await db.findById(id);
}

const editUser = async (id,data) => {
    return await db.findByIdAndUpdate(id,data,{new:true})
}


const deleteUser = async (id)=>{
    return await db.findByIdAndDelete(id);
}

export default {
    registerRepo,
    fetchUser,
    getUserById,
    editUser,
    deleteUser
}