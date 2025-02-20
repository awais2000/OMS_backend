"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ✅ Fix: Ensure Proper `next()` Usage
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
        res.status(401).json({ status: 401, msg: "Access Denied. No Token Provided." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "your_secret_key");
        req.user = decoded; // ✅ Attach user data to request
        next(); // ✅ Ensure `next()` is called
    }
    catch (error) {
        res.status(403).json({ status: 403, msg: "Invalid Token" });
    }
};
exports.authenticateToken = authenticateToken;
// ✅ Fix: Ensure `next()` is called properly
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ status: 403, msg: "Access Denied. Admins Only." });
        return;
    }
    next(); // ✅ Ensure `next()` is called
};
exports.isAdmin = isAdmin;
