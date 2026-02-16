import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import ApplicationError from "./applicationError.js";

const jwt_secret = process.env.JWT_SECRET;

//create token

export function createToken(user) {
  if (!user || !user.id || !user.name || !user.role) {
    throw new ApplicationError(
      500,
      "Internal Server error. User data is not provided while creating JWT token",
    );
  }
  const payload = {
    userId: user.id,
    username: user.name,
    userrole: user.role,
  };

  return jwt.sign(payload, jwt_secret, { expiresIn: "15m" });
}

//verify token
export function verifyToken(token) {
  return jwt.verify(token, jwt_secret);
}

//Extract token from req

export function extractToken(req) {
  //extartc token from cookie
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

//auth middleware
export function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) {
      throw new ApplicationError(401, "Token not found");
    }
    const decode = verifyToken(token);

    //extarct the payload
    req.user = {
      id: decode.userId,
      username: decode.username,
      userrole: decode.userrole,
    };
    next();
  } catch (error) {
    throw new ApplicationError(401, "Token not found or expired");
  }
}

//role base authentication
export function roleBasedAuth(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApplicationError(401, "Auth token is required");
    }

    if (!roles.includes(req.user.userrole)) {
      throw new ApplicationError(403, "Forbidden Access");
    }

    next();
  };
}
