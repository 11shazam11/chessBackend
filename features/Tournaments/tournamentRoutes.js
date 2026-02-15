import express from "express";
import TournamentContoller from "./tournamentController.js";
import { authMiddleware } from "../../config/jwtAuth.js";

const tournamentController = new TournamentContoller();

const tournamentRoutes = express.Router();

tournamentRoutes.post("/register", authMiddleware, (req, res, next) => {
  tournamentController.registerTournament(req, res, next);
});

//get all tournaments 
tournamentRoutes.get("/all",authMiddleware,(req,res,next)=>{
  tournamentController.getTournaents(req,res,next);
});

//participate in tournament
tournamentRoutes.post("/:id/participate", authMiddleware, (req, res, next) => {
  tournamentController.addPlayer(req, res, next);
});

//get all the tournaments that the user is participating in
tournamentRoutes.get("/my-tournaments", authMiddleware, (req, res, next) => {
  tournamentController.getTournamentsForPlayer(req, res, next);
});

//update registration status for tournament
tournamentRoutes.post("/:id/status/:status", authMiddleware, (req, res, next) => {
  tournamentController.updateRegistrationStaus(req, res, next);
});

//get all participants for a tournament
tournamentRoutes.get("/:id/participants", authMiddleware, (req, res, next) => {
  tournamentController.getPlayersForTournament(req, res, next);
});

//get tournament details by id
tournamentRoutes.get("/:id", authMiddleware, (req, res, next) => {
  tournamentController.getTournamentById(req, res, next);
});

//register players by id
tournamentRoutes.post("/:id/register-players", authMiddleware, (req, res, next) => {
  tournamentController.addPlayersByIds(req, res, next);
});
export default tournamentRoutes;
  