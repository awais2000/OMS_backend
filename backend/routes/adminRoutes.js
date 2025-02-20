"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adminController_1 = require("../controllers/adminController");
const middleware_1 = require("../middleware/middleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
exports.default = (app) => {
    app.post("/login", adminController_1.login);
    app.get("/admin/home", middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.getAllUsers);
    app.post('/admin/addUser', uploadMiddleware_1.upload.single("document"), middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.addUser);
    // app.post('/admin/addUser',upload.single("document"),  addUser);
    app.put('/admin/updateUser/:id', middleware_1.authenticateToken, middleware_1.isAdmin, uploadMiddleware_1.upload.single("document"), adminController_1.updateUser);
    // app.put('/admin/updateUser/:id',   upload.single("document"), updateUser);
    app.delete("/admin/deleteUser/:id", middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.deleteUser);
    // app.delete("/admin/deleteUser/:id",  deleteUser);
    //adding Customer Routes:
    app.get('/admin/getAllCust', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.getAllCust);
    // app.get('/admin/getAllCust', getAllCust);
    app.post('/admin/addCustInfo', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.addCustInfo);
    // app.post('/admin/addCustInfo', addCustInfo);
    app.put('/admin/updateCust/:id', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.updateCust);
    app.delete('/admin/deleteCust/:id', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.deleteCust);
    //for attendance
    app.get('/admin/getAttendance', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.getAttendance);
    // app.get('/admin/getAttendance', getAttendance);
    app.post('/admin/addAttendance', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.addAttendance);
    // app.post('/admin/addAttendance', addAttendance);
    app.put('/admin/updateAttendance', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.updateAttendance);
    // app.put('/admin/updateAttendance/:id', updateAttendance);
    app.delete('/admin/deleteAttendance', middleware_1.authenticateToken, middleware_1.isAdmin, adminController_1.deleteAttendance);
    // app.patch('/admin/deleteAttendance/:id', deleteAttendance);
};
