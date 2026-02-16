import express from "express";
import UserController from "./userController.js";

const userRoutes = express.Router();

const userController = new UserController();

userRoutes.post("/register",(req,res) =>{
    userController.registerUser(req,res);
})

userRoutes.post("/login",(req,res,next)=>{
    userController.loginUser(req,res,next);
});




//get all users
userRoutes.get("/all", (req, res, next) => {
    userController.getAllUsers(req, res, next);
  });

  //get by id 
  userRoutes.get("/:id", (req, res, next) => {
    userController.getUserById(req, res, next);
  });
export default userRoutes;
