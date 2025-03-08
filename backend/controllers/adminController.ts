import { Request, Response } from "express";
import pool from "../database/db"; 
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

  

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        console.log("Email:", email, "Password:", password);

        // ✅ Fetch user by email
        const [users]: any = await pool.query("SELECT * FROM login WHERE email = ?", [email]);

        if (users.length === 0) {
            res.status(400).json({ status: 400, message: "Invalid Username or Password" });
            return;
        }

        const user = users[0];
        let storedPassword = user.password;

        // ✅ Check if the stored password is already hashed
        const isHashed = storedPassword.startsWith("$2b$"); // bcrypt-hashed passwords start with "$2b$"

        if (!isHashed) {
            console.log("⚠️ Detected unencrypted password. Hashing it now...");
            const hashedPassword = await bcrypt.hash(storedPassword, 10);

            // ✅ Update database with the newly hashed password
            await pool.query("UPDATE login SET password = ? WHERE email = ?", [hashedPassword, email]);
            console.log("✅ Password successfully hashed and updated.");

            storedPassword = hashedPassword; // Use the new hashed password for authentication
        }

        // ✅ Compare hashed password using bcrypt
        const isMatch = await bcrypt.compare(password, storedPassword);
        if (!isMatch) {
            res.status(400).json({ status: 400, message: "Invalid Username or Password" });
            return;
        }

        // ✅ Generate JWT token with email & role (NO PASSWORD)
        const token = jwt.sign(
            { email: user.email, role: user.role },
            "your_secret_key",
            { expiresIn: "60m" }
        );

        // ✅ Send success response (excluding password)
        res.json({
            status: 200,
            message: "Login Successful",
            token,
            id: user.id,
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



export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10); // Convert entry to a number

        // ✅ Default to 10 entries if `entry` is invalid or not provided
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;

        // ✅ Fetch users with a limit based on `entry`
        const [rows]: any = await pool.query("SELECT * FROM login WHERE loginStatus = 'Y' LIMIT ?", [limit]);

        res.json( rows );

    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ error: "Database query failed" });
    }
};




