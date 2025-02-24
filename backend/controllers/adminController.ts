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
            token,
            name: user.name,
            email: user.email,
            role: user.role,
            contact: user.contact,
            cnic: user.cnic,
            date: user.date,
            image: user.image
        });


    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};



// 🛠 Get All Users Function
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = (page - 1) * limit; // ✅ Calculate the offset

        console.log(`Fetching page ${page} with limit ${limit}`);
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

        const [existingUser]:any  = await pool.query(`select * from login where LOWER(email)= LOWER(?)`,
            [email]
         )

         if(existingUser.lenght>0){
            res.send({message:"User already exists"!})
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
            name: name,
            email: email,
            role: role,
            contact: contact,
            address: address,
            cnic: cnic,
            date: date,
            imagePath: image
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
            name: name,
            email: email,
            role: contact,
            contact: contact,
            cnic: cnic,
            address:address 
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
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = (page - 1) * limit; // ✅ Calculate the offset

        console.log(`Fetching page ${page} with limit ${limit}`);
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
            ...customers[0] 
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
            customerId: result.insertId,
            customerName: customerName,
            customerAddress: customerAddress,
            customerContact: customerContact,
            companyName: companyName,
            companyAddress: companyAddress
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
            customerId: result.insertId,
            customerName: customerName,
            customerAddress: customerAddress,
            customerContact: customerContact,
            companyName: companyName,
            companyAddress: companyAddress
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
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = (page - 1) * limit; // ✅ Calculate the offset

        console.log(`Fetching page ${page} with limit ${limit}`);
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
            ...attendance[0]
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

        const [attendance]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ?",
            [userId]
        );

        // Send response with success message
        res.status(201).json({ message: "Attendance recorded successfully",
        ...attendance[0]
     });
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
            date,
            clockIn,
            clockOut,
            day,
            status,
            attendanceStatus,
            leaveReason
        } = req.body;

        // Extract the attendance ID from the URL parameters
        const userId = req.params.id;  // Assumes the ID is passed as a URL parameter

        // SQL query to update attendance data for the given ID
        const query = `
            UPDATE attendance
            SET
                date = ?,
                clockIn = ?,
                clockOut = ?,
                day = ?,
                status = ?,
                attendanceStatus = ?,
                leaveReason = ?
            WHERE userId = ?
        `;

        // Execute the query with the values
        const [result]: any = await pool.query(query, [

            date,
            clockIn,
            clockOut,
            day,
            status,
            attendanceStatus,
            leaveReason,
            userId
        ]);

        const [attendance]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ?",
            [userId]
        );

        // Check if the record was updated
        if (result.affectedRows > 0) {
            res.json({ message: "Attendance updated successfully",
                ...attendance[0]
             })

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

        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = (page - 1) * limit; // ✅ Calculate the offset

        console.log(`Fetching page ${page} with limit ${limit}`);
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
            ...attendance[0]
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

        const [leaveStatus]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ?",
            [userId]
        );

        // ✅ Send success response
        res.status(200).json({
            message: `Leave request ${userId} has been updated successfully.`,
            ...leaveStatus[0]
        });

    } catch (error) {
        console.error("❌ Error updating leave request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const configHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, holiday } = req.body;

        // ✅ Ensure required fields are present
        if (!date || !holiday) {
            res.status(400).json({ message: "Provide both date and holiday name!" });
            return;
        }

        // ✅ SQL Query to Insert Holiday
        const query = `INSERT INTO holidays (date, holiday) VALUES (?, ?)`;
        const values = [date, holiday];

        // ✅ Execute the Query
        const [result]: any = await pool.query(query, values);

        const [holidays]: any = await pool.query("SELECT * FROM holidays");

        // ✅ Send Success Response
        res.status(201).json({
            status: 201,
            message: "Holiday added successfully",
           ...holidays[0]
        });
        

    } catch (error) {
        console.error("❌ Error adding holiday:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const getHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
        const [holidays]: any = await pool.query("SELECT * FROM holidays");

        // ✅ Check if customers exist
        if (holidays.length === 0) {
            res.status(404).json({ status: 404, message: "No holidays found" });
            return;
        }

        // ✅ Send response with customer data
        res.status(200).json({
            status: 200,
            message: "holidays fetched successfully",
            ...holidays[0] 
        });
    } catch (error) {
        console.error("❌ Error fetching holidays:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
}




// 🛠 Withdraw Employee (POST Request)
export const withdrawEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, withdrawDate, withdrawStatus, withdrawReason } = req.body;

        console.log("Withdraw Request Received:", { employeeId, withdrawDate, withdrawStatus, withdrawReason });

        // ✅ Ensure required fields are present
        if (!employeeId || !withdrawDate || !withdrawStatus || !withdrawReason) {
            res.status(400).json({ message: "Provide all required fields!" });
            return;
        }

        // ✅ Insert into `withdrawals` table
        const insertQuery = `
            INSERT INTO withdrawals (employeeId, withdrawDate, withdrawStatus, withdrawReason)
            VALUES (?, ?, ?, ?)
        `;
        const values = [employeeId, withdrawDate, withdrawStatus, withdrawReason];

        // ✅ Execute query
        const [result]: any = await pool.query(insertQuery, values);

        // ✅ Update `status` in `login` table to 'N'
        const updateQuery = `UPDATE login SET status = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [employeeId]);

        // ✅ Send success response
        res.status(201).json({
            status: 201,
            message: "Employee withdrawn successfully",
        });

    } catch (error) {
        console.error("❌ Error withdrawing employee:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const createCatagory = async (req: Request, res: Response): Promise<void> => {
    try {
        const {categoryName}  = req.body;

        const query  = `insert into categories (categoryName) values (?)`;

        const values  = [categoryName]; 

        const [checkCategory]:any  = await pool.query(`select * from categories where LOWER(categoryName)= LOWER(?)`,
            [categoryName]
        );


        if(checkCategory.lenght>0){
            res.status(400).send({message: "Category already exsits!"});
            return;
        }

    const [categoryDate]: any = await pool.query(query, values);    
    
    const [displayCategory]: any = await pool.query(`select * from categories`);

    res.status(200).send({message: "category saved successfully!",
        ...displayCategory[0]
    })
    } catch (error) {
        console.error("❌ Error Adding category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    
}





export const alterCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { categoryName } = req.body;

        // ✅ Ensure required fields are provided
        if (!categoryName) {
            res.status(400).json({ message: "Please provide the category name!" });
            return;
        }

        // ✅ Check if category exists
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM categories WHERE id = ?",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found!" });
            return;
        }

        // ✅ Update category in the database
        const updateQuery = `UPDATE categories SET categoryName = ? WHERE id = ?`;
        const values = [categoryName, id];

        await pool.query(updateQuery, values);

        // ✅ Fetch updated category data
        const [updatedCategory]: any = await pool.query(
            "SELECT * FROM categories WHERE id = ?",
            [id]
        );

        // ✅ Send success response
        res.status(200).json({
            message: "Category updated successfully!",
            ...updatedCategory[0]
        });

    } catch (error) {
        console.error("❌ Error updating category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        // ✅ Check if category exists and is active
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM categories WHERE id = ? AND categoryStatus = 'Y'",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found or already disabled!" });
            return;
        }


        // ✅ Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE categories SET categoryStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        // ✅ Send success response
        res.status(200).json({
            message: "Category successfully disabled (soft deleted)!"
        });

    } catch (error) {
        console.error("❌ Error disabling category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// ADD PROJECT:
export const addProject = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ Fetch all available categories before project creation
        const [categories]: any = await pool.query(`SELECT categoryName FROM categories where categoryStatus = ?`, 'Y');

        // ✅ Extract project details from request body
        const { projectName, projectCategory, startDate, endDate } = req.body;

        // ✅ Ensure required fields are present
        if (!projectName || !projectCategory || !startDate || !endDate) {
            res.status(400).json({ message: "Please fill all the fields!", categories });
            return;
        }

        // ✅ Extract category names from DB for comparison
        const categoryList = categories.map((cat: any) => cat.categoryName.toLowerCase());

        // ✅ Check if the selected category exists in the database
        if (!categoryList.includes(projectCategory.toLowerCase())) {
            res.status(400).json({ message: "Invalid category selected!", categories });
            return;
        }

        // ✅ Check if project already exists (Case-insensitive check)
        const [existingProject]: any = await pool.query(
            "SELECT * FROM projects WHERE LOWER(projectName) = LOWER(?)",
            [projectName]
        );

        if (existingProject.length > 0) {
            res.status(400).json({ message: "Project already exists!", categories });
            return;
        }

        // ✅ Insert new project
        const query = `INSERT INTO projects (projectName, projectCategory, startDate, endDate) VALUES (?, ?, ?, ?)`;
        const values = [projectName, projectCategory, startDate, endDate];

        const [result]: any = await pool.query(query, values);

        // ✅ Fetch all projects after insertion
        const [getProjects]: any = await pool.query("SELECT * FROM projects ORDER BY id DESC");

        // ✅ Send success response with available categories and projects
        res.status(200).json({
            message: "Project added successfully!",
            ...getProjects[0]
        });

    } catch (error) {
        console.error("❌ Error Adding Project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const alterProjectInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { projectName, projectCategory, startDate, endDate } = req.body;

        // ✅ Ensure required fields are provided
        if (!projectName || !projectCategory || !startDate || !endDate) {
            res.status(400).json({ message: "Please provide all required fields!" });
            return;
        }

        // ✅ Check if the project exists
        const [existingProject]: any = await pool.query(
            "SELECT * FROM projects WHERE id = ?",
            [id]
        );

        if (existingProject.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }

        // ✅ Update project details
        const updateQuery = `
            UPDATE projects 
            SET projectName = ?, projectCategory = ?, startDate = ?, endDate = ?
            WHERE id = ?
        `;
        const values = [projectName, projectCategory, startDate, endDate, id];

        await pool.query(updateQuery, values);

        // ✅ Fetch updated project data
        const [updatedProject]: any = await pool.query(
            "SELECT * FROM projects WHERE id = ?",
            [id]
        );

        // ✅ Send success response
        res.status(200).json({
            message: "Project updated successfully!",
            ...updatedProject[0]
        });

    } catch (error) {
        console.error("❌ Error updating project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        // ✅ Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE projects SET projectStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        // ✅ Send success response
        res.status(200).json({
            message: "Project successfully disabled Project!"
        });

    } catch (error) {
        console.error("❌ Error disabling Project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};