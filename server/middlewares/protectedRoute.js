import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import asyncHandler from "./asyncHandler.js";

const protectedRoute = asyncHandler(async (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Un-Authorized" });
    }

    const decoded_token = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded_token.userId).select("-password");

    req.user = user;
    next();
});

export default protectedRoute;
