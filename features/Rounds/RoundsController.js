import RoundsModel from "./RoundsModel.js";

import ApplicationError from "../../config/applicationError.js";

class RoundsController {
  constructor() {
    this.roundsModel = new RoundsModel();
  }

  async createRound(req, res, next) {
    try {
      const { tournamentId, roundNumber } = req.params;
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
}

export default RoundsController;
