import { Application } from "express";
import { authenticateToken } from "../middleware/middleware";
import { getAttendance, markAttendance, addLeave, changePassword, getTodo, createTodo, alterTodo, getAssignProject, addProgress, getProgress, getUsersLeaves } from "../controllers/userController";



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


    //Leave:
    // app.post("/user/addLeave",authenticateToken,  addLeave);
    app.get('/user/getUsersLeaves', getUsersLeaves);

    app.post("/user/addLeave/:id",  addLeave);
}
