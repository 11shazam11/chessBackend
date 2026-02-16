import RoundsModel from "./RoundsModel.js";

import ApplicationError from "../../config/applicationError.js";

class RoundsController {
  constructor() {
    this.roundsModel = new RoundsModel();
  }

  async createRound(req, res, next) {
    try {
      const { tournamentId, roundNumber } = req.params;
      console.log("Creating round for tournamentId:", tournamentId, "roundNumber:", roundNumber);
      const seeding = "random";
      const byePolicy = "random";
      const round = await this.roundsModel.createRoundandMatches(
        tournamentId,
        roundNumber,
        seeding,
        byePolicy,
      );
      res.status(201).json(round);
    } catch (error) {
      next(
        new ApplicationError(500, ` Failed to create round: ${error.message}`),
      );
    }
  }

  //mark a plyaer as winner
  async markWinner(req, res, next) {
    try {
      const { matchId } = req.params;
      const { winnerId, result } = req.body;
      const data = await this.roundsModel.updateMatchResult(
        matchId,
        result,
        winnerId,
      );
      res.status(200).json(data);
    } catch (error) {
      next(
        new ApplicationError(500, ` Failed to mark winner: ${error.message}`),
      );
    }
  }
  //handle next round
  async nextRound(req, res, next) {
    try {
      const { tournamentId, roundId } = req.params;
      console.log(
        "Handling next round for tournamentId:",
        tournamentId,
        "roundId:",
        roundId,
      );
      const seeding = "random";
      const byePolicy = "random";
      const round = await this.roundsModel.handleNextRound(
        tournamentId,
        roundId,
        seeding,
        byePolicy,
      );
      console.log("Next round created:", round);
      res.status(201).json(round);
    } catch (error) {
      next(new ApplicationError(500, ` Failed to create next round: ${error}`));
    }
  }

  //get latest round for a tournament
  async getLatestRound(req, res, next) {
    try {
      const { tournamentId } = req.params;
      const round = await this.roundsModel.getLatestRoundforTournament(tournamentId);
      if (!round) {
        return res.status(404).json({ message: "No rounds found for this tournament" });
      }
      res.status(200).json(round);
    } catch (error) {
      next(new ApplicationError(500, ` Failed to get latest round: ${error.message}`));
    }
  }

  async getRoundMatches(req, res, next) {
    try {
      const { roundId } = req.params;
      const matches = await this.roundsModel.getMatchesForRound(roundId);
      res.status(200).json(matches);
    } catch (error) {
      next(new ApplicationError(500, ` Failed to get round matches: ${error.message}`));
    }
  }

  //declare random winners for all matches in a round
  async declareRandomWinners(req, res, next) {
    try {
      const { roundId } = req.params;
      const data = await this.roundsModel.randomWinners(roundId);
      res.status(200).json({ message: "Random winners declared for all matches in the round",result:data });
    } catch (error) {
      next(error); 
    }
  }
}

export default RoundsController;
