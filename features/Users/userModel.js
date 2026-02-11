import db from "../../config/db.js";
import ApplicationError from "../../config/applicationError.js";
import { createToken } from "../../config/jwtAuth.js";

class UserModel {
  //creating a new user
  async createUser(data) {
    try {
      const { name, email, password_hash, role } = data;

      if (!name || !email || !password_hash) {
        throw new ApplicationError(500, "Error creating new user ");
      }

      const sql = `
            INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at, updated_at
            `;

      const result = await db.query(sql, [name, email, password_hash, role]);
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError(500, "Error creating new user ");
    }
  }

  //login user
  async loginUser(user) {
    try {
      const { email, password } = user;
      if (!user.email || !user.password) {
        throw new ApplicationError(404, "Email and Password missing");
      }

      const sql = `
      SELECT * FROM users 
      WHERE email = $1
      LIMIT 1
      `;

      const result = await db.query(sql, [email]);
      const dbUser = result.rows[0];

      if (!dbUser) {
        throw new ApplicationError(401, "Invaild Email");
      }

      if (dbUser.password_hash !== password) {
        throw new ApplicationError(401, "INvaild Password");
      }
      //if password maches cfeate an jwt token
      const token = createToken({
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
      });

      return {
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
        },
        token,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      throw new ApplicationError(
        500,
        "Internal server Error. Please try again later",
      );
    }
  }

  //get user by id
  async userInfo(id) {
    try {
      const sql = `
      SELECT id, name, email, role, created_at, updated_at,rating
      FROM users
      WHERE id = $1
      `;
      const result = await db.query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      throw new ApplicationError(500, "Error fetching user by ID");
    }
  }
}

export default UserModel;
