import { Application } from "express";
import { getAttendance } from "../controllers/userController";

export default (app: Application): void => {
    app.get('/users/getAttendance', getAttendance);
}


