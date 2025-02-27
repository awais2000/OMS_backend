import { Application } from "express";
import { getAllUsers, login, addUser, changePassword, updateUser, deleteUser, getAllCustomer, addCustomerInfo, updateCustomer, deleteCustomer, getAttendance, addAttendance, updateAttendance, deleteAttendance, getUsersLeaves, authorizeLeaves, configHolidays, getHolidays, withdrawEmployee, createCatagory, addProject, alterCategory, deleteCategory, alterProjectInfo, deleteProject,  getProjects, assignProject, getAssignProject, alterAssignProject, deleteAssignment, createTodo, alterTodo, deleteTodo, getTodo, addProgress, alterProgress, deleteProgress, getProgress, addSales, alterSalesData, deleteSale, addPayment, getSales, alterPayments, deletePayment, getPayments, uploadedFile, getuploadfile} from "../controllers/adminController";
import { authenticateToken, isAdmin } from "../middleware/middleware";
import { upload } from "../middleware/uploadMiddleware"; 
import  path  from 'path';

export default (app: Application): void => {
    app.post("/login", login);

    app.get("/admin/getUsers", getAllUsers);
    
    // app.post('/admin/addUsers',upload.single("image"), authenticateToken, isAdmin, addUser);
    app.post('/admin/addUser',upload.single("image"),  addUser);

    app.put('/admin/changePassword/:id',authenticateToken, isAdmin, changePassword);
    // app.put('/admin/changePassword/:id', changePassword);


    app.put('/admin/updateUser/:id', authenticateToken, isAdmin, upload.single("image"), updateUser);
    // app.put('/admin/updateUser/:id',   upload.single("document"), updateUser);

    app.patch("/admin/deleteUser/:id", authenticateToken, isAdmin, deleteUser);
    // app.patch("/admin/deleteUser/:id",  deleteUser);

    //adding Customer Routes:
    app.get('/admin/getAllCustomers', authenticateToken, isAdmin, getAllCustomer);
    // app.get('/admin/getAllCustomers', getAllCustomer); 

    app.post('/admin/addCustomerInfo', authenticateToken, isAdmin, addCustomerInfo); 
    // app.post('/admin/addCustomerInfo', addCustomerInfo);

    app.put('/admin/updateCustomer/:id', authenticateToken, isAdmin, updateCustomer);
    // app.put('/admin/updateCustomers/:id',  updateCustomer);


    app.patch('/admin/deleteCustomer/:id', authenticateToken, isAdmin, deleteCustomer);
    // app.patch('/admin/deleteCustomers/:id',  deleteCustomer);


    //for attendance
    app.get('/admin/getAttendance', authenticateToken, isAdmin, getAttendance); 
    // app.get('/admin/getAttendance', getAttendance);

    app.post('/admin/addAttendance', authenticateToken, isAdmin, addAttendance);
    // app.post('/admin/addAttendance', addAttendance);

    app.put('/admin/updateAttendance/:id', authenticateToken, isAdmin, updateAttendance);
    // app.put('/admin/updateAttendance/:id', updateAttendance);

    // app.patch('/admin/deleteAttendance/:id', authenticateToken, isAdmin, deleteAttendance);
    app.patch('/admin/deleteAttendance/:id', deleteAttendance);

    app.get('/admin/getUsersLeaves', authenticateToken, isAdmin,  getUsersLeaves);
    // app.get('/admin/getUsersLeaves',  getUsersLeaves); 

    app.put('/admin/authorizeLeaves/:id', authenticateToken, isAdmin, authorizeLeaves);
    // app.put('/admin/authorizeLeaves/:id', authorizeLeaves);

    app.get('/admin/getHolidays', authenticateToken, isAdmin, getHolidays);
    // app.get('/admin/getHolidays', getHolidays);

    app.post('/admin/configHolidays', authenticateToken, isAdmin, configHolidays);
    // app.post('/admin/configHolidays', configHolidays);

    app.post('/admin/withdrawEmployees', authenticateToken, isAdmin, withdrawEmployee);
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
    app.get('/admin/getAssignProjects',authenticateToken, isAdmin, getAssignProject);

    app.post('/admin/assignProject', authenticateToken, isAdmin, assignProject);

    app.put('/admin/alterAssignProject/:id',authenticateToken, isAdmin, alterAssignProject);

    app.patch('/admin/deleteAssignment/:id',authenticateToken, isAdmin, deleteAssignment);



    //todo and progress:
    app.get('/admin/getTodos',authenticateToken, isAdmin, getTodo);

    app.post('/admin/createTodo',authenticateToken, isAdmin, createTodo);

    app.post('/admin/alterTodo/:id',authenticateToken, isAdmin, alterTodo); 

    app.patch('/admin/deleteTodo/:id',authenticateToken, isAdmin, deleteTodo); 


    app.get('/admin/getProgress',authenticateToken, isAdmin, getProgress);

    app.post('/admin/addProgress',authenticateToken, isAdmin, addProgress);

    app.post ('/admin/alterProgress/:id',authenticateToken, isAdmin, alterProgress);

    app.patch('/admin/deleteProgress/:id',authenticateToken, isAdmin, deleteProgress); 
    

    //add sales and payments:
    app.get('/admin/getSales',authenticateToken, isAdmin, getSales);

    app.post('/admin/addSales',authenticateToken, isAdmin, addSales);

    app.post('/admin/alterSalesData/:id',authenticateToken, isAdmin, alterSalesData);

    app.patch('/admin/deleteSale/:id',authenticateToken, isAdmin, deleteSale);



    app.get('/admin/getPayments',authenticateToken, isAdmin, getPayments);

    app.post('/admin/addPayment',authenticateToken, isAdmin, addPayment);

    app.put('/admin/alterPayments/:id',authenticateToken, isAdmin, alterPayments);

    app.patch('/admin/deletePayment/:id',authenticateToken, isAdmin, deletePayment);

    

    app.get('/getuploadfile', getuploadfile);
    app.post('/uploadedFile', upload.single("image"), uploadedFile);
    
    
    
};

