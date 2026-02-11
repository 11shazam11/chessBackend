import TournamentModel from "./tournamentModel.js";
import { roleBasedAuth } from "../../config/jwtAuth.js";
import ApplicationError from "../../config/applicationError.js";

class TournamentContoller {
  constructor() {
    this.tournamentModel = new TournamentModel();
  }

  async registerTournament(req, res, next) {
    try {
      //check the role only organzer must be able to create an tournament
      const role = req.user.userrole;
      console.log(role);
      if (role !== "organizer") {
        throw new ApplicationError(
          404,
          "TO create an tournament you must be an ORGANIZER",
        );
      }
      const data = req.body;
      const newTournament = await this.tournamentModel.registerTournament({
        organizer_name: req.user.username,
        name: data.name,
        description: data.description,
        userId: req.user.id, // from JWT middleware
        start_date: data.start_date,
        end_date: data.end_date,
        time_control: data.time_control,
        max_players: data.max_players,
      });

      res.status(200).send(newTournament);
    } catch (error) {
      next(error);
    }
  }
  //update registration for tournament
  async updateRegistrationStaus(req, res, next) {
    try {
      const tournamentId = req.params.id;
      const status = req.params.status;
      const userId = req.user.id; // from JWT middleware

      const updatedTournament = await this.tournamentModel.updateTournamentStatus(
        tournamentId,
        status,
        userId,
      );
      res.status(200).send(updatedTournament);
    } catch (error) {
      next(error);
    }
  }

  //get all tournaments
 async getTournaents(req, res, next) {
  try {
    const role = req.user?.userrole;  // ✅ safe access
    const userId = req.user?.id;
    console.log("User role:", role);
    console.log("User ID:", userId);

    if (role === "organizer") {
      const tournaments = await this.tournamentModel.getTournamentsByOrganizer(userId);
      return res.status(200).send({ tournaments });
    }

    const alltournaments = await this.tournamentModel.allTournaments();
    return res.status(200).send({ tournaments: alltournaments });
  } catch (error) {
    next(error);
  }
}

  //add player to tournament
  async addPlayer(req,res,next){
    try{
      const tournamentId = req.params.id;
      const userId = req.user.id; // from JWT middleware
      const addedplayer = await this.tournamentModel.addPlayerToTournament({tournamentId,userId});
      //send already registered error if user is already registered for the tournament
      if(addedplayer === 1){
        return res.status(400).send({message:"You are already registered for this tournament"});
      }
      res.status(200).send({message:"Successfully registered for the tournament"});
    }catch(error){
      next(error);
    }
  }

  //fetch registered players for a tournament
  async getPlayersForTournament(req,res,next){
    try{
      const tournamentId = req.params.id;
      const players = await this.tournamentModel.getPlayersForTournament(tournamentId);
      res.status(200).send({players});
    }catch(error){
      next(error);
    }
  }

  //get all tournamet player is registerd in 
  async getTournamentsForPlayer(req,res,next){
    try{
      const userId = req.user.id; // from JWT middleware
      const tournaments = await this.tournamentModel.getTournamentsForPlayer(userId);
      res.status(200).send({tournaments});
    }catch(error){
      next(error);
    }
  }

  //get tournament details by id
  async getTournamentById(req,res,next){
    try{
      const tournamentId = req.params.id;
      const tournament = await this.tournamentModel.getTournamentById(tournamentId);
      if(!tournament){
        return res.status(404).send({message:"Tournament not found"});
      }
      res.status(200).send({tournament});
    }catch(error){
      next(error);
    }
}
}

export default TournamentContoller;
