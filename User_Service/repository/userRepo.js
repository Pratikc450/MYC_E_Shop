import db from  "../models/userModel.js"


const registerRepo = async (userInfo) => {
     const newUser = new db(userInfo);
        newUser.save()
        return newUser;  
}

const  fetchUser = async (email) => {
    return db.findOne({email: email});

}




export default {
    registerRepo,
    fetchUser
}