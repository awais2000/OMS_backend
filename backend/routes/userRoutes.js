"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userController_1 = require("../controllers/userController");
exports.default = (app) => {
    app.get('/users/getAttendance/:id', userController_1.getAttendance);
    app.post('/users/markAttendance/:id', userController_1.markAttendance);
    // app.post('/users/addLeave', addLeave);
};
