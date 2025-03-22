import { Application } from "express";
import { authenticateToken } from "../middleware/middleware";
import { getAttendance, markAttendance, addLeave, changePassword, getTodo, createTodo, alterTodo, getAssignProject, addProgress, getProgress, getUsersLeaves, progressReport, attendanceReport, taskReport } from "../controllers/userController";



export default (app: Application): void => {
    //change password:
    app.post('/user/forgetPassword/:id', changePassword);



    //Attendance:
    app.get('/user/getAttendance/:id',authenticateToken, getAttendance);

    app.post('/user/markAttendance/:id', markAttendance);



    //Todo:
    app.get('/user/getTodo', getTodo);

    app.post('/user/createTodo/:id', createTodo);

    app.put('/user/alterTodo/:employeeId/:id', alterTodo);

    //Assigned Projects:
    app.get('/user/getAssignProject', getAssignProject);


    //Progress:
    app.get('/user/getProgress', getProgress);

    app.post('/user/addProgress/:employeeId/:projectId', addProgress);

    //Report:
    app.get('/user/progressReport', progressReport);

    app.get('/user/attendanceReport', attendanceReport);

    app.get('/user/taskReport' , taskReport);
}
