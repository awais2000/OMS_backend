import express, { Request, Response } from "express";
import session from "express-session";

const app = express();

app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));
