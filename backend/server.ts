import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./database/db"; // Ensure this is correct
import adminRoutes from "./routes/adminRoutes";
import userRoutes from "./routes/userRoutes";

const app: Application = express();
const PORT: number = 3001;

dotenv.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

// Middleware
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running!");
});

// Test DB Connection
pool.getConnection()
  .then(connection => {
    console.log("Connected to MySQL database.");
    connection.release();
  })
  .catch(err => {
    console.error("Database connection failed:", err.message);
  });

// Import Routes

adminRoutes(app);
userRoutes(app);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


