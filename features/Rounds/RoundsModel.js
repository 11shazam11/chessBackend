import db from "../../config/db.js";
import ApplicationError from "../../config/applicationError.js";
import TournamentModel from "../Tournaments/tournamentModel.js";

//shuffle array function for random seeding
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class RoundsModel {
  constructor() {
    this.tournamentModel = new TournamentModel();
  }

  //create around and a mtches for the round
  async createRoundandMatches(tournamentId, roundNumber, seeding, byePolicy) {
    const client = await db.connect();
    try {
      // Check if round already exists (no transaction needed yet)
      const existingRoundQuery = `
      SELECT * FROM rounds
      WHERE tournament_id = $1 AND round_number = $2
      LIMIT 1
    `;
      const existingRoundResult = await client.query(existingRoundQuery, [
        tournamentId,
        roundNumber,
      ]);

      if (existingRoundResult.rows.length > 0) {
        const existingRound = existingRoundResult.rows[0];

        //  Return matches of that existing round too
        const existingMatchesResult = await client.query(
          `SELECT * FROM matches WHERE round_id = $1 ORDER BY id ASC`,
          [existingRound.id],
        );

        return { round: existingRound, matches: existingMatchesResult.rows };
      }

      //   Now start transaction only when we actually create
      await client.query("BEGIN");

      //update the tournament status to ongoing if it is not already
      const tournamentQuery = `SELECT status FROM tournaments WHERE id = $1 LIMIT 1`;
      const tournamentResult = await client.query(tournamentQuery, [
        tournamentId,
      ]);
      const tournamentStatus = tournamentResult.rows[0]?.status;
      if (tournamentStatus !== "ongoing") {
        await this.updateTournamentStatus(tournamentId, "ongoing");
      }

      // create the round
      const roundQuery = `
      INSERT INTO rounds (tournament_id, round_number)
      VALUES ($1, $2)
      RETURNING *
    `;
      const roundResult = await client.query(roundQuery, [
        tournamentId,
        roundNumber,
      ]);
      const round = roundResult.rows[0];

      // fetch players
      const players =
        await this.tournamentModel.getPlayersForTournament(tournamentId);

      if (!players || players.length < 2) {
        throw new ApplicationError(400, "Not enough players to start a round");
      }

      // seeding
      if (seeding === "rating") {
        players.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      } else {
        shuffleArray(players);
      }

      const matches = [];

      // BYE logic if odd
      if (players.length % 2 === 1) {
        let byeIndex = 0;

        if (byePolicy === "random") {
          byeIndex = Math.floor(Math.random() * players.length);
        } else if (byePolicy === "lowest") {
          byeIndex = players.reduce(
            (minIdx, p, idx, arr) =>
              (p.rating ?? 0) < (arr[minIdx].rating ?? 0) ? idx : minIdx,
            0,
          );
        } else if (byePolicy === "highest") {
          byeIndex = players.reduce(
            (maxIdx, p, idx, arr) =>
              (p.rating ?? 0) > (arr[maxIdx].rating ?? 0) ? idx : maxIdx,
            0,
          );
        }

        const byePlayer = players.splice(byeIndex, 1)[0];

        const byeMatchQuery = `
        INSERT INTO matches (
          tournament_id, round_id, white_player_id, black_player_id,
          result, is_bye, started_at, ended_at, winner_player_id
        )
        VALUES ($1, $2, $3, NULL, 'white_win', TRUE, NOW(), NOW(), $3)
        RETURNING *
      `;
        const byeMatchResult = await client.query(byeMatchQuery, [
          tournamentId,
          round.id,
          byePlayer.user_id,
        ]);

        matches.push(byeMatchResult.rows[0]);
      }

      // pair remaining players
      for (let i = 0; i < players.length; i += 2) {
        const p1 = players[i];
        const p2 = players[i + 1];

        const swap = Math.random() < 0.5;
        const whiteId = swap ? p1.user_id : p2.user_id;
        const blackId = swap ? p2.user_id : p1.user_id;

        const matchQuery = `
        INSERT INTO matches (
          tournament_id, round_id, white_player_id, black_player_id, result, is_bye
        )
        VALUES ($1, $2, $3, $4, 'pending', FALSE)
        RETURNING *
      `;
        const matchResult = await client.query(matchQuery, [
          tournamentId,
          round.id,
          whiteId,
          blackId,
        ]);

        matches.push(matchResult.rows[0]);
      }

      //update the round status to ongoing
      const updateRoundStatusQuery = `UPDATE rounds SET status = 'ongoing' WHERE id = $1`;
      await client.query(updateRoundStatusQuery, [round.id]);
      await client.query("COMMIT");
      return { round, matches };
    } catch (error) {
      // rollback only if a transaction is open
      try {
        await client.query("ROLLBACK");
      } catch (_) {}

      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        500,
        `Failed to create round and matches: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

  //fetch round details and matches for a round
  async getRoundDetails(roundId) {
    try {
      const query = `
        SELECT r.*, m.id as match_id, m.white_player_id, m.black_player_id, m.result, m.is_bye, m.winner_player_id
        FROM rounds r
        LEFT JOIN matches m ON r.id = m.round_id
        WHERE r.id = $1
      `;
      const result = await db.query(query, [roundId]);
      return result.rows;
    } catch (error) {
      throw new ApplicationError(
        500,
        `Failed to fetch round details: ${error.message}`,
      );
    }
  }

  //mark a player as winner for a match and update the match result
  async updateMatchResult(matchId, result, winnerPlayerId) {
    const query = `UPDATE matches SET result = $1, winner_player_id = $2, ended_at = NOW() WHERE id = $3 RETURNING *`;
    const values = [result, winnerPlayerId, matchId];
    try {
      const res = await db.query(query, values);
      return res.rows[0];
    } catch (error) {
      console.error("Error updating match result:", error);
      throw new ApplicationError(
        500,
        `Failed to update match result: ${error.message}`,
      );
    }
  }
  //change the status of tournament completerd or ongoing
  async updateTournamentStatus(tournamentId, status) {
    const query = `UPDATE tournaments SET status = $1 WHERE id = $2 RETURNING *`;
    const values = [status, tournamentId];
    try {
      const res = await db.query(query, values);
      return res.rows[0];
    } catch (error) {
      console.error("Error updating tournament status:", error);
      throw new ApplicationError(
        500,
        `Failed to update tournament status: ${error.message}`,
      );
    }
  }

  //handle next round
  async handleNextRound(
    tournamentId,
    currentRoundId,
    seeding = "random",
    byePolicy = "random",
  ) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // 1) Validate current round
      const roundRes = await client.query(
        `SELECT id, tournament_id, round_number
       FROM rounds
       WHERE id = $1
       LIMIT 1`,
        [currentRoundId],
      );
      console.log(
        "Fetched current round for next round handling:",
        roundRes.rows[0],
      );

      const currentRound = roundRes.rows[0];
      if (!currentRound) throw new ApplicationError(404, "Round not found");
      if (currentRound.tournament_id !== tournamentId) {
        throw new ApplicationError(
          400,
          "Round does not belong to this tournament",
        );
      }

      // Ensure round is finished
      const pendingRes = await client.query(
        `SELECT COUNT(*)::int AS pending
       FROM matches
       WHERE round_id = $1 AND result = 'pending'`,
        [currentRoundId],
      );

      if (pendingRes.rows[0].pending > 0) {
        throw new ApplicationError(400, "Round is not finished yet");
      }

      // Fetch winners (includes BYE winners too)
      // Use DISTINCT in case something weird duplicates winners
      const winnersRes = await client.query(
        `SELECT DISTINCT winner_player_id
       FROM matches
       WHERE round_id = $1
         AND winner_player_id IS NOT NULL`,
        [currentRoundId],
      );

      console.log("Fetched winners for current round:", winnersRes.rows);
      const winnerIds = winnersRes.rows.map((r) => r.winner_player_id);

      if (winnerIds.length === 0) {
        throw new ApplicationError(
          400,
          "No winners found. Make sure match winners are saved.",
        );
      }

      //  If only 1 winner left: tournament completed
      if (winnerIds.length === 1) {
        await client.query("COMMIT");

        await this.updateTournamentStatus(tournamentId, "completed");
        return {
          status: "COMPLETED",
          tournamentId,
          winner: {
            playerId: winnerIds[0],
          },
          message: "Tournament winner decided",
        };
      }

      //  Next round number
      const nextRoundNumber = currentRound.round_number + 1;

      // Prevent duplicate next round creation
      const existingNextRound = await client.query(
        `SELECT id FROM rounds WHERE tournament_id = $1 AND round_number = $2 LIMIT 1`,
        [tournamentId, nextRoundNumber],
      );

      if (existingNextRound.rows.length > 0) {
        // If already exists, return it + its matches (frontend can continue)
        const roundId = existingNextRound.rows[0].id;
        const matchesRes = await client.query(
          `SELECT * FROM matches WHERE round_id = $1 ORDER BY id ASC`,
          [roundId],
        );

        await client.query("COMMIT");
        return {
          status: "ADVANCED",
          tournamentId,
          round: { id: roundId, roundNumber: nextRoundNumber },
          matches: matchesRes.rows,
          message: "Next round already exists",
        };
      }

      //  Build player objects for winners (need rating if seeding="rating")
      // Assumes table tournament_players(tournament_id, user_id, rating)
      const playersRes = await client.query(
        `SELECT user_id, rating
       FROM tournament_players
       WHERE tournament_id = $1
         AND user_id = ANY($2::uuid[])`,
        [tournamentId, winnerIds],
      );

      const players = playersRes.rows;
      if (!players || players.length < 2) {
        throw new ApplicationError(
          400,
          "Not enough winner players to create next round",
        );
      }

      // Create next round row
      const newRoundRes = await client.query(
        `INSERT INTO rounds (tournament_id, round_number)
       VALUES ($1, $2)
       RETURNING *`,
        [tournamentId, nextRoundNumber],
      );

      const nextRound = newRoundRes.rows[0];

      // Apply seeding to winners
      if (seeding === "rating") {
        players.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      } else {
        shuffleArray(players);
      }

      const matches = [];

      // BYE logic if odd winners count
      if (players.length % 2 === 1) {
        let byeIndex = 0;

        if (byePolicy === "random") {
          byeIndex = Math.floor(Math.random() * players.length);
        } else if (byePolicy === "lowest") {
          byeIndex = players.reduce(
            (minIdx, p, idx, arr) =>
              (p.rating ?? 0) < (arr[minIdx].rating ?? 0) ? idx : minIdx,
            0,
          );
        } else if (byePolicy === "highest") {
          byeIndex = players.reduce(
            (maxIdx, p, idx, arr) =>
              (p.rating ?? 0) > (arr[maxIdx].rating ?? 0) ? idx : maxIdx,
            0,
          );
        }

        const byePlayer = players.splice(byeIndex, 1)[0];

        const byeMatchRes = await client.query(
          `INSERT INTO matches (
           tournament_id, round_id,
           white_player_id, black_player_id,
           result, is_bye, started_at, ended_at, winner_player_id
         )
         VALUES ($1, $2, $3, NULL, 'white_win', TRUE, NOW(), NOW(), $3)
         RETURNING *`,
          [tournamentId, nextRound.id, byePlayer.user_id],
        );

        matches.push(byeMatchRes.rows[0]);
      }

      //  Create normal matches
      for (let i = 0; i < players.length; i += 2) {
        const p1 = players[i];
        const p2 = players[i + 1];

        const swap = Math.random() < 0.5;
        const whiteId = swap ? p1.user_id : p2.user_id;
        const blackId = swap ? p2.user_id : p1.user_id;

        const matchRes = await client.query(
          `INSERT INTO matches (
           tournament_id, round_id,
           white_player_id, black_player_id,
           result, is_bye
         )
         VALUES ($1, $2, $3, $4, 'pending', FALSE)
         RETURNING *`,
          [tournamentId, nextRound.id, whiteId, blackId],
        );

        matches.push(matchRes.rows[0]);
      }

      await client.query("COMMIT");

      return {
        status: "ADVANCED",
        tournamentId,
        round: {
          id: nextRound.id,
          roundNumber: nextRound.round_number,
        },
        matches,
        message: "Next round created",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        500,
        `Failed to handle next round: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

  //get latest round for a tournament
  async getLatestRoundforTournament(tournamentId) {
    try {
      const query = ` SELECT * FROM rounds
      WHERE tournament_id = $1
      ORDER BY round_number DESC
      LIMIT 1`;
      const result = await db.query(query, [tournamentId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new ApplicationError(
        500,
        `Failed to fetch latest round: ${error.message}`,
      );
    }
  }

  //get all matches for a round
  async getMatchesForRound(roundId) {
    try {
      const query = `SELECT * FROM matches WHERE round_id = $1 ORDER BY id ASC`;
      const result = await db.query(query, [roundId]);
      return result.rows;
    } catch (error) {
      throw new ApplicationError(
        500,
        `Failed to fetch matches for round: ${error.message}`,
      );
    }
  }

  //declare random player as winner for a match and update the match result
  async randomWinners(roundId) {
    try {
      //chect the round status
      const roundStatusQuery = `SELECT status FROM rounds WHERE id = $1 LIMIT 1`;
      const roundStatusResult = await db.query(roundStatusQuery, [roundId]);
      const roundStatus = roundStatusResult.rows[0]?.status;
      if (roundStatus == "completed") {
        throw new ApplicationError(
          400,
          "Round is completed. Winners are already declared.",
        );
      }
      const matches = await this.getMatchesForRound(roundId);
      //update each match with random winner
      for (const match of matches) {
        if (match.result === "pending") {
          const whiteId = match.white_player_id;
          const blackId = match.black_player_id;
          const winnerId = Math.random() < 0.5 ? whiteId : blackId;
          if (winnerId === whiteId) {
            await this.updateMatchResult(match.id, "white_win", winnerId);
          } else {
            await this.updateMatchResult(match.id, "black_win", winnerId);
          }
        }
      }
      //update the round status
      const roundQuery = `UPDATE rounds SET status = 'completed' WHERE id = $1 RETURNING *`;
      await db.query(roundQuery, [roundId]);

      //return winners of the round
      const winnersQuery = `SELECT winner_player_id FROM matches WHERE round_id = $1`;
      const winnersRows = await db.query(winnersQuery, [roundId]);
      //fetch winner players data
      const winnerPlayerIds = winnersRows.rows.map(
        (row) => row.winner_player_id,
      );
      const winnerPlayersQuery = `SELECT * FROM users WHERE id = ANY($1)`;
      const winnerPlayersRows = await db.query(winnerPlayersQuery, [
        winnerPlayerIds,
      ]);
      console.log(
        "Declared random winners for round",
        roundId,
        "Winners:",
        winnerPlayersRows.rows,
      );
      return {
        roundId,
        winners: winnerPlayersRows.rows,
      };
    } catch (error) {
      throw new ApplicationError(
        500,
        `failed to declare winners : ${error.message}`,
      );
    }
  }
}

export default RoundsModel;
