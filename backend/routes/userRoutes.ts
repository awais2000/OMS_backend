import { Application } from "express";
import { authenticateToken } from "../middleware/middleware";
import { getAttendance, markAttendance, addLeave } from "../controllers/userController";

export default (app: Application): void => {
    app.get('/users/getAttendance/:id',authenticateToken, getAttendance);

    app.post('/users/markAttendance/:id',authenticateToken, markAttendance);

    app.post("/users/addLeave",authenticateToken,  addLeave);
    // app.post("/users/addLeave/:id",  addLeave);
}


