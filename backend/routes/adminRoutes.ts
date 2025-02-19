import { Application } from "express";
import { getAllUsers, login, addUser, updateUser, deleteUser, getAllCust, addCustInfo, updateCust, deleteCust, getAttendance, addAttendance, updateAttendance, deleteAttendance } from "../controllers/adminController";
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
    app.get('/admin/getAllCust', authenticateToken, isAdmin, getAllCust);
    // app.get('/admin/getAllCust', getAllCust);

    app.post('/admin/addCustInfo', authenticateToken, isAdmin, addCustInfo);
    // app.post('/admin/addCustInfo', addCustInfo);

    app.put('/admin/updateCust/:id', authenticateToken, isAdmin, updateCust);

    app.delete('/admin/deleteCust/:id', authenticateToken, isAdmin, deleteCust);

    //for attendance
    app.get('/admin/getAttendance', authenticateToken, isAdmin, getAttendance);
    // app.get('/admin/getAttendance', getAttendance);

    app.post('/admin/addAttendance', authenticateToken, isAdmin, updateAttendance);
    // app.post('/admin/addAttendance', addAttendance);

    app.put('/admin/updateAttendance', authenticateToken, isAdmin, updateAttendance);
    // app.put('/admin/updateAttendance/:id', updateAttendance);

    app.delete('/admin/deleteAttendance', authenticateToken, isAdmin, deleteAttendance);
    // app.patch('/admin/deleteAttendance/:id', deleteAttendance);
};

//sin1::tgsh7-1739958814948-5e6e7d0b934e