import db from  "../models/userModel.js"


const registerRepo = async (userInfo) => {
     const newUser = new db(userInfo);
        newUser.save()
        return newUser;  
}

export default {
    registerRepo
}