export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Get user ID from URL params
        const { password } = req.body; // Get new password from request body

        // ✅ Hash the new password
        const newHashedPassword = await bcrypt.hash(password, 10);

        // ✅ Update the password in the database
        const updateQuery = `UPDATE login SET password = ? WHERE id = ?`;
        await pool.query(updateQuery, [newHashedPassword, id]);

        res.status(200).json({ message: "Password updated successfully!" });

    } catch (error) {
        console.error("❌ Error changing password:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const getuploadfile = async (req: Request, res: Response): Promise<void> => {
    res.sendFile(path.join(__dirname, 'fileupload.html'));
};



export const uploadedFile = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Uploaded File:", req.file);  // Log the uploaded file

        if (!req.file) {
            res.status(400).json({ message: "No file uploaded!" });
            return;
        }

        const imagePath = req.file ? req.file.path.replace(/\\/g, "/") : null; // ✅ Store uploaded file path

        res.status(200).json({ message: "Upload successful!", imagePath });
    } catch (error) {
        console.error("❌ Error uploading file:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const addUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, contact, cnic, address, date, role } = req.body;

        console.log("Uploaded File:", req.file);  // Log the uploaded file

        if (!req.file) {
            res.status(400).json({ message: "No file uploaded!" });
            return;
        }

        const imagePath = req.file ? req.file.path.replace(/\\/g, "/") : null; // ✅ Store uploaded file path

        res.status(200).json({ message: "Upload successful!", imagePath });

        // ✅ Ensure required fields are present
        if (!name || !email || !password || !cnic || !role) {
             res.status(400).json({ status: 400, message: "Missing required fields" });
        }

        // ✅ Check if user already exists
        const [existingUser]: any = await pool.query("SELECT * FROM login WHERE LOWER(email) = LOWER(?)", [email]);
        if (existingUser.length > 0) {
             res.status(400).json({ message: "User already exists!" });
        }

        // ✅ Hash the password before storing it
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // ✅ Insert user into MySQL database with hashed password & image path
        const query = `
            INSERT INTO login (name, email, password, contact, cnic, address, date, role, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, email, hashedPassword, contact, cnic, address, date, role, imagePath];

        const [result]: any = await pool.query(query, values);

        // ✅ Send success response
         res.status(201).json({
            status: 201,
            message: "User added successfully",
            userId: result.insertId,
            name,
            email,
            role,
            contact,
            address,
            cnic,
            date,
            imagePath
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
            role: role,
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

        // ✅ Update user status to 'N' instead of deleting
        const query: string = `UPDATE login SET loginStatus = 'N' WHERE id = ?`;
        console.log(`Updating user ${id} status to 'N'`);

        // ✅ Execute the query
        const [result]: any = await pool.query(query, [id]);

        const [getActiveUsers]: any = await pool.query(`select * from login where loginStatus ='Y'`);

        if (result.affectedRows > 0) {
            res.json({ message: "User Deleted success!!",
                ...getActiveUsers
             });
        } else {
            res.status(404).json({ message: "User not found" });
        }

    } catch (error) {
        console.error("❌ Error updating user status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// 🛠 Get All Customers Function
export const getAllCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const [customers]: any = await pool.query("SELECT * FROM customers where customerStatus = 'Y' LIMIT ?", [limit]);

        // ✅ Check if customers exist
        if (customers.length === 0) {
            res.status(404).json({ status: 404, message: "No customers found" });
            return;
        }

        

        res.status(200).json(["customers fetched successfully!", ...customers]);


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
        const { id } = req.params;  // Get customer ID from URL

        // ✅ Update customer status to 'N' instead of deleting
        const query: string = `UPDATE customers SET customerStatus = 'N' WHERE id = ?`;
        console.log(`Updating customer ${id} status to 'N'`);

        // ✅ Execute the query
        const [result]: any = await pool.query(query, [id]);

        const [getActiveCustomers]: any = await pool.query(`select * from customers where customerStatus ='Y'`)

        if (result.affectedRows > 0) {
            res.json({ message: "Customer deleted success!",
                ...getActiveCustomers
             });
        } else {
            res.status(404).json({ message: "Customer not found" });
        }

    } catch (error) {
        console.error("❌ Error updating customer status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



// getAllAttendance
export const getAttendance = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = req.params.id;
      // ✅ Fetch the latest attendance record for each user
      const [attendance]: any = await pool.query(
        `SELECT 
                  userId, 
                  CONVERT_TZ(date, '+00:00', @@session.time_zone) AS date, 
                  clockIn, 
                  clockOut, 
                  day, 
                  status, 
                  attendanceStatus, 
                  leaveReason, 
                  leaveApprovalStatus, 
                  workingHours
               FROM attendance 
               WHERE status = 'Y' AND userId = ?
               ORDER BY date DESC`, [id]
      );
  
      if (attendance.length === 0) {
        res
          .status(404)
          .json({ status: 404, message: "No attendance records found" });
        return;
      }
  
      // ✅ Send only the latest attendance records per user
      res.status(200).json({
        message: "Latest attendance records fetched successfully",
        ...attendance[0],
      });
    } catch (error) {
      console.error("❌ Error fetching attendance:", error);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  };
  
  export const getAllAttendances = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // ✅ Fetch the latest attendance record for each user
      const [attendance]: any = await pool.query(
        `SELECT 
                  userId, 
                  CONVERT_TZ(date, '+00:00', @@session.time_zone) AS date, 
                  clockIn, 
                  clockOut, 
                  day, 
                  status, 
                  attendanceStatus, 
                  leaveReason, 
                  leaveApprovalStatus, 
                  workingHours
               FROM attendance 
               WHERE status = 'Y' 
               ORDER BY date DESC`
      );
  
      if (attendance.length === 0) {
        res
          .status(404)
          .json({ status: 404, message: "No attendance records found" });
        return;
      }
  
      // ✅ Send only the latest attendance records per user
      res.status(200).json([
       "Latest attendance records fetched successfully",
        ...attendance,
      ]);
    } catch (error) {
      console.error("❌ Error fetching attendance:", error);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  };


// getTimings
export const getTimings = async (req: Request, res: Response): Promise<void> => {
   
 }



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




// markAttendance
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;
        console.log("User ID:", userId);

        // ✅ Check if the user has already clocked in today
        const [existingAttendance]: any = await pool.query(
            "SELECT userId, clockIn, clockOut FROM attendance WHERE userId = ? AND date = CURDATE()",
            [userId]
        );

        // ✅ If user has NOT clocked in today, insert new clock-in record
        if (existingAttendance.length === 0) {
            const query = `
                INSERT INTO attendance (
                    userId, clockIn, clockOut, date, day, attendanceStatus, workingHours
                ) VALUES (?, CURRENT_TIMESTAMP(), NULL, CURDATE(), DAYNAME(CURDATE()), 'Present', NULL)
            `;
            await pool.query(query, [userId]);

            res.status(201).json({
                message: "Clock-in recorded successfully",
            });
            return; // Stop further execution to avoid multiple responses
        }

        // ✅ Fetch clock-in details to check clock-in and clock-out values
        const [checkAttendance]: any = await pool.query(
            "SELECT clockIn, clockOut FROM attendance WHERE userId = ? AND date = CURDATE()",
            [userId]
        );

        console.log("Fetched Attendance:", checkAttendance);

        if (!checkAttendance[0] || !checkAttendance[0].clockIn) {
            res.status(400).json({
                message: "Cannot calculate working hours, clockIn time is missing."
            });
            return;
        }

        // ✅ If user has already clocked out, prevent duplicate clock-out
        if (checkAttendance[0].clockOut !== null) {
            res.status(400).json({
                message: "You have already clocked out today!"
            });
            return;
        }

        // ✅ Now, update clockOut since user is actually clocking out
        await pool.query(
            `UPDATE attendance 
             SET clockOut = CURRENT_TIMESTAMP()
             WHERE userId = ? AND date = CURDATE()`,
            [userId]
        );

        // ✅ Fetch updated clock-in & clock-out time to calculate working hours
        const [updatedAttendance]: any = await pool.query(
            "SELECT clockIn, clockOut FROM attendance WHERE userId = ? AND date = CURDATE()",
            [userId]
        );

        console.log("Updated Attendance After Clock-Out:", updatedAttendance);

        if (!updatedAttendance[0] || !updatedAttendance[0].clockOut) {
            res.status(400).json({
                message: "Clock-out time update failed."
            });
            return;
        }

        // ✅ Now, Calculate `workingHours` Correctly After `clockOut` Is Set
        const [timeDiffResult]: any = await pool.query(
            `SELECT 
                LPAD(TIMESTAMPDIFF(HOUR, clockIn, clockOut), 2, '0') AS Hours,
                LPAD(TIMESTAMPDIFF(MINUTE, clockIn, clockOut) % 60, 2, '0') AS Minutes
            FROM attendance WHERE userId = ? AND date = CURDATE()`,
            [userId]
        );

        console.log("Working Hours Calculation:", timeDiffResult);

        const { Hours, Minutes } = timeDiffResult[0] || { Hours: "0", Minutes: "00" };

// ✅ Format Hours & Minutes
        let formattedWorkingHours = "";
        if (Hours !== "00" && Hours !== "0") {
            formattedWorkingHours += `${Hours} Hour${Hours !== "1" ? "s" : ""} `;
        }
        if (Minutes !== "00") {
    formattedWorkingHours += `${Minutes} Minute${Minutes !== "1" ? "s" : ""}`;
                }
        if (!formattedWorkingHours) {
    formattedWorkingHours = "0 Minutes"; // Default if both are 0
}

console.log(`Final Working Hours: ${formattedWorkingHours}`);

// ✅ Finally, Update `workingHours` field
    await pool.query(
    `UPDATE attendance 
     SET workingHours = ?
     WHERE userId = ? AND date = CURDATE()`,
    [formattedWorkingHours.trim(), userId] // Trim to remove extra spaces
);

        // ✅ Fetch final attendance record
        const [finalAttendance]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ? AND date = CURDATE()",
            [userId]
        );

        res.status(200).json({
            message: "Clock-out recorded successfully",
            ...finalAttendance[0]
        });

    } catch (error) {
        console.error("❌ Error marking attendance:", error);
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
            attendanceStatus,
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
                attendanceStatus = ?
            WHERE userId = ?
        `;

        // Execute the query with the values
        const [result]: any = await pool.query(query, [

            date,
            clockIn,
            clockOut,
            attendanceStatus,
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
            WHERE userId = ?
        `;

        // Execute the query
        const [result]: any = await pool.query(query, [id]);

        const [getActiveUsers]:any = await pool.query(`select * from attendance where attendanceStatus = 'Y'`);
        // Check if the record was updated
        if (result.affectedRows > 0) {
            res.json({ message: "Attendance status updated successfully to 'N' and other fields nullified.",
                ...getActiveUsers
             });
        } else {
            res.status(404).json({ message: "Attendance record not found" });
        }

    } catch (error) {
        console.error("❌ Error updating attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const attendanceSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        // ✅ Optimized single query to fetch all attendance counts
        const [summary]: any = await pool.query(
            `SELECT 
                COUNT(CASE WHEN attendanceStatus != 'Holiday' THEN 1 END) AS WorkingDays,
                COUNT(CASE WHEN attendanceStatus = 'Present' THEN 1 END) AS Presents,
                COUNT(CASE WHEN attendanceStatus = 'Absent' THEN 1 END) AS Absents,
                COUNT(CASE WHEN attendanceStatus = 'Leave' THEN 1 END) AS Leaves
            FROM attendance
            WHERE status = 'Y' AND userId = ?`, 
            [id]
        );

        // ✅ Send response with the fetched summary
        res.status(200).json(summary[0]);

    } catch (error) {
        console.error("❌ Error fetching attendance summary:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




//Getting the Leave Requests:
export const getUsersLeaves = async (req: Request, res: Response): Promise<void> => {
    try {

        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
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
            ORDER BY a.date DESC LIMIT ?
        `;

            const values = [limit];
        const [attendance]: any = await pool.query(query, values);

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
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const [holidays]: any = await pool.query("SELECT * FROM holidays where holidayStatus= 'Y' LIMIT ? ", [limit]);

        // ✅ Check if customers exist
        if (holidays.length === 0) {
            res.status(404).json({ status: 404, message: "No holidays found" });
            return;
        }

        // ✅ Send response with customer data
        res.status(200).json({
            status: 200,
            message: "holidays fetched successfully",
            ...holidays
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

// getCategory
export const getCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query =   `select * from categories where categoryStatus = 'Y' LIMIT ?`;
        const values = [limit];
        const [result]: any = await pool.query(query, values);
        res.status(200).send({messsage:"categories Fetched Successfully!",
            ...result
        }
        )
    } catch (error) {
        console.error("❌ Error fetching categories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




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



// getProjects
export const getProjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query =   `select * from projects where projectStatus = 'Y' LIMIT ?`;
        const values = [limit];
        const [result]: any = await pool.query(query, values);
        res.status(200).send({messsage:"Projects Fetched Successfully!",
            ...result
        }
        )
    } catch (error) {
        console.error("❌ Error fetching projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


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




// assignProject
export const getAssignProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query = `select * from assignedprojects where assignStatus = 'Y' LIMIT ?`;
        const values = [limit];
        const [result]:any = await pool.query(query ,values);

        res.status(200).send({message: "Assigned Projects Fetched Success!",
            ...result
            })
    } catch (error) {
        console.error("❌ Error Fetching Assigned Projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const assignProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, projectName } = req.body;
        console.log(name, projectName);

        // ✅ Fetch User ID from login table
        const [user]: any = await pool.query(
            "SELECT id FROM login WHERE name = ?",
            [name]
        );

        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }
        const userID = user[0].id;

        // ✅ Fetch Project ID from projects table
        const [project]: any = await pool.query(
            "SELECT id FROM projects WHERE projectName = ?",
            [projectName]
        );

        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }
        const projectID = project[0].id;

        console.log("User ID:", userID, "Project ID:", projectID);

        // ✅ Insert into assignedprojects (Fix: Removed extra columns)
        const query = `
            INSERT INTO assignedprojects (employeeId, projectId, date, assignStatus)
            VALUES (?, ?, CURDATE(), 'Y');
        `;
        const values = [userID, projectID];

        await pool.query(query, values);

        // ✅ Fetch assigned project details (Now fetching names properly)
        const [assignedProject]: any = await pool.query(`
            SELECT ap.id, l.name AS employeeName, p.projectName, ap.date, ap.assignStatus
            FROM assignedprojects ap
            JOIN login l ON ap.employeeId = l.id
            JOIN projects p ON ap.projectId = p.id
            WHERE ap.employeeId = ? AND ap.projectId = ?;
        `, [userID, projectID]);

        // ✅ Send success response
        res.status(201).json({
            message: "Project assigned successfully!",
            ...assignedProject[0]
        });

    } catch (error) {
        console.error("❌ Error Assigning Project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const alterAssignProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  // ✅ Assignment ID from URL
        const { name, projectName } = req.body; // ✅ New employee & project names

        // ✅ Get Employee ID from login table
        const [user]: any = await pool.query("SELECT id FROM login WHERE name = ?", [name]);
        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }
        const newEmployeeId = user[0].id;

        // ✅ Get Project ID from projects table
        const [project]: any = await pool.query("SELECT id FROM projects WHERE projectName = ?", [projectName]);
        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }
        const newProjectId = project[0].id;

        console.log("Updating Assigned Project ID:", id, "New Employee ID:", newEmployeeId, "New Project ID:", newProjectId);

        // ✅ Update the assigned project
        const query = `
            UPDATE assignedprojects 
            SET employeeId = ?, projectId = ?, date = CURDATE()
            WHERE id = ?;
        `;
        const values = [newEmployeeId, newProjectId, id];

        const [result]: any = await pool.query(query, values);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "Assignment not found or no changes made!" });
            return;
        }

        // ✅ Fetch updated assignment details
        const [updatedAssignment]: any = await pool.query(`
            SELECT ap.id, l.name AS employeeName, p.projectName, ap.date, ap.assignStatus
            FROM assignedprojects ap
            JOIN login l ON ap.employeeId = l.id
            JOIN projects p ON ap.projectId = p.id
            WHERE ap.id = ?;
        `, [id]);

        // ✅ Send success response
        res.status(200).json({
            message: "Project assignment updated successfully!",
            ...updatedAssignment[0]
        });

    } catch (error) {
        console.error("❌ Error Updating Assigned Project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // ✅ Get assignment ID from URL

        // ✅ Update assignStatus to 'N' (Soft Delete)
        const query = `
            UPDATE assignedprojects 
            SET assignStatus = 'N' 
            WHERE id = ?;
        `;
        const [result]: any = await pool.query(query, [id]);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "Assignment not found or already deleted!" });
            return;
        }

        // ✅ Fetch updated project list (Only active assignments)
        const [activeAssignments]: any = await pool.query(`
            SELECT ap.id, l.name AS employeeName, p.projectName, ap.date, ap.assignStatus
            FROM assignedprojects ap
            JOIN login l ON ap.employeeId = l.id
            JOIN projects p ON ap.projectId = p.id
            WHERE ap.assignStatus = 'Y';
        `);

        // ✅ Send success response with remaining active projects
        res.status(200).json({
            message: "Project assignment deleted successfully!",
            ...activeAssignments
        });

    } catch (error) {
        console.error("❌ Error Deleting Assignment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// getTodo
export const getTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const [result]: any = await pool.query(`select * from todo where todoStatus = 'Y' LIMIT ?`, [limit]);
        res.status(200).send({message:"todo fetched successfully!",
            ...result
        })
    } catch (error) {
        console.error("❌ Error fetching todo!:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }    
}




// createTodo

export const createTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const {name, task, note, startDate, endDate, deadline} = req.body;
        const [user]: any = await pool.query(
            "SELECT id FROM login WHERE name = ?",
            [name]
        );

        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }
        const userID = user[0].id;

        const query  = `insert into todo (employeeId, task, note, startDate, endDate, deadline) 
        values (?, ?, ?, ?, ?, ?)`;

        const values = [userID, task, note, startDate, endDate, deadline];

        const [result]:any = await pool.query(query, values);

        const [createdTodo]:any = await pool.query(`select t.id, l.name, t.task, t.note, t.startDate, t.endDate, t.endDate, t.deadline
        from todo t 
        join login l on 
        l.id = t.employeeId;`);
        res.status(200).send({message:"todo added successfully!",
            ...createdTodo[0]
        })
    } catch (error) {
        console.error("❌ Error creating todo!:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const alterTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  // ✅ Get Todo ID from URL
        const { name, task, note, startDate, endDate, deadline } = req.body;

        // ✅ Get Employee ID from login table
        const [user]: any = await pool.query("SELECT id FROM login WHERE name = ?", [name]);
        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }
        const employeeId = user[0].id;

        console.log("Updating Todo ID:", id, "Employee ID:", employeeId);

        // ✅ Check if Todo exists
        const [existingTodo]: any = await pool.query("SELECT * FROM todo WHERE id = ? AND employeeId = ?", [id, employeeId]);
        if (existingTodo.length === 0) {
            res.status(404).json({ message: "Todo not found or unauthorized access!" });
            return;
        }

        // ✅ Update the Todo
        const query = `
            UPDATE todo 
            SET task = ?, note = ?, startDate = ?, endDate = ?, deadline = ?
            WHERE id = ? AND employeeId = ?;
        `;
        const values = [task, note, startDate, endDate, deadline, id, employeeId];

        const [result]: any = await pool.query(query, values);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "No changes made!" });
            return;
        }

        // ✅ Fetch updated todo details
        const [updatedTodo]: any = await pool.query(`
            SELECT t.id, l.name AS employeeName, t.task, t.note, t.startDate, t.endDate, t.deadline
            FROM todo t 
            JOIN login l ON l.id = t.employeeId
            WHERE t.id = ?;
        `, [id]);

        // ✅ Send success response
        res.status(200).json({
            message: "Todo updated successfully!",
            updatedTodo: updatedTodo[0]
        });

    } catch (error) {
        console.error("❌ Error Updating Todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const deleteTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ✅ Check if the todo exists
        const [todo]: any = await pool.query(
            "SELECT * FROM todo WHERE id = ?",
            [id]
        );

        if (todo.length === 0) {
            res.status(404).json({ message: "Todo not found!" });
            return;
        }

        // ✅ Soft delete: Update `todoStatus` to 'N'
        const query = `UPDATE todo SET todoStatus = 'N' WHERE id = ?`;
        await pool.query(query, [id]);

        res.status(200).json({ message: "Todo deleted successfully!" });

    } catch (error) {
        console.error("❌ Error deleting todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



// getProgress
export const getProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query  = `select * from progress where progressStatus= 'Y' LIMIT ?`;
        const [result]:any = await pool.query(query, [limit]);

        if(result.length ===0){
            res.send({message:"no users found!"})
            return;
        }

        res.status(200).send({message:"progress fetched successfully!",
            ...result[0]
        })
    } catch (error) {
        console.error("❌ Error fetching progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }

}



// addProgress
export const addProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const {name, projectName, date, note} = req.body;

    const [user]:any = await pool.query(`select id from login where name = ?`, [name]);
    if (user.length === 0) {
        res.status(404).json({ message: "User not found!" });
        return;
    }
    const userID = user[0].id;

    const [project]:any = await pool.query(`select id from projects where projectName = ?`, projectName);
    if (project.length === 0) {
        res.status(404).json({ message: "User not found!" });
        return;
    }
    const projectID = project[0].id;

    const query = `insert into progress (employeeId, projectId, date, note) values (?, ?, ?, ?)`
    const values = [userID, projectID, date, note];
    const [result]:any = await pool.query(query, values);

    const [seeProgress]:any = await pool.query(`select prg.employeeId, prg.projectId, l.name, pro.projectName, prg.note, prg.date
    from progress prg
    join login l on 
    l.id = prg.employeeId
    join projects pro on
    prg.projectId = pro.id;`);

    res.status(200).send({message:"Progress added successfully!",
        ...seeProgress[0]
    })

    } catch (error) {
        console.error("❌ Error deleting todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



// alterProgress (Update Progress by ID)
export const alterProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { name, projectName, date, note } = req.body;

        const [user]:any = await pool.query(`select id from login where name = ?`, [name]);
        if (user.length === 0) {
        res.status(404).json({ message: "User not found!" });
        return;
        }
        const userID = user[0].id;

        const [project]:any = await pool.query(`select id from projects where projectName = ?`, projectName);
        if (project.length === 0) {
        res.status(404).json({ message: "User not found!" });
        return;
        }
        const projectID = project[0].id;

        // Check if progress entry exists
        const [progress]: any = await pool.query(`SELECT * FROM progress WHERE id = ?`, [id]);
        if (progress.length === 0) {
            res.status(404).json({ message: "Progress entry not found!" });
            return;
        }

        // Update the progress entry
        const query = `UPDATE progress SET employeeId = ?, projectId = ?, date = ?, note = ? WHERE id = ?`;
        const values = [userID, projectID, date, note, id];
        await pool.query(query, values);

        // Fetch updated progress
        const [updatedProgress]: any = await pool.query(
            `SELECT prg.id, prg.employeeId, prg.projectId, l.name, pro.projectName, prg.note, prg.date
             FROM progress prg
             JOIN login l ON l.id = prg.employeeId
             JOIN projects pro ON prg.projectId = pro.id
             WHERE prg.id = ?`,
            [id]
        );

        res.status(200).json({
            message: "Progress updated successfully!",
            ...updatedProgress[0]
        });

    } catch (error) {
        console.error("❌ Error updating progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//deleteProgress
export const deleteProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ✅ Check if the todo exists
        const [progress]: any = await pool.query(
            "SELECT * FROM progress WHERE id = ?",
            [id]
        );

        if (progress.length === 0) {
            res.status(404).json({ message: "progress not found!" });
            return;
        }

        // ✅ Soft delete: Update `todoStatus` to 'N'
        const query = `UPDATE progress SET progressStatus = 'N' WHERE id = ?`;
        await pool.query(query, [id]);

        const [getProgress]:any = `select prg.employeeId, prg.projectId, l.name, pro.projectName, prg.note, prg.date
        from progress prg
        join login l on 
        l.id = prg.employeeId
        join projects pro on
        prg.projectId = pro.id`;
        res.status(200).json({ message: "progress deleted successfully!",
            ...getProgress[0]
         });

    } catch (error) {
        console.error("❌ Error deleting progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }  
}




// getSales
export const getSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query  = `select * from sales where salesStatus = 'Y' LIMIT ?`;
        const [result]:any = await pool.query(query, [limit]);

        if(result.length ===0){
            res.send({message:"no sales found!"})
            return;
        }

        res.status(200).send({message:"sales fetched successfully!",
            ...result
        })
    } catch (error) {
        console.error("❌ Error fetching sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



export const addSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const {customerName, projectName} = req.body;
    const [customer]:any  = await pool.query (`select id from customers where customerName = ?`, [customerName]);
    if(customer.lenght===0){
        res.send("customer not found!");
        return;
    }
    const customerId  = customer[0].id;

    const [project]:any  = await pool.query (`select id from projects where projectName = ?`, [projectName]);
    if(project.lenght===0){
        res.send("customer not found!");
        return;
    }
    const projectId  = project[0].id;

    const query = `insert into sales (customerId, projectId) values (?, ?)`;
    const values = [customerId, projectId];

    const [result]:any = await pool.query(query, values);

    const [getresult]: any = await pool.query(`SELECT 
                s.id,
                s.customerId,
                c.customerName,
                s.projectId,
                p.projectName,
                s.salesStatus
            FROM sales s
            JOIN customers c ON s.customerId = c.id
            JOIN projects p ON s.projectId = p.id;
            `)

    res.status(200).send({message: "Sales report added successfully!",
        ...getresult[0]
    })
    } catch (error) {
        console.error("❌ Error adding sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const alterSalesData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Sales ID from URL parameter
        const { customerName, projectName } = req.body;

        // ✅ Fetch customer ID
        const [customer]: any = await pool.query(`SELECT id FROM customers WHERE customerName = ?`, [customerName]);
        if (customer.length === 0) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }
        const customerId = customer[0].id;

        // ✅ Fetch project ID
        const [project]: any = await pool.query(`SELECT id FROM projects WHERE projectName = ?`, [projectName]);
        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }
        const projectId = project[0].id;

        // ✅ Check if sales record exists
        const [existingSale]: any = await pool.query(`SELECT * FROM sales WHERE id = ?`, [id]);

        let result;
        if (existingSale.length > 0) {
            // ✅ If sale exists, update it
            const updateQuery = `UPDATE sales SET customerId = ?, projectId = ? WHERE id = ?`;
            result = await pool.query(updateQuery, [customerId, projectId, id]);
        }
        // } else {
        //     // ✅ If sale doesn't exist, insert new record
        //     const insertQuery = `INSERT INTO sales (customerId, projectId) VALUES (?, ?)`;
        //     result = await pool.query(insertQuery, [customerId, projectId]);
        // }

        // ✅ Fetch updated sales record
        const [getResult]: any = await pool.query(`
            SELECT 
                s.id,
                s.customerId,
                c.customerName,
                s.projectId,
                p.projectName,
                s.salesStatus
            FROM sales s
            JOIN customers c ON s.customerId = c.id
            JOIN projects p ON s.projectId = p.id
            WHERE s.id = ?`, [id]);

        res.status(200).json({
            message: existingSale.length > 0 ? "Sales record updated successfully!" : "Sales record added successfully!",
            ...getResult[0]
        });

    } catch (error) {
        console.error("❌ Error adding/updating sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const deleteSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ✅ Check if the todo exists
        const [sale]: any = await pool.query(
            "SELECT * FROM sales WHERE id = ?",
            [id]
        );

        if (sale.length === 0) {
            res.status(404).json({ message: "progress not found!" });
            return;
        }

        // ✅ Soft delete: Update `todoStatus` to 'N'
        const query = `UPDATE sales SET salesStatus = 'N' WHERE id = ?`;
        await pool.query(query, [id]);

        const [getProgress]:any = `SELECT 
                s.id,
                s.customerId,
                c.customerName,
                s.projectId,
                p.projectName,
                s.salesStatus
                FROM sales s
                JOIN customers c ON s.customerId = c.id
                JOIN projects p ON s.projectId = p.id;`;
        res.status(200).json({ message: "sale deleted successfully!",
            ...getProgress[0]
         });

    } catch (error) {
        console.error("❌ Error deleting progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }  
}




// getPayments
export const getPayments = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query  = `select * from payments where paymentStatus = 'Y' LIMIT ?`;
        const [result]:any = await pool.query(query, [limit]);

        if(result.length ===0){
            res.send({message:"no payments found!"})
            return;
        }

        res.status(200).send({message:"payments fetched successfully!",
            ...result
        })
    } catch (error) {
        console.error("❌ Error fetching payments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



export const addPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const {paymentMethod, customerName, description, amount, date} = req.body;  
        const [customer]:any = await pool.query(`select id from customers where customerName= ?`, [customerName]);
        if(customer.lenght===0){
            res.send({message: "customer not found!"})
            return;
        }
        const customerId = customer[0].id;

        const query = `insert into payments (paymentMethod, customerId, description, amount,  date) values (?, ?, ?, ?, ?)`;
        const values = [paymentMethod, customerId, description, amount, date];

        const [result]:any = await pool.query(query, values);
        const [addedPayments]:any = await pool.query(`SELECT 
                p.paymentMethod, 
                p.customerId, 
                c.customerName, 
                p.description, 
                p.amount, 
                p.date
            FROM payments p
            JOIN customers c ON p.customerId = c.id;
            `);
        res.status(200).send({message:"Payment information added successfully!",
            ...addedPayments
        })
    } catch (error) {
        console.error("❌ Error adding payment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const alterPayments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Payment ID from URL parameters
        const { paymentMethod, customerName, description, amount, date } = req.body; // New data

        // ✅ Check if the payment record exists
        const [existingPayment]: any = await pool.query(`SELECT * FROM payments WHERE id = ?`, [id]);

        if (existingPayment.length === 0) {
            res.status(404).json({ message: "Payment record not found!" });
            return;
        }

        // ✅ Fetch customer ID from customerName
        const [customer]: any = await pool.query(`SELECT id FROM customers WHERE customerName = ?`, [customerName]);

        if (customer.length === 0) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }

        const customerId = customer[0].id;

        // ✅ Update payment details
        const updateQuery = `
            UPDATE payments 
            SET paymentMethod = ?, customerId = ?, description = ?, amount = ?, date = ?
            WHERE id = ?
        `;
        const values = [paymentMethod, customerId, description, amount, date, id];

        await pool.query(updateQuery, values);

        // ✅ Fetch the updated payment record
        const [updatedPayment]: any = await pool.query(`
            SELECT 
                p.id, 
                p.paymentMethod, 
                p.customerId, 
                c.customerName, 
                p.description, 
                p.amount, 
                p.date
                FROM payments p
            JOIN customers c ON p.customerId = c.id
            WHERE p.id = ?`, [id]);

        res.status(200).json({
            message: "Payment updated successfully!",
            ...updatedPayment[0]
        });

    } catch (error) {
        console.error("❌ Error updating payment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const deletePayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ✅ Check if the todo exists
        const [sale]: any = await pool.query(
            "SELECT * FROM payments WHERE id = ?",
            [id]
        );

        if (sale.length === 0) {
            res.status(404).json({ message: "payments not found!" });
            return;
        }

        // ✅ Soft delete: Update `todoStatus` to 'N'
        const query = `UPDATE payments SET paymentStatus = 'N' WHERE id = ?`;
        await pool.query(query, [id]);

        const [getProgress]:any = `SELECT     p.id,     p.paymentMethod,     p.customerId,     c.customerName,     p.description,     p.amount,     p.date,     p.paymentStatus
            FROM payments p
            JOIN customers c ON p.customerId = c.id;
            `;
        res.status(200).json({ message: "sale deleted successfully!",
            ...getProgress[0]
         });

    } catch (error) {
        console.error("❌ Error deleting progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }  
}





export const addQuotationDetail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { description, QTY, UnitPrice } = req.body;

        if (!description || !QTY || !UnitPrice) {
            res.status(400).json({ message: "Provide all the fields!" });
            return;
        }

        // ✅ Bypass TypeScript's strict session type checking
        const sessionData: any = req.session;

        if (!sessionData.cart) {
            sessionData.cart = [];
        }

        sessionData.cart.push({ description, QTY, UnitPrice });

        res.status(200).json({ message: "Product added to cart!", cart: sessionData.cart });
    } catch (error) {
        console.error("❌ Error adding to cart:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};



export const addQuotation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerName, date, taxRate, shippingHandling } = req.body;
        const sessionData: any = req.session;

        if (!sessionData.cart || sessionData.cart.length === 0) {
            res.status(400).json({ message: "Cart is empty! Add products first." });
            return;
        }

        // ✅ Step 1: Fetch Latest `invoiceno` from `invoiceno` Table
        const [latestInvoice]: any = await pool.query("SELECT id FROM invoiceno ORDER BY id DESC LIMIT 1");
        let invoiceno = latestInvoice.length > 0 ? latestInvoice[0].id : 1; // Default to 1 if no records exist

        // ✅ Step 2: Prepare Data for `quotationdetail`
        const values: any[] = [];
        let subTotal = 0;

        for (let item of sessionData.cart) {
            const itemSubTotal = item.QTY * item.UnitPrice;
            subTotal += itemSubTotal; // Calculate subTotal
            values.push([invoiceno, item.description, item.QTY, item.UnitPrice, itemSubTotal]);
        }

        // ✅ Step 3: Insert `quotationdetail` Records
        await pool.query(
            `INSERT INTO quotationdetail (invoiceno, description, QTY, UnitPrice, subtotal) VALUES ?`,
            [values]
        );
        const [customer]:any = await pool.query(`select id from customers  where customerName = ?`, [customerName])
        const customerId = customer[0].id;

        // ✅ Step 4: Calculate Totals
        const totalTax = (subTotal * taxRate) / 100;
        const totalBill = subTotal + totalTax + shippingHandling;

        // ✅ Step 5: Insert into `quotation` Table
        await pool.query(
            `INSERT INTO quotation (customerId, date, subTotal, taxRate, totalTax, shippingHandling, totalBill, invoiceno)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [customerId, date, subTotal, taxRate, totalTax, shippingHandling, totalBill, invoiceno]
        );

        // ✅ Step 6: Increment `invoiceno` Table for Future Quotations
        await pool.query("INSERT INTO invoiceno VALUES ()"); // ✅ Correct way to insert new invoiceno

        const getSavedData = await pool.query(`select q.customerId, c.customerName, c.customerAddress, c.customerContact, q.date, q.subTotal, q.taxRate, q.shippingHandling, q.totalBill, q.invoiceno, i.quotationNo
            from quotation q 
            join customers c on
            q.customerId = c.id
            join invoiceno i
            on   i.id = q.invoiceno
            where quotationStatus = 'Y'`);

        // ✅ Clear session cart after saving
        sessionData.cart = [];

        res.status(200).json({
            message: "Quotation finalized successfully!",
            ...getSavedData[0] 
        });

    } catch (error) {
        console.error("❌ Error finalizing quotation:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};



export const getQuotations = async (req: Request, res: Response): Promise<void> => {
    try {

        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;

        const [result]:any = await pool.query(`select q.customerId, c.customerName, c.customerAddress, c.customerContact, q.date, q.subTotal, q.taxRate, q.shippingHandling, q.totalBill, q.invoiceno, i.quotationNo
            from quotation q 
            join customers c on
            q.customerId = c.id
            join invoiceno i
            on   i.id = q.invoiceno
            where quotationStatus = 'Y' LIMIT ?`,  [limit]);

        if(result.lenght ===0){
            res.send({message: "no quotation found!"})
        }

        res.status(200).send([" Quotations Sucuessfully fetched!",
            ...result
        ])
    } catch (error) {
        console.error({message:"error fetching quotations: "}, error)
        res.status(500).send({message:"Internal Server Error!"})
    }
};


export const updateQuotation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // InvoiceNo from URL params
        const invoiceNo = id;
        console.log("Updating Quotation for InvoiceNo:", invoiceNo);

        const { customerName, date, taxRate, shippingHandling, description, QTY, UnitPrice } = req.body;

        // ✅ Step 1: Ensure `invoiceNo` exists
        const [existingInvoice]: any = await pool.query("SELECT * FROM invoiceno WHERE id = ?", [invoiceNo]);
        if (existingInvoice.length === 0) {
            res.status(404).json({ message: "Invoice not found!" });
            return;
        }

        // ✅ Step 2: Fetch `customerId` using `customerName`
        const [customer]: any = await pool.query("SELECT id FROM customers WHERE customerName = ?", [customerName]);
        if (customer.length === 0) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }
        const customerId = customer[0].id;

        // ✅ Step 3: Delete Existing `quotationDetail` Entries for This Invoice
        await pool.query("DELETE FROM quotationDetail WHERE invoiceNo = ?", [invoiceNo]);

        // ✅ Step 4: Insert Updated `quotationDetail` Records
        const subtotal = QTY * UnitPrice; // ✅ Calculate subtotal
        await pool.query(
            `INSERT INTO quotationDetail (invoiceNo, description, QTY, UnitPrice, subtotal) VALUES (?, ?, ?, ?, ?)`,
            [invoiceNo, description, QTY, UnitPrice, subtotal]
        );

        // ✅ Step 5: Calculate `subTotal`, `totalTax`, and `totalBill`
        const totalTax = (subtotal * taxRate) / 100;
        const totalBill = subtotal + totalTax + shippingHandling;

        // ✅ Step 6: Update `quotation` Table
        await pool.query(
            `UPDATE quotation 
            SET customerId = ?, date = ?, subTotal = ?, taxRate = ?, totalTax = ?, shippingHandling = ?, totalBill = ?
            WHERE invoiceNo = ?`,
            [customerId, date, subtotal, taxRate, totalTax, shippingHandling, totalBill, invoiceNo]
        );

        // ✅ Fetch Updated Data
        const [updatedData]: any = await pool.query(`
            SELECT q.customerId, c.customerName, c.customerAddress, c.customerContact, 
                   q.date, q.subTotal, q.taxRate, q.shippingHandling, q.totalBill, 
                   q.invoiceNo, i.quotationNo
            FROM quotation q 
            JOIN customers c ON q.customerId = c.id
            JOIN invoiceno i ON i.id = q.invoiceNo
            WHERE q.invoiceNo = ?`, [invoiceNo]);

        res.status(200).json({
            message: "Quotation updated successfully!",
            ...updatedData[0]
        });

    } catch (error) {
        console.error("❌ Error updating quotation:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};



// deleteQuotation
export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        // ✅ Check if the quotation exists
        const [existingQuotation]: any = await pool.query(`SELECT * FROM quotation WHERE id = ?`, [id]);
        if (existingQuotation.length === 0) {
            res.status(404).json({ message: "No quotation found!" });
            return;
        }

        // ✅ Soft delete: Update `quotationDetailStatus` & `status` to 'N'
        const [query]: any = await pool.query(
            `UPDATE quotationdetail SET quotationDetailStatus = 'N' WHERE id = ?`, 
            [id]
        );

        const [query2]: any = await pool.query(
            `UPDATE quotation SET quotationStatus = 'N' WHERE id = ?`, 
            [id]
        );

        // ✅ Check if any row was affected
        if (query.affectedRows === 0 && query2.affectedRows === 0) {
            res.status(404).json({ message: "Quotation not found or already deleted!" });
            return;
        }

        res.status(200).json({
            message: "Deleted quotation successfully!",
            quotationDetailUpdate: query.affectedRows,
            quotationUpdate: query2.affectedRows
        });

    } catch (error) {
        console.error("❌ Error deleting quotation:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};




export const getExpenseCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const query =   `select * from expenseCategory where categoryStatus = 'Y' `;
        const [result]: any = await pool.query(query);
        res.status(200).send({messsage:"categories Fetched Successfully!",
            ...result
        }
        )
    } catch (error) {
        console.error("❌ Error fetching categories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const createExpenseCatagory = async (req: Request, res: Response): Promise<void> => {
    try {
        const {categoryName}  = req.body;

        const query  = `insert into expenseCategory (categoryName) values (?)`;

        const values  = [categoryName]; 

        const [checkCategory]:any  = await pool.query(`select * from categories where LOWER(categoryName)= LOWER(?)`,
            [categoryName]
        );


        if(checkCategory.lenght>0){
            res.status(400).send({message: "Category already exsits!"});
            return;
        }

    const [categoryDate]: any = await pool.query(query, values);    
    
    const [displayCategory]: any = await pool.query(`select * from expenseCategory`);

    res.status(200).send({message: "category saved successfully!",
        ...displayCategory[0]
    })
    } catch (error) {
        console.error("❌ Error Adding expenseCategory:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    
}




export const alterExpenseCategory = async (req: Request, res: Response): Promise<void> => {
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
            "SELECT * FROM expenseCategory WHERE id = ?",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "expenseCategory not found!" });
            return;
        }

        // ✅ Update category in the database
        const updateQuery = `UPDATE expenseCategory SET categoryName = ? WHERE id = ?`;
        const values = [categoryName, id];

        await pool.query(updateQuery, values);

        // ✅ Fetch updated category data
        const [updatedCategory]: any = await pool.query(
            "SELECT * FROM expenseCategory WHERE id = ?",
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





export const deleteExpenseCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        // ✅ Check if category exists and is active
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM expenseCategory WHERE id = ? AND categoryStatus = 'Y'",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found or already disabled!" });
            return;
        }


        // ✅ Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE expenseCategory SET categoryStatus = 'N' WHERE id = ?`;
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






// addExpense
export const addExpense = async (req: Request, res: Response): Promise<void> => {
    try {
    const {expenseName, expenseCategoryName, addedBy, date } = req.body;

    const [category]:any = await pool.query(`select id from expenseCategory where CategoryName = ?`, expenseCategoryName)
    
    if(!category){
        res.send({message: "no category found!"})
    }

     const expenseCategoryId = category[0].id
     
     const query = `insert into expenses (expenseName, expenseCategoryId, addedBy, date )
     values (?, ?, ?, ?)`;

    const values  =[expenseName, expenseCategoryId, addedBy, date];

    const [results]: any = await pool.query( query, values);

    res.status(200).send({message: "Expense Added Successfully!"})

    } catch (error) {
        console.error("❌ Error adding expense:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id; // Get Expense ID from URL params
        const { expenseName, expenseCategoryName, addedBy, date } = req.body;

        // ✅ Ensure the expense exists before updating
        const [existingExpense]: any = await pool.query(
            "SELECT * FROM expenses WHERE id = ?", 
            [id]
        );
        if (existingExpense.length === 0) {
            res.status(404).json({ message: "Expense not found!" });
            return;
        }

        // ✅ Fetch `expenseCategoryId` from `expenseCategory` table
        const [category]: any = await pool.query(
            "SELECT id FROM expenseCategory WHERE CategoryName = ?", 
            [expenseCategoryName]
        );
        if (category.length === 0) {
            res.status(404).json({ message: "Expense category not found!" });
            return;
        }
        const expenseCategoryId = category[0].id;

        // ✅ Update the expense
        const updateQuery = `
            UPDATE expenses 
            SET expenseName = ?, expenseCategoryId = ?, addedBy = ?, date = ? 
            WHERE id = ?
        `;
        const values = [expenseName, expenseCategoryId, addedBy, date, id];

        const [result]:any = await pool.query(updateQuery, values);

        res.status(200).json({
            message: "Expense updated successfully!",
            ...result[0]
          });

    } catch (error) {
        console.error("❌ Error updating expense:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


// deleteExpense
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        // ✅ Check if category exists and is active
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM expenses WHERE id = ? AND expenseStatus = 'Y'",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found or already disabled!" });
            return;
        }


        // ✅ Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE expenses SET expenseStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        // ✅ Send success response
        res.status(200).json({
            message: "Category successfully disabled (soft deleted)!"
        });

    } catch (error) {
        console.error("❌ Error disabling category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}