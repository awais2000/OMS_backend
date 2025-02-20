"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./database/db")); // Ensure this is correct
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const app = (0, express_1.default)();
const PORT = 3001;
dotenv_1.default.config();
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Middleware
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Server is running!");
});
// Test DB Connection
db_1.default.getConnection()
    .then(connection => {
    console.log("Connected to MySQL database.");
    connection.release();
})
    .catch(err => {
    console.error("Database connection failed:", err.message);
});
// Import Routes
(0, adminRoutes_1.default)(app);
(0, userRoutes_1.default)(app);
// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
