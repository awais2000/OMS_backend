import { Application } from "express";
import { getAllUsers, login, addUser, changePassword, updateUser, deleteUser, getAllCustomer, addCustomerInfo, updateCustomer, deleteCustomer, getAttendance, addAttendance, updateAttendance, deleteAttendance, getUsersLeaves, authorizeLeaves, configHolidays, getHolidays, withdrawEmployee, createCatagory, addProject, alterCategory, deleteCategory, alterProjectInfo, deleteProject,  getProjects, assignProject, getAssignProject, alterAssignProject, deleteAssignment, createTodo, alterTodo, deleteTodo, getTodo, addProgress, alterProgress, deleteProgress, getProgress, addSales, alterSalesData, deleteSale, addPayment, getSales, alterPayments, deletePayment, getPayments, uploadedFile, getuploadfile, getCategory, markAttendance, getTimings, attendanceSummary, getAllAttendance, createInvoice, addQuotationDetail} from "../controllers/adminController";
import { authenticateToken, isAdmin } from "../middleware/middleware";
import { upload } from "../middleware/uploadMiddleware"; 
// import  path  from 'path';


export default (app: Application): void => {
    app.post("/login", login);

    app.get("/admin/getUsers/:entry",authenticateToken, isAdmin, getAllUsers);
    // app.get("/admin/getUsers/:entry",getAllUsers);

    // app.post('/admin/addUsers',upload.single("image"), authenticateToken, isAdmin, addUser);
    app.post('/admin/addUser',upload.single("image"),  addUser);

    app.put('/admin/changePassword/:id',authenticateToken, isAdmin, changePassword);
    // app.put('/admin/changePassword/:id', changePassword);

    // app.put('/admin/updateUser/:id', authenticateToken, isAdmin, upload.single("image"), updateUser);
    app.put('/admin/updateUser/:id',   upload.single("document"), updateUser);

    app.patch("/admin/deleteUser/:id", authenticateToken, isAdmin, deleteUser);
    // app.patch("/admin/deleteUser/:id",  deleteUser);




    //adding Customer Routes:
    app.get('/admin/getAllCustomers/:entry', authenticateToken, isAdmin, getAllCustomer);
    // app.get('/admin/getAllCustomers/:entry', getAllCustomer); 

    app.post('/admin/addCustomer', authenticateToken, isAdmin, addCustomerInfo); 
    // app.post('/admin/addCustomerInfo', addCustomerInfo);

    // app.put('/admin/updateCustomer/:id', authenticateToken, isAdmin, updateCustomer);
    app.put('/admin/updateCustomers/:id',  updateCustomer);

    app.patch('/admin/deleteCustomer/:id', authenticateToken, isAdmin, deleteCustomer);
    // app.patch('/admin/deleteCustomers/:id',  deleteCustomer);






    //for attendance
    app.get('/admin/getAllAttendance/:entry', getAllAttendance);


    // app.get('/admin/getAttendance/:entry', authenticateToken, isAdmin, getAttendance); 
    app.get('/admin/getAttendance/:id/:entry', getAttendance);

    app.get('/admin/getTimings',  getTimings);

    app.post('/admin/markAttendance/:id',  markAttendance);

    // app.post('/admin/addAttendance', authenticateToken, isAdmin, addAttendance);
    app.post('/admin/addAttendance', addAttendance);

    app.put('/admin/updateAttendance/:id', authenticateToken, isAdmin, updateAttendance);
    // app.put('/admin/updateAttendance/:id', updateAttendance);

    app.patch('/admin/deleteAttendance/:id', authenticateToken, isAdmin, deleteAttendance);
    // app.patch('/admin/deleteAttendance/:id', deleteAttendance);

    app.get('/admin/attendanceSummary/:id', attendanceSummary);

    app.get('/admin/getUsersLeaves/:entry', authenticateToken, isAdmin,  getUsersLeaves);
    // app.get('/admin/getUsersLeaves/:entry',  getUsersLeaves); 

    app.put('/admin/authorizeLeaves/:id', authenticateToken, isAdmin, authorizeLeaves);
    // app.put('/admin/authorizeLeaves/:id', authorizeLeaves);



    app.get('/admin/getHolidays/:entry', authenticateToken, isAdmin, getHolidays);
    // app.get('/admin/getHolidays/:entry', getHolidays);

    app.post('/admin/configHolidays', authenticateToken, isAdmin, configHolidays);
    // app.post('/admin/configHolidays', configHolidays);

    app.post('/admin/withdrawEmployees', authenticateToken, isAdmin, withdrawEmployee);
    // app.post('/admin/withdrawEmployee', withdrawEmployee);






    //--------> add Catagory:
    app.get('/admin/getCategory/:entry',authenticateToken, isAdmin, getCategory);

    app.post('/admin/createCatagory',authenticateToken, isAdmin, createCatagory);

    app.put('/admin/alterCategory/:id',authenticateToken, isAdmin, alterCategory);

    app.patch('/admin/deleteCategory/:id',authenticateToken, isAdmin, deleteCategory);





    //======>add project:
    app.get('/admin/getProjects/:entry',authenticateToken, isAdmin, getProjects);

    app.post('/admin/addProject',authenticateToken, isAdmin, addProject);

    app.put('/admin/alterProjectInfo/:id',authenticateToken, isAdmin, alterProjectInfo);

    app.patch('/admin/deleteProject/:id',authenticateToken, isAdmin, deleteProject);




    // ======> assign project:
    app.get('/admin/getAssignProjects/:entry',authenticateToken, isAdmin, getAssignProject);

    app.post('/admin/assignProject', authenticateToken, isAdmin, assignProject);

    app.put('/admin/alterAssignProject/:id',authenticateToken, isAdmin, alterAssignProject);

    app.patch('/admin/deleteAssignment/:id',authenticateToken, isAdmin, deleteAssignment);





    //todo and progress:
    app.get('/admin/getTodos/:entry',authenticateToken, isAdmin, getTodo);

    app.post('/admin/createTodo',authenticateToken, isAdmin, createTodo);

    app.post('/admin/alterTodo/:id',authenticateToken, isAdmin, alterTodo); 

    app.patch('/admin/deleteTodo/:id',authenticateToken, isAdmin, deleteTodo); 


    app.get('/admin/getProgress/:entry',authenticateToken, isAdmin, getProgress);

    app.post('/admin/addProgress',authenticateToken, isAdmin, addProgress);

    app.post ('/admin/alterProgress/:id',authenticateToken, isAdmin, alterProgress);

    app.patch('/admin/deleteProgress/:id',authenticateToken, isAdmin, deleteProgress); 
    





    //add sales and payments:
    app.get('/admin/getSales/:entry',authenticateToken, isAdmin, getSales);

    app.post('/admin/addSales',authenticateToken, isAdmin, addSales);

    app.post('/admin/alterSalesData/:id',authenticateToken, isAdmin, alterSalesData);

    app.patch('/admin/deleteSale/:id',authenticateToken, isAdmin, deleteSale);





    app.get('/admin/getPayments/:entry',authenticateToken, isAdmin, getPayments);

    app.post('/admin/addPayment',authenticateToken, isAdmin, addPayment);

    app.put('/admin/alterPayments/:id',authenticateToken, isAdmin, alterPayments);

    app.patch('/admin/deletePayment/:id',authenticateToken, isAdmin, deletePayment);

    


    app.post('/admin/createInvoice', createInvoice);


    app.post('/admin/addQuotationDetail', addQuotationDetail);

    

    app.get('/getuploadfile', getuploadfile);
    app.post('/uploadedFile', upload.single("image"), uploadedFile);
    
    
    
};

