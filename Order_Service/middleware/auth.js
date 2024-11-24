import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import AppError from "../error/AppError.js";

dotenv.config();

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next(new AppError("Please login to access this route", 401));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new AppError("Invalid token", 401));
    }
    req.user = decoded.user[0];
    next();
  });
};

export const authorizationAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to perform this action", 403)
    );
  }
};
