import { Request } from "express";

declare module "express" {
  export interface Request {
    user?: { email: string; role: string };  // ✅ Use email instead of id
  }
}
//this is user side