import { Application } from "express";
import { getImage, getAllUsers, login, addUser, forgetPassword, updateUser, deleteUser, getAllCustomer, addCustomerInfo, updateCustomer, deleteCustomer, getAttendance, addAttendance, updateAttendance, deleteAttendance, addLeave, getUsersLeaves, authorizeLeaves, configHolidays, getHolidays, withdrawEmployee, createCatagory, addProject, alterCategory, deleteCategory, alterProjectInfo, deleteProject,  getProjects, assignProject, getAssignProject, alterAssignProject, deleteAssignment, createTodo, alterTodo, deleteTodo, getTodo, addProgress, alterProgress, deleteProgress, getProgress, addSales, alterSalesData, deleteSale, addPayment, getSales, alterPayments, deletePayment, getPayments, uploadedFile, getuploadfile, getCategory, markAttendance, getTimings, attendanceSummary, addQuotationDetail, addQuotation, getQuotations, updateQuotation, deleteQuotation, getExpenseCategory, createExpenseCatagory, alterExpenseCategory, deleteExpenseCategory, addExpense, updateExpense, deleteExpense, getAllAttendances, configureSalary, changePassword, getSalaryInfo, reActiveEmployee, addCalendarSession, salaryCycle, configureTime, updateTime, getTimeConfigured, deleteTime, withdrawSalary, refundAmount, updateHoliday, deleteHoliday, salesReport, getWithdrawnEmployees, progressReport, attendanceReport, paymentReport, getExpense, expenseReport} from "../controllers/adminController";
import { authenticateToken, isAdmin } from "../middleware/middleware";
import { upload } from "../middleware/uploadMiddleware"; 
// import  path  from 'path';

  
export default (app: Application): void => {
    app.post("/login", login);

    app.get("/admin/getUsers/:entry", getAllUsers);
    // app.get("/admin/getUsers/:entry",getAllUsers);

    // app.post('/admin/addUsers',upload.single("image"), authenticateToken, isAdmin, addUser);
    app.post('/admin/addUser',upload.single("image"),  addUser);

    app.post('/admin/forgetPassword/:id', forgetPassword);


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






    // app.get("/admin/getAttendance/:id", authenticateToken, isAdmin, getAttendance);
  app.get('/admin/getAttendance/:id', getAttendance);


  // getAllAttendances
  app.get("/admin/getAllAttendances", getAllAttendances);


    app.get('/admin/getTimings',  getTimings);

    app.post('/admin/markAttendance/:id',  markAttendance);

    // app.post('/admin/addAttendance/:id', authenticateToken, isAdmin, addAttendance);
    app.post('/admin/addAttendance/:id', addAttendance);

    // app.put('/admin/updateAttendance/:id', authenticateToken, isAdmin, updateAttendance);
    app.put('/admin/updateAttendance/:id', updateAttendance);

    // app.patch('/admin/deleteAttendance/:id', authenticateToken, isAdmin, deleteAttendance);
    app.delete('/admin/deleteAttendance/:id',  deleteAttendance);

    app.get('/admin/attendanceSummary/:id', attendanceSummary);

    app.post("/admin/addLeave/:id",   addLeave);
    

    // app.get('/admin/getUsersLeaves/:entry', authenticateToken, isAdmin,  getUsersLeaves);
    app.get('/admin/getUsersLeaves/:entry',  getUsersLeaves);  

    // app.put('/admin/authorizeLeaves/:id', authenticateToken, isAdmin, authorizeLeaves);
    app.put('/admin/authorizeLeaves/:id', authorizeLeaves);



    // app.get('/admin/getHolidays', authenticateToken, isAdmin, getHolidays);
    app.get('/admin/getHolidays', getHolidays);

    // app.post('/admin/configHolidays', authenticateToken, isAdmin, configHolidays);
    app.post('/admin/configHolidays', configHolidays);

    app.put('/admin/updateHoliday/:id', updateHoliday);

    app.patch('/admin/deleteHoliday/:id', deleteHoliday)

    app.get('/admin/getWithdrawnEmployees', getWithdrawnEmployees);

    // app.post('/admin/withdrawEmployees/:id', authenticateToken, isAdmin, withdrawEmployee);
    app.post('/admin/withdrawEmployee/:id', withdrawEmployee);

    app.put('/admin/reActiveEmployee/:id', reActiveEmployee);





    //--------> add Catagory:
    app.get('/admin/getCategory/:entry', getCategory);

    app.post('/admin/createCatagory',createCatagory);

    app.put('/admin/alterCategory/:id', alterCategory);

    app.patch('/admin/deleteCategory/:id', deleteCategory);





    //======>add project:
    app.get('/admin/getProjects/:entry', getProjects);

    app.post('/admin/addProject', addProject);

    app.put('/admin/alterProjectInfo/:id', alterProjectInfo);//===============>change update

    app.patch('/admin/deleteProject/:id', deleteProject);




    // ======> assign project:
    app.get('/admin/getAssignProjects/:entry', getAssignProject);

    app.post('/admin/assignProject/:userId/:projectId', assignProject);

    app.put('/admin/alterAssignProject/:employeeId/:projectId/:id',   alterAssignProject);

    app.patch('/admin/deleteAssignment/:id', deleteAssignment);





    //todo and progress:
    app.get('/admin/getTodos/:entry', getTodo);

    app.post('/admin/createTodo/:id', createTodo);

    app.put('/admin/alterTodo/:employeeId/:id', alterTodo); 

    app.patch('/admin/deleteTodo/:id', deleteTodo); 


    app.get('/admin/getProgress/:entry?', getProgress);

    app.post('/admin/addProgress/:employeeId/:projectId',  addProgress);

    app.put ('/admin/alterProgress/:employeeId/:projectId/:id',   alterProgress);

    app.patch('/admin/deleteProgress/:id', deleteProgress); 
    





    //add sales and payments:
    app.get('/admin/getSales/:entry',getSales);

    app.post('/admin/addSales/:customerId/:projectId', addSales);

    app.put('/admin/alterSalesData/:customerId/:projectId/:id',  alterSalesData);

    app.patch('/admin/deleteSale/:id',authenticateToken, isAdmin, deleteSale);





    app.get('/admin/getPayments/:entry', getPayments);

    app.post('/admin/addPayment/:id', addPayment);

    app.put('/admin/alterPayments/:customerId/:id',alterPayments);

    app.patch('/admin/deletePayment/:id',authenticateToken, isAdmin, deletePayment);

    



    app.post('/admin/addQuotationDetail', addQuotationDetail);

    app.post('/admin/addQuotation/:customerId', addQuotation);

    app.get('/admin/getQuotations', getQuotations);

    app.put('/admin/updateQuotation/:id', updateQuotation);

    app.patch('/admin/deleteQuotation/:id', deleteQuotation);



    //expense management:
    app.get('/admin/getExpenseCategory', getExpenseCategory);

    app.post('/admin/createExpenseCatagory', createExpenseCatagory);

    app.put('/admin/alterExpenseCategory/:id', alterExpenseCategory);

    app.patch('/admin/deleteExpenseCategory/:id', deleteExpenseCategory);

    app.get('/admin/getExpense', getExpense);

    app.post('/admin/addExpense/:expenseCategoryId', addExpense);


    app.put('/admin/updateExpense/:expenseCategoryId/:id', updateExpense); 

    app.patch('/admin/deleteExpense/:id', deleteExpense);



    //monthly account cycle:
    app.get('/admin/getSalaryInfo', getSalaryInfo);
   app.post('/admin/configureSalary/:id', configureSalary);


  app.post('/admin/addCalendarSession', addCalendarSession);

  app.post('/admin/salaryCycle', salaryCycle); //=====>


  //configureTime:
  app.get('/admin/getTimeConfigured', getTimeConfigured); 

  app.post('/admin/configureTime', configureTime);

  app.put('/admin/updateTime/:id', updateTime);

  app.patch('/admin/deleteTime/:id', deleteTime);





  //Employee Account List
  app.post('/admin/withdrawSalary/:id', withdrawSalary);  
  
  app.post('/admin/refundAmount/:id',  refundAmount);




  //Reports:
  app.get('/admin/salesReport', salesReport);

  app.get('/admin/progressReport', progressReport);
  
  app.get('/admin/attendanceReport', attendanceReport);

  app.get('/admin/paymentReport', paymentReport);

  app.get('/admin/expenseReport', expenseReport);
  
  app.get('/getuploadfile', getuploadfile);

  app.post('/uploadedFile', upload.single("image"), uploadedFile);  


  app.get('/admin/getImage', getImage);
};










