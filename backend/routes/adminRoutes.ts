import { Application } from "express";
import { getAllUsers, login, addUser, updateUser, deleteUser, getAllCustomer, addCustomerInfo, updateCustomer, deleteCustomer, getAttendance, addAttendance, updateAttendance, deleteAttendance, getUsersLeaves, authorizeLeaves } from "../controllers/adminController";
import { authenticateToken, isAdmin } from "../middleware/middleware";
import { upload } from "../middleware/uploadMiddleware"; 


export default (app: Application): void => {
    app.post("/login", login);

    app.get("/admin/home", authenticateToken, isAdmin, getAllUsers);
    

    app.post('/admin/addUser',upload.single("document"), authenticateToken, isAdmin, addUser);
    // app.post('/admin/addUser',upload.single("document"),  addUser);

    app.put('/admin/updateUser/:id', authenticateToken, isAdmin, upload.single("document"), updateUser);
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
};

