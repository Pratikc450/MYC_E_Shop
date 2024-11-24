import userRepo from "../repository/userRepo"


const registerService = async (userInfo) => {
    return await userRepo.registerRepo(userInfo);
};
    



export default {
    registerService,
};
