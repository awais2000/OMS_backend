import { Application } from "express";
import { authenticateToken } from "../middleware/middleware";
import { getAttendance, markAttendance, addLeave, changePassword } from "../controllers/userController";

export default (app: Application): void => {
    app.post('/user/forgetPassword/:id', changePassword);

    app.get('/user/getAttendance/:id',authenticateToken, getAttendance);

    app.post('/user/markAttendance/:id', markAttendance);

    app.post("/user/addLeave",authenticateToken,  addLeave);
    // app.post("/users/addLeave/:id",  addLeave);
}


