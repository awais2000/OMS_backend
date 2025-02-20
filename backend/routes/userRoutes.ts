import { Application } from "express";
import { getAttendance, markAttendance } from "../controllers/userController";

export default (app: Application): void => {
    app.get('/users/getAttendance/:id', getAttendance);

    app.post('/users/markAttendance/:id', markAttendance);

    // app.post('/users/addLeave', addLeave);
}


