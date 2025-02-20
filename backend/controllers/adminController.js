"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAttendance = exports.updateAttendance = exports.addAttendance = exports.getAttendance = exports.deleteCust = exports.updateCust = exports.addCustInfo = exports.getAllCust = exports.deleteUser = exports.updateUser = exports.addUser = exports.getAllUsers = exports.login = void 0;
const db_1 = __importDefault(require("../database/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 🛠 Login Function with JWT Token for Role-Based Access
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        console.log("Email:", email, "Password:", password);
        const [users] = yield db_1.default.query("SELECT * FROM login WHERE email = ?", [email]);
        if (users.length === 0) {
            res.status(400).json({ status: 400, msg: "Invalid Username or Password" });
            return;
        }
        const user = users[0];
        if (password !== user.password) {
            res.status(400).json({ status: 400, msg: "Invalid Username or Password" });
            return;
        }
        // ✅ Generate JWT token with email & role (NO PASSWORD)
        const token = jsonwebtoken_1.default.sign({ email: user.email, role: user.role }, "your_secret_key", { expiresIn: "1h" });
        res.json({
            status: 200,
            msg: "Login Successful",
            user: { email: user.email, role: user.role },
            token // ✅ Send token so admin can access multiple routes
        });
    }
    catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.login = login;
// 🛠 Get All Users Function
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.default.query("SELECT * FROM login");
        res.json({ users: rows });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Database query failed" });
    }
});
exports.getAllUsers = getAllUsers;
// 🛠 Add User Function with File Upload & Password Hashing
const addUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, contact, cnic, address, date, role } = req.body;
        const image = req.file ? req.file.path : null; // ✅ Store uploaded file path or NULL
        // ✅ Ensure required fields are present
        if (!name || !email || !password || !cnic || !role) {
            res.status(400).json({ status: 400, msg: "Missing required fields" });
            return;
        }
        // ✅ Hash the password before storing it
        const saltRounds = 10;
        const hashedPassword = yield bcrypt_1.default.hash(password, saltRounds);
        // ✅ Insert user into MySQL database with hashed password & image path
        const query = `
            INSERT INTO login (name, email, password, contact, CNIC, address, date, role, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, email, hashedPassword, contact, cnic, address, date, role, image];
        const [result] = yield db_1.default.query(query, values);
        res.status(201).json({
            status: 201,
            msg: "User added successfully",
            userId: result.insertId,
            imagePath: image // ✅ Return uploaded file path
        });
    }
    catch (error) {
        console.error("❌ Error adding user:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.addUser = addUser;
// 🛠 Update User Function (Allows Updating User Info & image)
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Get user ID from URL
        const { name, email, contact, CNIC, address, role } = req.body;
        const newimage = req.file ? req.file.path : null; // ✅ Store new image if uploaded
        // ✅ Check if user exists
        const [user] = yield db_1.default.query("SELECT * FROM login WHERE id = ?", [id]);
        if (user.length === 0) {
            res.status(404).json({ status: 404, msg: "User not found" });
            return;
        }
        let imagePath = user[0].image; // Keep existing image if no new file is uploaded
        // ✅ If a new image is uploaded, delete the old file
        if (newimage) {
            if (imagePath) {
                const oldFilePath = path_1.default.join(__dirname, "../../", imagePath);
                if (fs_1.default.existsSync(oldFilePath)) {
                    fs_1.default.unlinkSync(oldFilePath); // Delete the old file
                }
            }
            imagePath = newimage; // Update image path
        }
        // ✅ Update user in MySQL database
        const query = `
            UPDATE login 
            SET name = ?, email = ?, contact = ?, CNIC = ?, address = ?, role = ?, image = ? 
            WHERE id = ?
        `;
        const values = [name, email, contact, CNIC, address, role, imagePath, id];
        const [result] = yield db_1.default.query(query, values);
        console.log([result]);
        res.status(200).json({
            status: 200,
            msg: "User updated successfully",
            userId: id,
            imagePath
        });
    }
    catch (error) {
        console.error("❌ Error updating user:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.updateUser = updateUser;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Get user ID from URL
        const query = `DELETE FROM login WHERE id = ?`; // Correct way to define the query string
        console.log(id);
        // ✅ Execute the query
        const [result] = yield db_1.default.query(query, [id]); // Pass `id` inside an array for parameterized query
        if (result.affectedRows > 0) {
            res.json({ msg: "Customer deleted successfully" });
        }
        else {
            res.status(404).json({ msg: "Customer not found" });
        }
    }
    catch (error) {
        console.error("❌ Error deleting customer:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});
exports.deleteUser = deleteUser;
// 🛠 Get All Customers Function
const getAllCust = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ Fetch all customers from MySQL
        const [customers] = yield db_1.default.query("SELECT * FROM customers");
        // ✅ Check if customers exist
        if (customers.length === 0) {
            res.status(404).json({ status: 404, msg: "No customers found" });
            return;
        }
        // ✅ Send response with customer data
        res.status(200).json({
            status: 200,
            msg: "Customers fetched successfully",
            customers
        });
    }
    catch (error) {
        console.error("❌ Error fetching customers:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.getAllCust = getAllCust;
// 🛠 Add Customer Function
const addCustInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerName, customerAddress, customerContact, companyName, companyAddress } = req.body;
        // ✅ Ensure required fields are present
        if (!customerName || !customerAddress || !customerContact || !companyName || !companyAddress) {
            res.status(400).json({ status: 400, msg: "Missing required fields" });
            return;
        }
        // ✅ Insert customer into MySQL database
        const query = `
            INSERT INTO customers (customerName, customerAddress, customerContact, companyName, companyAddress)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [customerName, customerAddress, customerContact, companyName, companyAddress];
        const [result] = yield db_1.default.query(query, values);
        res.status(201).json({
            status: 201,
            msg: "Customer added successfully",
            customerId: result.insertId
        });
    }
    catch (error) {
        console.error("❌ Error adding customer:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.addCustInfo = addCustInfo;
// 🛠 Update Customer Function
const updateCust = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Get customer ID from URL params
        const { customerName, customerAddress, customerContact, companyName, companyAddress } = req.body;
        // ✅ Ensure at least one field is provided for update
        if (!customerName && !customerAddress && !customerContact && !companyName && !companyAddress) {
            res.status(400).json({ status: 400, msg: "No fields provided for update" });
            return;
        }
        // ✅ Check if the customer exists
        const [existingCustomer] = yield db_1.default.query("SELECT * FROM customers WHERE id = ?", [id]);
        if (existingCustomer.length === 0) {
            res.status(404).json({ status: 404, msg: "Customer not found" });
            return;
        }
        // ✅ Construct the dynamic update query
        const updateFields = [];
        const values = [];
        if (customerName) {
            updateFields.push("customerName = ?");
            values.push(customerName);
        }
        if (customerAddress) {
            updateFields.push("customerAddress = ?");
            values.push(customerAddress);
        }
        if (customerContact) {
            updateFields.push("customerContact = ?");
            values.push(customerContact);
        }
        if (companyName) {
            updateFields.push("companyName = ?");
            values.push(companyName);
        }
        if (companyAddress) {
            updateFields.push("companyAddress = ?");
            values.push(companyAddress);
        }
        values.push(id); // Add the ID to the values array
        const query = `UPDATE customers SET ${updateFields.join(", ")} WHERE id = ?`;
        // ✅ Execute update query
        const [result] = yield db_1.default.query(query, values);
        res.status(200).json({
            status: 200,
            msg: "Customer updated successfully",
            updatedFields: updateFields
        });
    }
    catch (error) {
        console.error("❌ Error updating customer:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.updateCust = updateCust;
const deleteCust = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Get user ID from URL
        const query = `DELETE FROM customers WHERE id = ?`; // Correct way to define the query string
        console.log(id);
        // ✅ Execute the query
        const [result] = yield db_1.default.query(query, [id]); // Pass `id` inside an array for parameterized query
        if (result.affectedRows > 0) {
            res.json({ msg: "Customer deleted successfully" });
        }
        else {
            res.status(404).json({ msg: "Customer not found" });
        }
    }
    catch (error) {
        console.error("❌ Error deleting customer:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});
exports.deleteCust = deleteCust;
// 🛠 Get Attendance Function
const getAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id } = req.params; // ✅ Get user ID from URL
        // ✅ Check if user exists
        const [user] = yield db_1.default.query("SELECT * FROM login");
        // ✅ Fetch attendance records for the user
        const [attendance] = yield db_1.default.query("SELECT * FROM attendance", [user_id]);
        if (attendance.length === 0) {
            res.status(404).json({ status: 404, msg: "No attendance records found" });
            return;
        }
        // ✅ Send attendance records
        res.status(200).json({
            status: 200,
            msg: "Attendance records fetched successfully",
            user: attendance
        });
    }
    catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
});
exports.getAttendance = getAttendance;
// The `addAttendance` function will handle adding attendance data for a user
const addAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract data from the request body
        const { user_id, date, clockin, clockout, day, status, attendanceStatus, leaveReason } = req.body;
        // SQL query to insert attendance data into the table
        const query = `
            INSERT INTO attendance (
                user_id,
                date,
                clockin,
                clockout,
                day,
                status,
                attendanceStatus,
                leaveReason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // Execute the query
        const [result] = yield db_1.default.query(query, [
            user_id,
            date,
            clockin,
            clockout,
            day,
            status,
            attendanceStatus,
            leaveReason
        ]);
        // Send response with success message
        res.status(201).json({ msg: "Attendance recorded successfully", attendanceId: result.insertId });
    }
    catch (error) {
        console.error("❌ Error adding attendance:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});
exports.addAttendance = addAttendance;
//updating attendance
const updateAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract data from the request body
        const { user_id, date, clockin, clockout, day, status, attendanceStatus, leaveReason } = req.body;
        // Extract the attendance ID from the URL parameters
        const { id } = req.params; // Assumes the ID is passed as a URL parameter
        // SQL query to update attendance data for the given ID
        const query = `
            UPDATE attendance
            SET
                user_id = ?,
                date = ?,
                clockin = ?,
                clockout = ?,
                day = ?,
                status = ?,
                attendanceStatus = ?,
                leaveReason = ?
            WHERE id = ?
        `;
        // Execute the query with the values
        const [result] = yield db_1.default.query(query, [
            user_id,
            date,
            clockin,
            clockout,
            day,
            status,
            attendanceStatus,
            leaveReason,
            id
        ]);
        // Check if the record was updated
        if (result.affectedRows > 0) {
            res.json({ msg: "Attendance updated successfully" });
        }
        else {
            res.status(404).json({ msg: "Attendance record not found" });
        }
    }
    catch (error) {
        console.error("❌ Error updating attendance:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});
exports.updateAttendance = updateAttendance;
//disabling a user:
const deleteAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract the attendance ID from the URL parameters
        const { id } = req.params; // Assumes the ID is passed as a URL parameter
        // SQL query to update the status to 'N' and null other fields
        const query = `
            UPDATE attendance
            SET
                status = 'N',
                clockin = NULL,
                clockout = NULL,
                day = NULL,
                attendanceStatus = NULL,
                leaveReason = NULL
            WHERE id = ?
        `;
        // Execute the query
        const [result] = yield db_1.default.query(query, [id]);
        // Check if the record was updated
        if (result.affectedRows > 0) {
            res.json({ msg: "Attendance status updated successfully to 'N' and other fields nullified." });
        }
        else {
            res.status(404).json({ msg: "Attendance record not found" });
        }
    }
    catch (error) {
        console.error("❌ Error updating attendance:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});
exports.deleteAttendance = deleteAttendance;
