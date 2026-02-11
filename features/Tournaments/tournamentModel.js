import db from "../../config/db.js";
import ApplicationError from "../../config/applicationError.js";


class TournamentModel {
  async registerTournament(data) {
    try {
      const {
        organizer_name,
        name,
        description = null,
        userId,
        start_date = null,
        end_date = null,
        time_control = null,
        max_players = null,
      } = data;

      if (!name || !userId) {
        throw new ApplicationError(400, "name and userId are required");
      }

      if (max_players !== null && Number(max_players) <= 0) {
        throw new ApplicationError(400, "max_players must be > 0");
      }

      // If you're doing "online", use is_online=true and location=null
      const tournament = {
        organizer_name,
        name,
        description,
        format: "knockout",
        status: "registration_open",
        organizer_user_id: userId,
        is_online: true,
        location: null,
        start_date,
        end_date,
        time_control,
        max_players,
      };

      const sql = `
        INSERT INTO tournaments
          (organizer_name,name, description, format, status, organizer_user_id,
           is_online, location, start_date, end_date, time_control, max_players)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING
          id, name, description, format, status, organizer_user_id,
          is_online, location, start_date, end_date, time_control, max_players,
          created_at, updated_at
      `;

      const values = [
        tournament.organizer_name,
        tournament.name,
        tournament.description,
        tournament.format,
        tournament.status,
        tournament.organizer_user_id,
        tournament.is_online,
        tournament.location,
        tournament.start_date,
        tournament.end_date,
        tournament.time_control,
        tournament.max_players,
      ];

      const result = await db.query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.log("registerTournament error:", error);

      // if your ApplicationError carries statusCode, keep it
      if (error?.statusCode) throw error;

      // FK error: organizer_user_id not found in users table
      if (error?.code === "23503") {
        throw new ApplicationError(400, "Invalid organizer_user_id (user not found)");
      }

      // enum error etc
      throw new ApplicationError(500, "Internal server error. Please try again later");
    }
  }

//update tournament status 
  async updateTournamentStatus(tournamentId, status, userId) {
    try {
      //check if the tournament exists and user is organizer of the tournament
      console.log("updateTournamentStatus called with:", { tournamentId, status, userId });
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new ApplicationError(404, "Tournament not found");
      }
      if (tournament.organizer_user_id !== userId) {
        throw new ApplicationError(403, "Only the organizer can update tournament status");
      }

      const sql = `
        UPDATE tournaments
        SET status = $1
        WHERE id = $2
        RETURNING *
      `;
      const values = [status, tournamentId];
      const result = await db.query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError(500, `Failed to update tournament status: ${error.message}`);
    }
  }
//get organizer tournaments
async getTournamentsByOrganizer(userId) {
  try{
    const sql = `
      SELECT *
      FROM tournaments
      WHERE organizer_user_id = $1
    `;
    const values = [userId];
    const result = await db.query(sql, values);
    return result.rows;
  } catch (error) {
    throw new ApplicationError(500, "Failed to fetch tournaments by organizer");
  }
}


  async getTournamentById(tournamentId) {
    try {
      const sql = `
        SELECT *
        FROM tournaments
        WHERE id = $1
      `;
      const values = [tournamentId];
      const result = await db.query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError(500, "Failed to fetch tournament by ID");
    }
  }

 

  async allTournaments() {
  try {
    const sql = `
      SELECT
        id,
        organizer_name,
        name,
        description,
        format,
        status,
        organizer_user_id,
        is_online,
        location,
        start_date,
        end_date,
        time_control,
        max_players,
        created_at
      FROM tournaments
      ORDER BY created_at DESC
    `;

    const result = await db.query(sql);
    return result.rows;

  } catch (error) {
    throw new ApplicationError(500, "Failed to fetch tournaments");
  }
}

async addPlayerToTournament({ tournamentId, userId }) {
  try {
    
    if (!tournamentId || !userId) {
      throw new ApplicationError(400, "tournamentId and userId are required");
    }

    //check the status of the tournament and max players
    const tournament = await this.getTournamentById(tournamentId);
    if(tournament.status !== "registration_open"){
      throw new ApplicationError(400, "Tournament registration is closed");
    };
    // optional check 
    const checkSql = `
      SELECT 1
      FROM tournament_players
      WHERE tournament_id = $1 AND user_id = $2
      LIMIT 1
    `;
    const checkResult = await db.query(checkSql, [tournamentId, userId]);
    if (checkResult.rows.length > 0) {
      return 1;  //controller will hande the user already registered error
    }

    const sql = `
      INSERT INTO tournament_players (tournament_id, user_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(sql, [tournamentId, userId]);
    return result.rows[0];
  } catch (error) {
    console.log("addPlayerToTournament error:", error);

  
    if (error?.statusCode) throw error;

    if (error?.code === "23505") {
      throw new ApplicationError(400, "User is already registered for this tournament");
    }

    throw new ApplicationError(500, "failed participation");
  }
}

//fetch registered players for a tournament
async getPlayersForTournament(tournamentId){
  try {
    const sql = `
      SELECT tp.user_id, u.name, u.rating
      FROM tournament_players tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1
    `;
    const values = [tournamentId];
    const result = await db.query(sql, values);
    return result.rows;
  } catch (error) {
    throw new ApplicationError(500,`failed to fetch players for tournament ${tournamentId} ${error.message}`);
  }
}

//all tournamets a player is registered in
async getTournamentsForPlayer(userId){
  try {
    const sql = `
      SELECT t.id, t.name, t.description, t.start_date, t.end_date
      FROM tournament_players tp
      JOIN tournaments t ON tp.tournament_id = t.id
      WHERE tp.user_id = $1
    `;
    const values = [userId];
    const result = await db.query(sql, values);
    return result.rows;
  } catch (error) {
    throw new ApplicationError(500,"failed to fetch tournaments for player");
  }
}
}
export default TournamentModel;
