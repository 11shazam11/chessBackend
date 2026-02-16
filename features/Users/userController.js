import UserModel from "./userModel.js";
import ApplicationError from "../../config/applicationError.js";

class UserController {
    constructor(){
        this.userModel = new UserModel();

    }

    async registerUser (req,res){
        try {
            const userData = req.body;
            const data = {
                name : userData.name,
                email : userData.email,
                password_hash :userData.password_hash,
                role: userData.role 
            }
            let newUser = await this.userModel.createUser(data);
            if(!newUser){
                throw new ApplicationError(500,"error in contrller creating the new user");

            }
            res.status(200).send(newUser);
        } catch (error) {
            throw new ApplicationError(500,"error in contrller creating the new user");

        }
    }

    //login user
    async loginUser (req,res,next){
        try{
            const {email,password} = req.body;
            const user = {
                email,
                password
            }

            const validateUser = await this.userModel.loginUser(user);
            if(validateUser){
                const {token} = validateUser;
                //set the cookie as token 
                res.cookie("token",token,{
                    httpOnly:true,
                    secure:true,
                    sameSite:"none",
                    maxAge:15*60*1000,
                    path:"/"
                });
                return res.status(200).json({ validateUser });
            }
        }catch(error){
            next(error);
        }
    }

    //get user by id
    async getUserById(req,res,next){
        try {
            const { id } = req.params;
            const user = await this.userModel.userInfo(id);
            if (!user) {
                throw new ApplicationError(404, "User not found");
            }
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    async getAllUsers (req,res,next){
        try {
            const users = await this.userModel.allUsers();
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }}
}

export default UserController;