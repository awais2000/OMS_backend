import { Request, Response } from "express";
import pool from "../database/db"; 
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";


// 🛠 Login Function with JWT Token for Role-Based Access
export const login = async (req: Request, res: Response): Promise<void> => {
    try {

        const { email, password } = req.body;
        console.log("Email:", email, "Password:", password);

        const [users]: any = await pool.query("SELECT * FROM login WHERE email = ?", [email]);

        if (users.length === 0) {
            res.status(400).json({ status: 400, message: "Invalid Username or Password" });
            return;
        }

        const user = users[0];

        if (password !== user.password) {
            res.status(400).json({ status: 400, message: "Invalid Username or Password" });
            return;
        }

        // ✅ Generate JWT token with email & role (NO PASSWORD)
        const token = jwt.sign(
            { email: user.email, role: user.role },
            "your_secret_key",
            { expiresIn: "1h" }
        );

        res.json({
            status: 200,
            message: "Login Successful",
            user: { email: user.email, role: user.role },
            token  // ✅ Send token so admin can access multiple routes
        });

    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};



// 🛠 Get All Users Function
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows]: any = await pool.query("SELECT * FROM login");
        res.json({ users: rows });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Database query failed" });
    }
};



// 🛠 Add User Function with File Upload & Password Hashing
export const addUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, contact, cnic, address, date, role } = req.body;
        const image = req.file ? req.file.path : null; // ✅ Store uploaded file path or NULL

        // ✅ Ensure required fields are present
        if (!name || !email || !password || !cnic || !role) {
            res.status(400).json({ status: 400, message: "Missing required fields" });
            return;
        }

        // ✅ Hash the password before storing it
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // ✅ Insert user into MySQL database with hashed password & image path
        const query = `
            INSERT INTO login (name, email, password, contact, cnic, address, date, role, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, email, hashedPassword, contact, cnic, address, date, role, image];

        const [result]: any = await pool.query(query, values);

        res.status(201).json({
            status: 201,
            message: "User added successfully",
            userId: result.insertId,
            imagePath: image  // ✅ Return uploaded file path
        });

    } catch (error) {
        console.error("❌ Error adding user:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};



// 🛠 Update User Function (Allows Updating User Info & image)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  // Get user ID from URL
        const { name, email, contact, cnic, address, role } = req.body;
        const newimage = req.file ? req.file.path : null; // ✅ Store new image if uploaded

        // ✅ Check if user exists
        const [user]: any = await pool.query("SELECT * FROM login WHERE id = ?", [id]);
        if (user.length === 0) {
            res.status(404).json({ status: 404, message: "User not found" });
            return;
        }

        let imagePath = user[0].image; // Keep existing image if no new file is uploaded

        // ✅ If a new image is uploaded, delete the old file
        if (newimage) {
            if (imagePath) {
                const oldFilePath = path.join(__dirname, "../../", imagePath);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath); // Delete the old file
                }
            }
            imagePath = newimage; // Update image path
        }

        // ✅ Update user in MySQL database
        const query = `
            UPDATE login 
            SET name = ?, email = ?, contact = ?, cnic = ?, address = ?, role = ?, image = ? 
            WHERE id = ?
        `;
        const values = [name, email, contact, cnic, address, role, imagePath, id];

        const [result]: any = await pool.query(query, values);
        console.log([result]);
        
        res.status(200).json({
            status: 200,
            message: "User updated successfully",
            userId: id,
            imagePath
        });

    } catch (error) {
        console.error("❌ Error updating user:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;  // Get user ID from URL

        const query: string = `DELETE FROM login WHERE id = ?`;  // Correct way to define the query string
        console.log(id);

        // ✅ Execute the query
        const [result]: any = await pool.query(query, [id]);  // Pass `id` inside an array for parameterized query

        if (result.affectedRows > 0) {
            res.json({ message: "Customer deleted successfully" });
        } else {
            res.status(404).json({ message: "Customer not found" });
        }

    } catch (error) {
        console.error("❌ Error deleting customer:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// 🛠 Get All Customers Function
export const getAllCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ Fetch all customers from MySQL
        const [customers]: any = await pool.query("SELECT * FROM customers");

        // ✅ Check if customers exist
        if (customers.length === 0) {
            res.status(404).json({ status: 404, message: "No customers found" });
            return;
        }

        // ✅ Send response with customer data
        res.status(200).json({
            status: 200,
            message: "Customers fetched successfully",
            customers
        });

    } catch (error) {
        console.error("❌ Error fetching customers:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};



// 🛠 Add Customer Function
export const addCustomerInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerName, customerAddress, customerContact, companyName, companyAddress } = req.body;

        // ✅ Ensure required fields are present
        if (!customerName || !customerAddress || !customerContact || !companyName || !companyAddress) {
            res.status(400).json({ status: 400, message: "Missing required fields" });
            return;
        }

        // ✅ Insert customer into MySQL database
        const query = `
            INSERT INTO customers (customerName, customerAddress, customerContact, companyName, companyAddress)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [customerName, customerAddress, customerContact, companyName, companyAddress];

        const [result]: any = await pool.query(query, values);

        res.status(201).json({
            status: 201,
            message: "Customer added successfully",
            customerId: result.insertId
        });

    } catch (error) {
        console.error("❌ Error adding customer:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};




// 🛠 Update Customer Function
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Get customer ID from URL params
        const { customerName, customerAddress, customerContact, companyName, companyAddress } = req.body;

        // ✅ Ensure at least one field is provided for update
        if (!customerName && !customerAddress && !customerContact && !companyName && !companyAddress) {
            res.status(400).json({ status: 400, message: "No fields provided for update" });
            return;
        }

        // ✅ Check if the customer exists
        const [existingCustomer]: any = await pool.query("SELECT * FROM customers WHERE id = ?", [id]);
        if (existingCustomer.length === 0) {
            res.status(404).json({ status: 404, message: "Customer not found" });
            return;
        }

        // ✅ Construct the dynamic update query
        const updateFields = [];
        const values = [];

        if (customerName) { updateFields.push("customerName = ?"); values.push(customerName); }
        if (customerAddress) { updateFields.push("customerAddress = ?"); values.push(customerAddress); }
        if (customerContact) { updateFields.push("customerContact = ?"); values.push(customerContact); }
        if (companyName) { updateFields.push("companyName = ?"); values.push(companyName); }
        if (companyAddress) { updateFields.push("companyAddress = ?"); values.push(companyAddress); }

        values.push(id); // Add the ID to the values array

        const query = `UPDATE customers SET ${updateFields.join(", ")} WHERE id = ?`;

        // ✅ Execute update query
        const [result]: any = await pool.query(query, values);

        res.status(200).json({
            status: 200,
            message: "Customer updated successfully",
            updatedFields: updateFields
        });

    } catch (error) {
        console.error("❌ Error updating customer:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};


export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  // Get user ID from URL

        const query: string = `DELETE FROM customers WHERE id = ?`;  // Correct way to define the query string
        console.log(id);

        // ✅ Execute the query
        const [result]: any = await pool.query(query, [id]);  // Pass `id` inside an array for parameterized query

        if (result.affectedRows > 0) {
            res.json({ message: "Customer deleted successfully" });
        } else {
            res.status(404).json({ message: "Customer not found" });
        }

    } catch (error) {
        console.error("❌ Error deleting customer:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



// 🛠 Get Attendance Function
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params; // ✅ Get user ID from URL

        // ✅ Check if user exists
        const [user]: any = await pool.query("SELECT * FROM login");
        
        // ✅ Fetch attendance records for the user
        const [attendance]: any = await pool.query(
            "SELECT * FROM attendance",
            [userId]
        );

        if (attendance.length === 0) {
            res.status(404).json({ status: 404, message: "No attendance records found" });
            return;
        }

        // ✅ Send attendance records
        res.status(200).json({
            status: 200,
            message: "Attendance records fetched successfully",
            user: attendance
        });

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};


// The `addAttendance` function will handle adding attendance data for a user
export const addAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract data from the request body
        const {
            userId,
            date,
            clockIn,
            clockOut,
            day,
            status,
            attendanceStatus,
            leaveReason
        } = req.body;

        // SQL query to insert attendance data into the table
        const query = `
            INSERT INTO attendance (
                userId,
                date,
                clockIn,
                clockOut,
                day,
                status,
                attendanceStatus,
                leaveReason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Execute the query
        const [result]: any = await pool.query(query, [
            userId,
            date,
            clockIn,
            clockOut,
            day,
            status,
            attendanceStatus,
            leaveReason
        ]);

        // Send response with success message
        res.status(201).json({ message: "Attendance recorded successfully", attendanceId: result.insertId });
    } catch (error) {
        console.error("❌ Error adding attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//updating attendance
export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract data from the request body
        const {
            userId,
            date,
            clockIn,
            clockOut,
            day,
            status,
            attendanceStatus,
            leaveReason
        } = req.body;

        // Extract the attendance ID from the URL parameters
        const { id } = req.params;  // Assumes the ID is passed as a URL parameter

        // SQL query to update attendance data for the given ID
        const query = `
            UPDATE attendance
            SET
                userId = ?,
                date = ?,
                clockIn = ?,
                clockOut = ?,
                day = ?,
                status = ?,
                attendanceStatus = ?,
                leaveReason = ?
            WHERE id = ?
        `;

        // Execute the query with the values
        const [result]: any = await pool.query(query, [
            userId,
            date,
            clockIn,
            clockOut,
            day,
            status,
            attendanceStatus,
            leaveReason,
            id
        ]);

        // Check if the record was updated
        if (result.affectedRows > 0) {
            res.json({ message: "Attendance updated successfully" });
        } else {
            res.status(404).json({ message: "Attendance record not found" });
        }

    } catch (error) {
        console.error("❌ Error updating attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//disabling a user:
export const deleteAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract the attendance ID from the URL parameters
        const { id } = req.params;  // Assumes the ID is passed as a URL parameter

        // SQL query to update the status to 'N' and null other fields
        const query = `
            UPDATE attendance
            SET
                status = 'N',
                clockIn = NULL,
                clockOut = NULL,
                day = NULL,
                attendanceStatus = NULL,
                leaveReason = NULL
            WHERE id = ?
        `;

        // Execute the query
        const [result]: any = await pool.query(query, [id]);

        // Check if the record was updated
        if (result.affectedRows > 0) {
            res.json({ message: "Attendance status updated successfully to 'N' and other fields nullified." });
        } else {
            res.status(404).json({ message: "Attendance record not found" });
        }

    } catch (error) {
        console.error("❌ Error updating attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//Getting the Leave Requests:
export const getUsersLeaves = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ SQL Query to Fetch Attendance with User Names
        const query = `
            SELECT 
                a.userId,
                l.name AS user_name,
                a.date,
                a.day,
                a.attendanceStatus,
                a.leaveReason,
                a.leaveApprovalStatus
            FROM attendance a
            JOIN login l ON a.userId = l.id
            ORDER BY a.date DESC;
        `;

        const [attendance]: any = await pool.query(query);

        if (attendance.length === 0) {
            res.status(404).json({ message: "No attendance records found" });
            return;
        }

        // ✅ Send attendance records with user names
        res.status(200).json({
            message: "Attendance records fetched successfully",
            attendance: attendance
        });

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const authorizeLeaves = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ Get leave request ID from URL params
        const userId = req.params.id;
        console.log(userId);
        // ✅ Get updated fields from request body
        const { attendanceStatus, date, leaveReason, leaveApprovalStatus } = req.body;

        console.log("Updating Leave Request:", userId, attendanceStatus, date, leaveReason, leaveApprovalStatus);


        // ✅ Check if the leave request exists
        const [existingLeave]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ?",
            [userId]
        );

        if (existingLeave.length === 0) {
            res.status(404).json({ message: "Leave request not found!" });
            return;
        }

        // ✅ SQL Query to Update Leave Request
        const query = `
            UPDATE attendance
            SET attendanceStatus = ?, date = ?, leaveReason = ?, leaveApprovalStatus = ?
            WHERE userId = ?
        `;

        const values = [attendanceStatus, date, leaveReason, leaveApprovalStatus, userId];

        // ✅ Execute the update query
        const [result]: any = await pool.query(query, values);

        // ✅ Send success response
        res.status(200).json({
            message: `Leave request ${userId} has been updated successfully.`,
            updatedLeave: { userId, attendanceStatus, date, leaveReason, leaveApprovalStatus },
            result: result
        });

    } catch (error) {
        console.error("❌ Error updating leave request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
