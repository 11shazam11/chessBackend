import express from "express";
import RoundsController from "./RoundsController.js";
import { authMiddleware } from "../../config/jwtAuth.js";

const roundsController = new RoundsController();

const roundsRoutes = express.Router();
//only create frist round 
roundsRoutes.post(
  "/:tournamentId/rounds/:roundNumber",
  authMiddleware,
  (req, res, next) => {
    roundsController.createRound(req, res, next);
  },
);

//mark a player as winner
roundsRoutes.put("/:matchId/winner", authMiddleware, (req, res, next) => {
  roundsController.markWinner(req, res, next);
});

//handle next round
roundsRoutes.post(
  "/:tournamentId/rounds/:roundId/next",
  authMiddleware,
  (req, res, next) => {
    roundsController.nextRound(req, res, next);
  },
);

//get latet round of a tournament
roundsRoutes.get(
  "/:tournamentId/current",
  authMiddleware,
  (req, res, next) => {
    roundsController.getLatestRound(req, res, next);
  },
);

//get all matches of a round
roundsRoutes.get(
  "/:roundId/matches",
  authMiddleware,
  (req, res, next) => {
    roundsController.getRoundMatches(req, res, next);
  }
);

//declare reandom winners for all matches in a round
roundsRoutes.post(
  "/:roundId/declare-random-winners",
  authMiddleware,
  (req, res, next) => {
    roundsController.declareRandomWinners(req, res, next);
  }
);
 
export default roundsRoutes;
