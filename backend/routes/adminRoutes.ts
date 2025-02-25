import { Application } from "express";
import { getAllUsers, login, addUser, updateUser, deleteUser, getAllCustomer, addCustomerInfo, updateCustomer, deleteCustomer, getAttendance, addAttendance, updateAttendance, deleteAttendance, getUsersLeaves, authorizeLeaves, configHolidays, getHolidays, withdrawEmployee, createCatagory, addProject, alterCategory, deleteCategory, alterProjectInfo, deleteProject,  getProjects, assignProject, getAssignProject, alterAssignProject, deleteAssignment, createTodo, alterTodo, deleteTodo, getTodo} from "../controllers/adminController";
import { authenticateToken, isAdmin } from "../middleware/middleware";
import { upload } from "../middleware/uploadMiddleware"; 


export default (app: Application): void => {
    app.post("/login", login);

    app.get("/admin/getUser", authenticateToken, isAdmin, getAllUsers);
    

    app.post('/admin/addUser',upload.single("image"), authenticateToken, isAdmin, addUser);
    // app.post('/admin/addUser',upload.single("image"),  addUser);

    app.put('/admin/updateUser/:id', authenticateToken, isAdmin, upload.single("image"), updateUser);
    // app.put('/admin/updateUser/:id',   upload.single("document"), updateUser);

    app.delete("/admin/deleteUser/:id", authenticateToken, isAdmin, deleteUser);
    // app.delete("/admin/deleteUser/:id",  deleteUser);

    //adding Customer Routes:
    app.get('/admin/getAllCustomer', authenticateToken, isAdmin, getAllCustomer);
    // app.get('/admin/getAllCustomer', getAllCustomer); 

    app.post('/admin/addCustomerInfo', authenticateToken, isAdmin, addCustomerInfo); 
    // app.post('/admin/addCustomerInfo', addCustomerInfo);

    app.put('/admin/updateCustomer/:id', authenticateToken, isAdmin, updateCustomer);
    // app.put('/admin/updateCustomer/:id',  updateCustomer);


    app.delete('/admin/deleteCustomer/:id', authenticateToken, isAdmin, deleteCustomer);

    //for attendance
    app.get('/admin/getAttendance', authenticateToken, isAdmin, getAttendance); 
    // app.get('/admin/getAttendance', getAttendance);

    app.post('/admin/addAttendance', authenticateToken, isAdmin, addAttendance);
    // app.post('/admin/addAttendance', addAttendance);

    app.put('/admin/updateAttendance/:id', authenticateToken, isAdmin, updateAttendance);
    // app.put('/admin/updateAttendance/:id', updateAttendance);

    app.delete('/admin/deleteAttendance/:id', authenticateToken, isAdmin, deleteAttendance);
    // app.patch('/admin/deleteAttendance/:id', deleteAttendance);

    app.get('/admin/getUsersLeaves', authenticateToken, isAdmin,  getUsersLeaves);
    // app.get('/admin/getUsersLeaves',  getUsersLeaves); 

    app.put('/admin/authorizeLeaves/:id', authenticateToken, isAdmin, authorizeLeaves);
    // app.put('/admin/authorizeLeaves/:id', authorizeLeaves);

    app.get('/admin/getHolidays', authenticateToken, isAdmin, getHolidays);
    // app.get('/admin/getHolidays', getHolidays);

    app.post('/admin/configHolidays', authenticateToken, isAdmin, configHolidays);
    // app.post('/admin/configHolidays', configHolidays);

    app.post('/admin/withdrawEmployee', authenticateToken, isAdmin, withdrawEmployee);
    // app.post('/admin/withdrawEmployee', withdrawEmployee);


    //--------> add Catagory:
    app.post('/admin/createCatagory',authenticateToken, isAdmin, createCatagory);

    app.put('/admin/alterCategory/:id',authenticateToken, isAdmin, alterCategory);

    app.patch('/admin/deleteCategory/:id',authenticateToken, isAdmin, deleteCategory);


    //======>add project:
    app.get('/admin/getProjects', getProjects);

    app.post('/admin/addProject',authenticateToken, isAdmin, addProject);

    app.put('/admin/alterProjectInfo/:id',authenticateToken, isAdmin, alterProjectInfo);

    app.patch('/admin/deleteProject/:id',authenticateToken, isAdmin, deleteProject);

    // ======> assign project:
    app.get('/admin/getAssignProject',authenticateToken, isAdmin, getAssignProject);

    app.post('/admin/assignProject', authenticateToken, isAdmin, assignProject);

    app.put('/admin/alterAssignProject/:id',authenticateToken, isAdmin, alterAssignProject);

    app.patch('/admin/deleteAssignment/:id',authenticateToken, isAdmin, deleteAssignment);



    //todo and progress:
    app.get('/admin/getTodo', getTodo);

    app.post('/admin/createTodo', createTodo);

    app.post('/admin/alterTodo/:id', alterTodo); 

    app.patch('/admin/deleteTodo/:id', deleteTodo); 
};

