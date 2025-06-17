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

        //  Fetch user by email
        const [users]: any = await pool.query("SELECT * FROM login WHERE email = ?", [email]);

        const checkStatus = users[0].loginStatus;
        console.log(checkStatus);
        if(checkStatus === 'N'){
            res.send({message: "Invalid User!"});
            return;
        }

        if (users.length === 0) {
            res.status(400).json({ status: 400, message: "Invalid Username or Password" });
            return;
        }

        const user = users[0];
        let storedPassword = user.password;

        //  Check if the stored password is already hashed
        const isHashed = storedPassword.startsWith("$2b$"); // bcrypt-hashed passwords start with "$2b$"

        if (!isHashed) {
            console.log("Detected unencrypted password. Hashing it now...");
            const hashedPassword = await bcrypt.hash(storedPassword, 10);

            //  Update database with the newly hashed password
            await pool.query("UPDATE login SET password = ? WHERE email = ?", [hashedPassword, email]);
            console.log(" Password successfully hashed and updated.");

            storedPassword = hashedPassword; // Use the new hashed password for authentication
        }

        //  Compare hashed password using bcrypt
        const isMatch = await bcrypt.compare(password, storedPassword);
        if (!isMatch) {
            res.status(400).json({ status: 400, message: "Invalid Username or Password" });
            return;
        }

        //  Generate JWT token with email & role (NO PASSWORD)
        const token = jwt.sign(
            { email: user.email, role: user.role },
            "your_secret_key"
        );

        //  Send success response (excluding password)
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
        console.error(" Login Error:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};




// export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const entry = parseInt(req.query.entry as string, 10);
//     const page = parseInt(req.query.page as string, 10);

//     const limit = !isNaN(entry) && entry > 0 ? entry : 10;
//     const pageNum = !isNaN(page) && page > 0 ? page : 1;
//     const offset = (pageNum - 1) * limit;

//     const [rows]: any = await pool.query(
//       `SELECT *
//        FROM login 
//        WHERE loginStatus = 'Y' 
//        LIMIT ? OFFSET ?`,
//       [limit, offset]
//     );

//     if (!rows || rows.length === 0) {
//       res.status(404).json({ message: "No users found!" });
//       return;
//     }

//     const users = await Promise.all(
//       rows.map(async (user: any) => {
//         let image: string | null = null;

//         if (user.image && fs.existsSync(user.image)) {
//           try {
//             const imageBuffer = fs.readFileSync(path.resolve(user.image));
//             const mimeType =
//               path.extname(user.image).toLowerCase() === ".png"
//                 ? "image/png"
//                 : "image/jpeg";
//             image = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
//           } catch (error) {
//             console.error(`⚠️ Error reading image for user ${user.id}:`, error);
//           }
//         }

//         return {
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           password: user.password,
//           mobileNumber: user.mobileNumber,
//           image,
//         };
//       })
//     );

//     //  Return array of user objects
//     res.status(200).json(users);

//   } catch (error) {
//     console.error(" Error fetching users:", error);
//     res.status(500).json({ error: "Database query failed" });
//   }
// };
export const getAllUsers = async (

  req: Request,

  res: Response

): Promise<void> => {

  try {

    let page = parseInt(req.query.page as string) || 1;

    let limit = parseInt(req.query.limit as string) || 10;

    let offset = (page - 1) * limit;



    console.log(`Fetching page ${page} with limit ${limit}`);



    // Fetch users

    const [rows]: any = await pool.query("SELECT * FROM login where loginStatus = 'Y' LIMIT ? OFFSET ?", [limit, offset]);



    // Process each user's image

    const usersWithImages = await Promise.all(rows.map(async (user: any) => {

      let imageBase64 = null;



      if (user.image) {

        try {

          const fullPath = path.join(process.cwd(), user.image);

          if (fs.existsSync(fullPath)) {

            const buffer = fs.readFileSync(fullPath);

            const ext = path.extname(fullPath).toLowerCase().slice(1);

            imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;

          }

        } catch (err) {

          console.warn(`Failed to read image for user ${user.id}`, err);

        }

      }


      return {

        ...user,

        image: imageBase64,

      };

    }));



    res.status(200).send(usersWithImages);
    console.log(usersWithImages);


  } catch (error) {

    console.error("Error fetching users:", error);

    res.status(500).json({ error: "Database query failed" });

  }

}; 





export const getImage = async (req: Request, res: Response): Promise<void> => {
    res.sendFile(path.join(__dirname, 'getImage.html'));
}





export const forgetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const  id  = req.params; // Corrected destructuring
        const { password, newPassword } = req.body;

        if (!password || !newPassword) {
            res.status(400).json({ status: 400, message: "Please enter both current and new password!" });
            return;
        }

        // Fetch the stored password from the database
        const [rows]: any = await pool.query(`SELECT password FROM login WHERE id = ?`, [id]);

        if (rows.length === 0) {
            res.status(404).json({ status: 404, message: "User not found" });
            return;
        }

        const storedPassword = rows[0].password;
        const isMatch = await bcrypt.compare(password, storedPassword);

        if (!isMatch) {
            res.status(400).json({ status: 400, message: "Invalid Password" });
            return;
        }

        // Hash the new password
        const hashNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password in the database
        const [updateResult]: any = await pool.query(
            `UPDATE login SET password = ? WHERE id = ?`,
            [hashNewPassword, id]
        );

        if (updateResult.affectedRows === 0) {
            res.status(500).json({ status: 500, message: "Password update failed" });
            return;
        }

        res.status(200).json({ status: 200, message: "Password changed successfully!" });
    } catch (error) {
        console.error(" Error Changing Password:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};




export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Get user ID from URL params
        const { password } = req.body; // Get new password from request body

        //  Hash the new password
        const newHashedPassword = await bcrypt.hash(password, 10);

        //  Update the password in the database
        const updateQuery = `UPDATE login SET password = ? WHERE id = ?`;
        await pool.query(updateQuery, [newHashedPassword, id]);

        res.status(200).json({ message: "Password updated successfully!" });

    } catch (error) {
        console.error(" Error changing password:", error);
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

        const imagePath = req.file ? req.file.path.replace(/\\/g, "/") : null; //  Store uploaded file path

        res.status(200).json({ message: "Upload successful!", imagePath });
    } catch (error) {
        console.error(" Error uploading file:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





export const addUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, contact, cnic, address, date, role } =
        req.body;
  
      console.log("Uploaded File:", req.file); // Log the uploaded file
  
      //  If no file is uploaded, imagePath should be NULL
      const imagePath = req.file?.path.replace(/\\/g, "/") || null;
  
      //  Ensure required fields are present
      if (!name || !email || !password || !cnic || !role) {
        res.status(400).json({ status: 400, message: "Missing required fields" });
      }
  
      //  Check if user already exists
      const [existingUser]: any = await pool.query(
        "SELECT * FROM login WHERE LOWER(email) = LOWER(?)",
        [email]
      );
      if (existingUser.length > 0) {
        res.status(400).json({ message: "User already exists!" });
      }
  
      //  Hash the password before storing it
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      //  Insert user into MySQL database with hashed password & image path
      const query = `
              INSERT INTO login (name, email, password, contact, cnic, address, date, role, image)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
      const values = [
        name,
        email,
        hashedPassword,
        contact,
        cnic,
        address,
        date,
        role,
            
      ];
  
      const [result]: any = await pool.query(query, values);
  
      //  Send success response
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
        imagePath,
      });
    } catch (error) {
      console.error(" Error adding user:", error);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  };





// 🛠 Update User Function (Allows Updating User Info & image)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  // Get user ID from URL
        const { name, email, contact, cnic, address, role } = req.body;
        const newimage = req.file ? req.file.path : null; //  Store new image if uploaded

        //  Check if user exists
        const [user]: any = await pool.query("SELECT * FROM login WHERE id = ?", [id]);
        if (user.length === 0) {
            res.status(404).json({ status: 404, message: "User not found" });
            return;
        }

        let imagePath = user[0].image; // Keep existing image if no new file is uploaded

        //  If a new image is uploaded, delete the old file
        if (newimage) {
            if (imagePath) {
                const oldFilePath = path.join(__dirname, "../../", imagePath);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath); // Delete the old file
                }
            }
            imagePath = newimage; // Update image path
        }

        //  Update user in MySQL database
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
        console.error(" Error updating user:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;  // Get user ID from URL

        //  Update user status to 'N' instead of deleting
        const query: string = `UPDATE login SET loginStatus = 'N' WHERE id = ?`;
        console.log(`Updating user ${id} status to 'N'`);

        //  Execute the query
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
        console.error(" Error updating user status:", error);
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

        //  Check if customers exist
        if (customers.length === 0) {
            res.status(404).json({ status: 404, message: "No customers found" });
            return;
        }

        

        res.status(200).json(["customers fetched successfully!", ...customers]);


    } catch (error) {
        console.error(" Error fetching customers:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};



// 🛠 Add Customer Function
export const addCustomerInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerName, customerAddress, customerContact, companyName, companyAddress } = req.body;

        //  Ensure required fields are present
        if (!customerName || !customerAddress || !customerContact || !companyName || !companyAddress) {
            res.status(400).json({ status: 400, message: "Missing required fields" });
            return;
        }

        //  Insert customer into MySQL database
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
        console.error(" Error adding customer:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};




// 🛠 Update Customer Function
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Get customer ID from URL params
        const { customerName, customerAddress, customerContact, companyName, companyAddress } = req.body;

        //  Ensure at least one field is provided for update
        if (!customerName && !customerAddress && !customerContact && !companyName && !companyAddress) {
            res.status(400).json({ status: 400, message: "No fields provided for update" });
            return;
        }

        //  Check if the customer exists
        const [existingCustomer]: any = await pool.query("SELECT * FROM customers WHERE id = ?", [id]);
        if (existingCustomer.length === 0) {
            res.status(404).json({ status: 404, message: "Customer not found" });
            return;
        }

        //  Construct the dynamic update query
        const updateFields = [];
        const values = [];

        if (customerName) { updateFields.push("customerName = ?"); values.push(customerName); }
        if (customerAddress) { updateFields.push("customerAddress = ?"); values.push(customerAddress); }
        if (customerContact) { updateFields.push("customerContact = ?"); values.push(customerContact); }
        if (companyName) { updateFields.push("companyName = ?"); values.push(companyName); }
        if (companyAddress) { updateFields.push("companyAddress = ?"); values.push(companyAddress); }

        values.push(id); // Add the ID to the values array

        const query = `UPDATE customers SET ${updateFields.join(", ")} WHERE id = ?`;

        //  Execute update query
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
        console.error(" Error updating customer:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};


export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  // Get customer ID from URL

        //  Update customer status to 'N' instead of deleting
        const query: string = `UPDATE customers SET customerStatus = 'N' WHERE id = ?`;
        console.log(`Updating customer ${id} status to 'N'`);

        //  Execute the query
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
        console.error(" Error updating customer status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// getAllAttendance
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const [attendance]: any = await pool.query(
            `SELECT 
                userId, 
                DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date,
                clockIn, 
                clockOut, 
                day, 
                status, 
                attendanceStatus, 
                leaveReason, 
                leaveApprovalStatus, 
                workingHours
             FROM attendance 
             WHERE userId = ? AND date = CURDATE()
             ORDER BY date DESC 
             LIMIT 1`, 
            [id]
        );

        if (attendance.length === 0) {
            res.status(404).json({ status: 404, message: "No attendance record found for today." });
            return;
        }

        const attendanceData = attendance[0];

        //  Determine what to return
        if (!attendanceData.clockIn) {
            res.status(200).json({
                message: "Clock-in time not recorded yet",
                status: "Awaiting Clock-in"
            });
            return;
        }

        if (!attendanceData.clockOut) {
            res.status(200).json({
                message: "Clock-in recorded successfully",
                clockIn: attendanceData.clockIn,
                status: "Clock-in Registered"
            });
            return;
        }

        res.status(200).json(["Clock-out recorded successfully",
            ...attendance
        ]);

    } catch (error) {
        console.error(" Error fetching attendance:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

  
  export const getAllAttendances = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      //  Fetch the latest attendance record for each user
      const [attendance]: any = await pool.query(
        `SELECT 
                  userId, 
                  DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date,
                  clockIn, 
                  clockOut, 
                  day, 
                  status, 
                  attendanceStatus, 
                  leaveReason, 
                  leaveApprovalStatus, 
                  workingHours,
                  id
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
  
      //  Send only the latest attendance records per user
      res.status(200).json([
       "Latest attendance records fetched successfully",
        ...attendance,
      ]);
    } catch (error) {
      console.error(" Error fetching attendance:", error);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  };


// getTimings
export const getTimings = async (req: Request, res: Response): Promise<void> => {
   
 }


 
 export const addAttendance = async (req: Request, res: Response): Promise<void> => {
     try {
         const { id } = req.params; //  Get user ID directly from params
         const { date, clockIn, clockOut, attendanceStatus } = req.body;
 
         //  Validate required fields before inserting attendance
         if (!id || !date  || !attendanceStatus) {
             res.status(400).json({ status: 400, message: "Missing required fields" });
             return;
         }
 
         //  Check if user exists before inserting attendance
         const [user]: any = await pool.query(`SELECT id FROM login WHERE id = ?`, [id]);
         if (!user.length) {
             res.status(404).json({ status: 404, message: "User not found" });
             return;
         }
 
         //  Insert attendance record
         const query = `
             INSERT INTO attendance (
                 userId, date, clockIn, clockOut, day, attendanceStatus
             ) VALUES (?, ?, ?, ?, DAYNAME(?), ?)
         `;
 
         const [insertResult]: any = await pool.query(query, [
             id, date, clockIn, clockOut || null, date, attendanceStatus ?? null
         ]);
 
         if (insertResult.affectedRows === 0) {
             res.status(500).json({ status: 500, message: "Failed to add attendance" });
             return;
         }
 
         //  Ensure `clockOut` is provided before calculating working hours
         if (!clockOut) {
             res.status(200).json({
                 status: 200,
                 message: "Attendance recorded successfully, but working hours will be calculated after clock-out."
             });
             return;
         }
 
         //  Calculate working hours
         const [timeDiffResult]: any = await pool.query(
             `SELECT 
                 LPAD(TIMESTAMPDIFF(HOUR, clockIn, clockOut), 2, '0') AS Hours,
                 LPAD(TIMESTAMPDIFF(MINUTE, clockIn, clockOut) % 60, 2, '0') AS Minutes
             FROM attendance 
             WHERE userId = ? AND date = ?`, 
             [id, date]
         );
 
         if (timeDiffResult.length === 0) {
             res.status(404).json({ status: 404, message: "Attendance record not found" });
             return;
         }
 
         const { Hours, Minutes } = timeDiffResult[0] || { Hours: "0", Minutes: "00" };
 
         //  Format working hours correctly
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
 
         //  Update working hours in the database
         const [updateResult]: any = await pool.query(
             `UPDATE attendance 
              SET workingHours = ? 
              WHERE userId = ? AND date = ?`, 
             [formattedWorkingHours.trim(), id, date]
         );
 
         if (updateResult.affectedRows === 0) {
             res.status(500).json({ status: 500, message: "Failed to update working hours" });
             return;
         }
 
         //  Fetch and return the updated attendance record
         const [attendance]: any = await pool.query(
             "SELECT * FROM attendance WHERE userId = ? AND date = ?",
             [id, date]
         );
 
         res.status(201).json({
             status: 201,
             message: "Attendance recorded successfully",
             attendance: attendance[0]
         });
 
     } catch (error) {
         console.error(" Error adding attendance:", error);
         res.status(500).json({ status: 500, message: "Internal Server Error" });
     }
 };
 
 
// markAttendance
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;
        console.log("User ID:", userId);

        //  Check if the user has already clocked in today
        const [existingAttendance]: any = await pool.query(
            "SELECT userId, clockIn, clockOut FROM attendance WHERE userId = ? AND date = CURDATE()",
            [userId]
        );

        //  If user has NOT clocked in today, insert new clock-in record
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

        //  Fetch clock-in details to check clock-in and clock-out values
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

        //  If user has already clocked out, prevent duplicate clock-out
            if (checkAttendance[0].clockOut !== null) {
                res.status(400).json({
                    message: "You have already clocked out today!"
                });
                return;
            }

        //  Now, update clockOut since user is actually clocking out
        await pool.query(
            `UPDATE attendance 
             SET clockOut = CURRENT_TIMESTAMP()
             WHERE userId = ? AND date = CURDATE()`,
            [userId]
        );

        //  Fetch updated clock-in & clock-out time to calculate working hours
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

        //  Now, Calculate `workingHours` Correctly After `clockOut` Is Set
        const [timeDiffResult]: any = await pool.query(
            `SELECT 
                LPAD(TIMESTAMPDIFF(HOUR, clockIn, clockOut), 2, '0') AS Hours,
                LPAD(TIMESTAMPDIFF(MINUTE, clockIn, clockOut) % 60, 2, '0') AS Minutes
            FROM attendance WHERE userId = ? AND date = CURDATE()`,
            [userId]
        );

        console.log("Working Hours Calculation:", timeDiffResult);

        const { Hours, Minutes } = timeDiffResult[0] || { Hours: "0", Minutes: "00" };

//  Format Hours & Minutes
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

//  Finally, Update `workingHours` field
    await pool.query(
    `UPDATE attendance 
     SET workingHours = ?
     WHERE userId = ? AND date = CURDATE()`,
    [formattedWorkingHours.trim(), userId] // Trim to remove extra spaces
);

        //  Fetch final attendance record
        const [finalAttendance]: any = await pool.query(
            `SELECT *, DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date FROM attendance WHERE userId = ? AND date = CURDATE()`,
            [userId]
        );

        res.status(200).json({
            message: "Clock-out recorded successfully",
            ...finalAttendance[0]
        });

    } catch (error) {
        console.error(" Error marking attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//updating attendance




export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract data from the request body
        const { date, clockIn, clockOut, attendanceStatus } = req.body;

        // Extract the user ID from the URL parameters
        const userId = req.params.id;

        //  **Calculate working hours if clockIn & clockOut exist**
        let workingHours = "0 Minutes"; // Default value

        const [timeDiffResult]: any = await pool.query(
            `SELECT 
                LPAD(TIMESTAMPDIFF(HOUR, clockIn, clockOut), 2, '0') AS Hours,
                LPAD(TIMESTAMPDIFF(MINUTE, clockIn, clockOut) % 60, 2, '0') AS Minutes
            FROM attendance WHERE id = ? `,
            [userId]
        );

        const { Hours, Minutes } = timeDiffResult[0] || { Hours: 0, Minutes: 0 };

        if (Hours > 0) {
            workingHours = `${Hours} Hour${Hours !== 1 ? "s" : ""} `;
        }
        if (Minutes > 0) {
            workingHours += `${Minutes} Minute${Minutes !== 1 ? "s" : ""}`;
        }

        console.log(`🕒 Updated Working Hours: ${workingHours}`);

        //  **Update Attendance with Working Hours**
        const query = `
            UPDATE attendance
            SET
                date = ?,
                clockIn = ?,
                clockOut = ?,
                attendanceStatus = ?,
                workingHours = ?
            WHERE id = ?
        `;

        // Execute the update query
        const [result]: any = await pool.query(query, [
            date,
            clockIn,
            clockOut,
            attendanceStatus,
            workingHours,
            userId
        ]);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "Attendance record not found" });
            return; // Ensure function exits
        }

        // Fetch updated attendance record
        const [attendance]: any = await pool.query(
            "SELECT * FROM attendance WHERE id = ?",
            [userId]
        );

        res.json({
            message: "Attendance updated successfully",
            ...attendance[0],
        });

    } catch (error) {
        console.error(" Error updating attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const deleteAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const query = `DELETE FROM attendance WHERE id = ?`;

        const [result]: any = await pool.query(query, [id]);

        if (result.affectedRows > 0) {
            res.json({ message: "Attendance record permanently deleted." });
        } else {
            res.status(404).json({ message: "Attendance record not found" });
        }

    } catch (error) {
        console.error(" Error deleting attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





export const attendanceSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        //  Optimized single query to fetch all attendance counts
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

        //  Send response with the fetched summary
        res.status(200).json(summary[0]);

    } catch (error) {
        console.error(" Error fetching attendance summary:", error);
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
                l.name AS name,
                a.date,
                a.day,
                a.attendanceStatus,
                a.leaveReason,
                a.leaveApprovalStatus
            FROM attendance a
            JOIN login l ON a.userId = l.id
            where a.attendanceStatus = 'Leave'
            ORDER BY a.date DESC LIMIT ?
        `;

            const values = [limit];
        const [attendance]: any = await pool.query(query, values);

        if (attendance.length === 0) {
            res.status(404).json({ message: "No attendance records found" });
            return;
        }

        //  Send attendance records with user names
        res.status(200).json(["Attendance records fetched successfully",
            ...attendance
        ]);

    } catch (error) {
        console.error(" Error fetching attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const addLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;  
        const { date, leaveSubject, leaveReason } = req.body;

        const userId = Number(id); 

        if (!userId || !date || !leaveSubject || !leaveReason) {
            res.status(400).json({ message: "Provide all required information!" });
            return;
        }

        const [existingLeave]: any = await pool.query(
            "SELECT COUNT(*) AS leaveCount FROM leaves WHERE userId = ? AND date = ?",
            [userId, date]
        );

        if (existingLeave.length > 0 && existingLeave[0].leaveCount > 0) {
            res.status(400).json({ message: "You have already submitted a leave request for this date." });
            return;
        }

        const query = `
            INSERT INTO leaves (userId, date, leaveSubject, LeaveReason)
            VALUES (?, ?, ?, ?)
        `;

        const values = [userId, date, leaveSubject, leaveReason];

        const [result]: any = await pool.query(query, values);

        const [updatedLeaves]: any = await pool.query(
            `select lv.*, l.* from leaves lv join login l on l.id = lv.userId`, [userId]
        );

        res.status(201).json({
            status: 201,
            message: "Leave added successfully",
            leaveId: result.insertId,
            ...updatedLeaves[0]
        });

    } catch (error) {
        console.error(" Error adding leave:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const authorizeLeaves = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;
        const { leaveSubject, date, leaveReason, leaveStatus } = req.body;

        console.log("Updating Leave Request:", userId, leaveSubject, date, leaveReason, leaveStatus);

        const [existingLeave]: any = await pool.query(
            "SELECT * FROM leaves WHERE userId = ?",
            [userId]
        );

        if (existingLeave.length === 0) {
            res.status(404).json({ message: "Leave request not found!" });
            return;
        }

        const query = `
            UPDATE leaves
            SET leaveSubject = ?, date = ?, leaveReason = ?, leaveStatus = ?
            WHERE userId = ?
        `;

        await pool.query(query, [leaveSubject, date, leaveReason, leaveStatus, userId]);

        const [checkStatus]: any = await pool.query(
            "SELECT leaveStatus FROM leaves WHERE leaveStatus = 'Approved' AND userId = ?",
            [userId]
        );

        if (checkStatus.length === 0) {
            console.log(" No approved leave found, skipping attendance update.");
            return;
        }

        const [updateAttendance]: any = await pool.query(
            "UPDATE attendance SET attendanceStatus = 'Leave', leaveApprovalStatus = 'Approved' WHERE userId = ? ORDER BY date DESC LIMIT 1",
            [userId]
        );

        const [updatedRow]: any = await pool.query(
            "SELECT * FROM leaves ORDER BY date DESC LIMIT 1"
        );

        res.status(200).send({
            message: "Leave Updated Successfully!",
            ...updatedRow[0]
        });

    } catch (error) {
        console.error(" Error updating leave request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const configHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, holiday } = req.body;

        //  Ensure required fields are present
        if (!date || !holiday) {
            res.status(400).json({ message: "Provide both date and holiday name!" });
            return;
        }

        //  SQL Query to Insert Holiday
        const query = `INSERT INTO holidays (date, holiday) VALUES (?, ?)`;
        const values = [date, holiday];

        //  Execute the Insert Query
        const [addedHoliday]:any =  await pool.query(query, values);

        //  Fetch the newly added holiday with correct timezone conversion
        const [holidays]: any = await pool.query(
            `SELECT 
                id, 
                DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date, 
                holiday 
             FROM holidays 
             where date = ?
             LIMIT 1`, date
        );

        //  Send Success Response
        res.status(201).json({
            status: 201,
            message: "Holiday added successfully",
            ...holidays[0]
        });

    } catch (error) {
        console.error(" Error adding holiday:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const updateHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { date, holiday } = req.body;

        //  Ensure required fields are present
        if (!date || !holiday) {
            res.status(400).json({ message: "Provide both date and holiday name!" });
            return;
        }

        //  Check if the holiday exists before updating
        const [existingHoliday]: any = await pool.query(
            "SELECT * FROM holidays WHERE id = ?", 
            [id]
        );

        if (!existingHoliday.length) {
            res.status(404).json({ message: "Holiday not found!" });
            return;
        }

        //  Update the holiday
        const query = `UPDATE holidays SET date = ?, holiday = ? WHERE id = ?`;
        const values = [date, holiday, id];

        await pool.query(query, values);

        //  Fetch the updated holiday with correct timezone conversion
        const [updatedHoliday]: any = await pool.query(
            `SELECT id, holiday, CONVERT_TZ(date, '+00:00', @@session.time_zone) AS date 
             FROM holidays 
             WHERE id = ?`, 
            [id]
        );

        if (!updatedHoliday.length) {
            res.status(500).json({ message: "Error retrieving updated holiday" });
            return;
        }

        //  Use correct column name & ensure date is not NULL
        const holidayDate = updatedHoliday[0].date ? new Date(updatedHoliday[0].date) : null;
        const formattedDate = holidayDate ? holidayDate.toISOString().split("T")[0] : null;

        //  Send Success Response
        res.status(200).json({
            status: 200,
            message: "Holiday updated successfully",
            date: formattedDate,  // Corrected date format
            holiday: updatedHoliday[0].holiday
        });

    } catch (error) {
        console.error(" Error updating holiday:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        //  Check if the holiday exists
        const [existingHoliday]: any = await pool.query(
            "SELECT * FROM holidays WHERE id = ?", 
            [id]
        );

        if (!existingHoliday.length) {
            res.status(404).json({ message: "Holiday not found!" });
            return;
        }

        //  Perform Soft Delete (Set holidayStatus = 'N')
        const query = `UPDATE holidays SET holidayStatus = 'N' WHERE id = ?`;
        await pool.query(query, [id]);

        //  Send Success Response
        res.status(200).json({
            status: 200,
            message: "Holiday deleted successfully (soft delete applied).",
            holidayId: id
        });

    } catch (error) {
        console.error(" Error deleting holiday:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





export const getHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
        const [holidays]: any = await pool.query(
            `SELECT id, DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date, holiday 
             FROM holidays 
             WHERE holidayStatus= 'Y' `, 
        );

        if (holidays.length === 0) {
            res.status(404).json({ status: 404, message: "No holidays found" });
            return;
        }

        //  Send response as a formatted string to prevent timezone issues
        res.status(200).json(holidays);

    } catch (error) {
        console.error(" Error fetching holidays:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};





// getWithdrawnEmployees
export const getWithdrawnEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
        const [query]: any = await pool.query(
            "SELECT * FROM withdrawals WHERE withdrawStatus = 'Y'"
        );

        console.log("Withdrawn Employees:", query); 
        if (query.length === 0) {
            res.status(404).send({ message: "No User found in Withdrawals!" });
            return;
        }

        res.status(200).json(query);

    } catch (error) {
        console.error(" Error Fetching Withdrawn Employees!:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// Withdraw Employee
export const withdrawEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { withdrawReason } = req.body;

        console.log("Withdraw Request Received:", { id, withdrawReason });

        //  Ensure required fields are present
        if (!withdrawReason) {
            res.status(400).json({ message: "Provide all required fields!" });
            return;
        }

        //  Check if employee already exists in `withdrawals`
        const [existingWithdrawal]: any = await pool.query(
            "SELECT * FROM withdrawals WHERE employeeId = ?",
            [id]
        );

        if (existingWithdrawal.length > 0) {
            res.status(409).json({ message: "Employee is already withdrawn!" });
            return;
        }

        //  Insert into `withdrawals` table
        const insertQuery = "INSERT INTO withdrawals (employeeId, withdrawReason) VALUES (?, ?)";
        const values = [id, withdrawReason];

        //  Execute query
        const [result]: any = await pool.query(insertQuery, values);

        //  Update `status` in `login` table to 'N'
        const updateQuery = "UPDATE login SET loginStatus = 'N' WHERE id = ?";
        await pool.query(updateQuery, [id]);

        //  Send success response
        res.status(201).json({
            status: 201,
            message: "Employee withdrawn successfully",
        });

    } catch (error) {
        console.error(" Error withdrawing employee:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





// reActiveEmployee
export const reActiveEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; 
        console.log("Reactivating Employee ID:", id);


        if (!id) {
            res.status(400).send({ message: "Please provide an ID!" });
            return;
        }

        //  Update `withdrawals` table
        const [reActiveWithdraw]: any = await pool.query(
            "UPDATE withdrawals SET withdrawStatus = 'N' WHERE employeeId = ?", 
            [id]
        );

        if (reActiveWithdraw.affectedRows === 0) {
            res.status(404).send({ message: "No user found in withdrawals!" });
            return;
        }

        const [reActiveUser]: any = await pool.query(
            "UPDATE login SET loginStatus = 'Y' WHERE id = ?", 
            [id]
        );

        if (reActiveUser.affectedRows > 0) {
            res.status(200).json({
                message: "User Reactivated Successfully!",
                userId: id
            });
        } else {
            res.status(404).send({ message: "No user found in login!" });
        }

    } catch (error) {
        console.error(" Error Re-activating employee:", error);
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
        res.status(200).send(result);

    } catch (error) {
        console.error(" Error fetching categories:", error);
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
        console.error(" Error Adding category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    
}




export const alterCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { categoryName } = req.body;

        //  Ensure required fields are provided
        if (!categoryName) {
            res.status(400).json({ message: "Please provide the category name!" });
            return;
        }

        //  Check if category exists
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM categories WHERE id = ?",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found!" });
            return;
        }

        //  Update category in the database
        const updateQuery = `UPDATE categories SET categoryName = ? WHERE id = ?`;
        const values = [categoryName, id];

        await pool.query(updateQuery, values);

        //  Fetch updated category data
        const [updatedCategory]: any = await pool.query(
            "SELECT * FROM categories WHERE id = ?",
            [id]
        );

        //  Send success response
        res.status(200).json({
            message: "Category updated successfully!",
            ...updatedCategory[0]
        });

    } catch (error) {
        console.error(" Error updating category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        //  Check if category exists and is active
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM categories WHERE id = ? AND categoryStatus = 'Y'",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found or already disabled!" });
            return;
        }


        //  Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE categories SET categoryStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        //  Send success response
        res.status(200).json({
            message: "Category successfully disabled (soft deleted)!"
        });

    } catch (error) {
        console.error(" Error disabling category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// ADD PROJECT:
export const addProject = async (req: Request, res: Response): Promise<void> => {
    try {
        //  Fetch all available categories before project creation
        const [categories]: any = await pool.query(`SELECT categoryName FROM categories where categoryStatus = ?`, 'Y');

        //  Extract project details from request body
        const { projectName, projectCategory, description, startDate, endDate } = req.body;

        //  Ensure required fields are present
        if (!projectName || !projectCategory || !description || !startDate || !endDate) {
            res.status(400).json({ message: "Please fill all the fields!", categories });
            return;
        }

        //  Extract category names from DB for comparison
        const categoryList = categories.map((cat: any) => cat.categoryName.toLowerCase());

        //  Check if the selected category exists in the database
        if (!categoryList.includes(projectCategory.toLowerCase())) {
            res.status(400).json({ message: "Invalid category selected!", categories });
            return;
        }

        //  Check if project already exists (Case-insensitive check)
        const [existingProject]: any = await pool.query(
            "SELECT * FROM projects WHERE LOWER(projectName) = LOWER(?)",
            [projectName]
        );

        if (existingProject.length > 0) {
            res.status(400).json({ message: "Project already exists!", categories });
            return;
        }

        //  Insert new project
        const query = `INSERT INTO projects (projectName, projectCategory, description, startDate, endDate) VALUES (?, ?, ?, ?, ?)`;
        const values = [projectName, projectCategory, description, startDate, endDate];

        const [result]: any = await pool.query(query, values);

        //  Fetch all projects after insertion
        const [getProjects]: any = await pool.query("SELECT * FROM projects ORDER BY id DESC");

        //  Send success response with available categories and projects
        res.status(200).json({
            message: "Project added successfully!",
            ...getProjects[0]
        });

    } catch (error) {
        console.error(" Error Adding Project:", error);
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
        res.status(200).send(result);
    } catch (error) {
        console.error(" Error fetching projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const alterProjectInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { projectName, projectCategory, description, startDate, endDate } = req.body;

        //  Ensure required fields are provided
        if (!projectName || !projectCategory || !startDate || !endDate) {
            res.status(400).json({ message: "Please provide all required fields!" });
            return;
        }

        //  Check if the project exists
        const [existingProject]: any = await pool.query(
            "SELECT * FROM projects WHERE id = ?",
            [id]
        );

        if (existingProject.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }

        //  Update project details
        const updateQuery = `
            UPDATE projects 
            SET projectName = ?, projectCategory = ?, description = ?,  startDate = ?, endDate = ?
            WHERE id = ?
        `;
        const values = [projectName, projectCategory, description, startDate, endDate, id];

        await pool.query(updateQuery, values);

        //  Fetch updated project data
        const [updatedProject]: any = await pool.query(
            "SELECT * FROM projects WHERE id = ?",
            [id]
        );

        //  Send success response
        res.status(200).json({
            message: "Project updated successfully!",
            ...updatedProject[0]
        });

    } catch (error) {
        console.error(" Error updating project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        //  Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE projects SET projectStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        //  Send success response
        res.status(200).json({
            message: "Project successfully disabled Project!"
        });

    } catch (error) {
        console.error(" Error disabling Project:", error);
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

        res.status(200).send(result);
    } catch (error) {
        console.error(" Error Fetching Assigned Projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const assignProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, projectId } = req.params; //  Get user & project IDs from URL parameters
        console.log("User ID:", userId, "Project ID:", projectId);

        //  Validate required parameters
        if (!userId || !projectId) {
            res.status(400).json({ message: "Missing userId or projectId!" });
            return;
        }

        //  Check if User Exists
        const [user]: any = await pool.query("SELECT id FROM login WHERE id = ?", [userId]);
        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }

        //  Check if Project Exists
        const [project]: any = await pool.query("SELECT id FROM projects WHERE id = ?", [projectId]);
        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }

        //  Insert into `assignedprojects`
        const query = `
            INSERT INTO assignedprojects (employeeId, projectId, date, assignStatus)
            VALUES (?, ?, CURDATE(), 'Y');
        `;
        await pool.query(query, [userId, projectId]);

        //  Fetch assigned project details (Including Names)
        const [assignedProject]: any = await pool.query(`
            SELECT ap.id, l.name AS employeeName, p.projectName, ap.date, ap.assignStatus
            FROM assignedprojects ap
            JOIN login l ON ap.employeeId = l.id
            JOIN projects p ON ap.projectId = p.id
            WHERE ap.employeeId = ? AND ap.projectId = ?;
        `, [userId, projectId]);

        //  Send success response
        res.status(201).json({
            message: "Project assigned successfully!",
             ...assignedProject[0] // Return the assigned project details
        });

    } catch (error) {
        console.error(" Error Assigning Project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const alterAssignProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, projectId, id } = req.params;  //  Assignment ID from URL


        //  Update the assigned project
        const query = `
            UPDATE assignedprojects 
            SET employeeId = ?, projectId = ?, date = CURDATE()
            WHERE id = ?;
        `;
        const values = [employeeId, projectId, id];

        const [result]: any = await pool.query(query, values);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "Assignment not found or no changes made!" });
            return;
        }

        //  Fetch updated assignment details
        const [updatedAssignment]: any = await pool.query(`
            SELECT ap.id, l.name AS employeeName, p.projectName, ap.date, ap.assignStatus
            FROM assignedprojects ap
            JOIN login l ON ap.employeeId = l.id
            JOIN projects p ON ap.projectId = p.id
            WHERE ap.id = ? order by date desc`
            , [id]);

        res.status(200).json({
            ...updatedAssignment[0]
        });

    } catch (error) {
        console.error(" Error Updating Assigned Project:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; //  Get assignment ID from URL

        //  Update assignStatus to 'N' (Soft Delete)
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

        //  Fetch updated project list (Only active assignments)
        const [activeAssignments]: any = await pool.query(`
            SELECT ap.id, l.name AS employeeName, p.projectName, ap.date, ap.assignStatus
            FROM assignedprojects ap
            JOIN login l ON ap.employeeId = l.id
            JOIN projects p ON ap.projectId = p.id
            WHERE ap.assignStatus = 'Y';
        `);

        //  Send success response with remaining active projects
        res.status(200).json({
            message: "Project assignment deleted successfully!",
            ...activeAssignments
        });

    } catch (error) {
        console.error(" Error Deleting Assignment:", error);
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
        res.status(200).send(result)
    } catch (error) {
        console.error(" Error fetching todo!:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }    
}




// createTodo
export const createTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { task, note, startDate, endDate, deadline } = req.body;

        //  Validate required fields before inserting
        if (!id || !task || !startDate || !endDate || !deadline) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        //  Check if User Exists
        const [user]: any = await pool.query("SELECT id FROM login WHERE id = ?", [id]);
        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }

        const query = `
            INSERT INTO todo (employeeId, task, note, startDate, endDate, deadline) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [id, task, note || null, startDate, endDate, deadline];
        await pool.query(query, values);

        //  Fetch the newly created Todo
        const [createdTodo]: any = await pool.query(
            `SELECT t.id, l.name AS employeeName, t.task, t.note, t.startDate, t.endDate, t.deadline
             FROM todo t 
             JOIN login l ON l.id = t.employeeId
             WHERE t.employeeId = ? 
             ORDER BY t.id DESC LIMIT 1`, 
            [id]
        );

        res.status(201).json({
            message: "Todo added successfully!",
            ...createdTodo[0]
        });

    } catch (error) {
        console.error(" Error creating todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





export const alterTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, id } = req.params; 
        const { task, note, startDate, endDate, deadline } = req.body;

        console.log("emplID:",employeeId,  "ID:",  id);

        const [existingTodo]: any = await pool.query("SELECT * FROM todo WHERE id = ?", [id]);
        if (existingTodo.length === 0) {
            res.status(404).json({ message: "Todo not found!" });
            return;
        }

        const query = `
            UPDATE todo 
            SET employeeId = ?, task = ?, note = ?, startDate = ?, endDate = ?, deadline = ?
            WHERE id = ?
        `;
        const values = [employeeId, task, note, startDate, endDate, deadline, id];

        const [result]: any = await pool.query(query, values);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "No changes made!" });
            return;
        }

        //  Fetch updated todo details
        const [updatedTodo]: any = await pool.query(`
            SELECT t.id, l.name AS employeeName, t.task, t.note, t.startDate, t.endDate, t.deadline
            FROM todo t 
            JOIN login l ON l.id = t.employeeId
            WHERE t.id = ? order by date desc`
            , [id]);

        //  Send success response
        res.status(200).json({
            message: "Todo updated successfully!",
            ...updatedTodo[0]
        });

    } catch (error) {
        console.error(" Error Updating Todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const deleteTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        //  Check if the todo exists
        const [todo]: any = await pool.query(
            "SELECT * FROM todo WHERE id = ?",
            [id]
        );

        if (todo.length === 0) {
            res.status(404).json({ message: "Todo not found!" });
            return;
        }

        //  Soft delete: Update `todoStatus` to 'N'
        const query = `UPDATE todo SET todoStatus = 'N' WHERE id = ?`;
        await pool.query(query, [id]);

        res.status(200).json({ message: "Todo deleted successfully!" });

    } catch (error) {
        console.error(" Error deleting todo:", error);
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

        res.status(200).send(
            result
        )
    } catch (error) {
        console.error(" Error fetching progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }

}



export const addProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, projectId } = req.params; //  Get IDs directly from URL parameters
        const { date, note } = req.body;

        //  Validate required fields before inserting progress
        if (!employeeId || !projectId || !date || !note) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        //  Check if Employee Exists
        const [user]: any = await pool.query("SELECT id FROM login WHERE id = ?", [employeeId]);
        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }

        //  Check if Project Exists
        const [project]: any = await pool.query("SELECT id FROM projects WHERE id = ?", [projectId]);
        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }

        //  Insert into `progress` table
        const query = `
            INSERT INTO progress (employeeId, projectId, date, note) 
            VALUES (?, ?, ?, ?)
        `;
        await pool.query(query, [employeeId, projectId, date, note]);

        //  Fetch the newly added progress
        const [seeProgress]: any = await pool.query(
            `SELECT prg.employeeId, prg.projectId, l.name AS employeeName, 
                    pro.projectName, prg.note, prg.date
             FROM progress prg
             JOIN login l ON l.id = prg.employeeId
             JOIN projects pro ON prg.projectId = pro.id
             WHERE prg.employeeId = ? AND prg.projectId = ?
             ORDER BY prg.date DESC LIMIT 1`, 
            [employeeId, projectId]
        );

        res.status(201).json({
            message: "Progress added successfully!",
             ...seeProgress[0]
        });

    } catch (error) {
        console.error(" Error adding progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



// alterProgress (Update Progress by ID)
export const alterProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, projectId, id } = req.params;
        const { date, note } = req.body;

        const [existingProgress]: any = await pool.query(`select * from progress where id = ?`,  [id]);
        if(existingProgress.lenght===0){
            res.send({message: "Progress Not Found!"})
            return;
        }


        const query = `UPDATE progress SET employeeId = ?, projectId = ?, date = ?, note = ? WHERE id = ?`;
        const values = [employeeId, projectId, date, note, id];
        await pool.query(query, values);

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
        console.error(" Error updating progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//deleteProgress
export const deleteProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        //  Check if the todo exists
        const [progress]: any = await pool.query(
            "SELECT * FROM progress WHERE id = ?",
            [id]
        );

        if (progress.length === 0) {
            res.status(404).json({ message: "progress not found!" });
            return;
        }

        //  Soft delete: Update `todoStatus` to 'N'
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
        console.error(" Error deleting progress:", error);
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

        res.status(200).send(result);
    } catch (error) {
        console.error(" Error fetching sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



export const addSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, projectId } = req.params; //  Get IDs directly from URL parameters

        //  Validate required fields before inserting sales record
        if (!customerId || !projectId) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        //  Check if Customer Exists
        const [customer]: any = await pool.query("SELECT id FROM customers WHERE id = ?", [customerId]);
        if (customer.length === 0) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }

        //  Check if Project Exists
        const [project]: any = await pool.query("SELECT id FROM projects WHERE id = ?", [projectId]);
        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }

        //  Insert into `sales` table
        const query = `
            INSERT INTO sales (customerId, projectId) 
            VALUES (?, ?)
        `;
        await pool.query(query, [customerId, projectId]);

        //  Fetch the newly added sales record
        const [getresult]: any = await pool.query(
            `SELECT 
                s.id,
                s.customerId,
                c.customerName,
                s.projectId,
                p.projectName,
                s.salesStatus
             FROM sales s
             JOIN customers c ON s.customerId = c.id
             JOIN projects p ON s.projectId = p.id
             WHERE s.customerId = ? AND s.projectId = ?
             ORDER BY s.id DESC LIMIT 1`,
            [customerId, projectId]
        );

        res.status(201).json({
            message: "Sales report added successfully!",
            ...getresult[0]
        });

    } catch (error) {
        console.error(" Error adding sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





export const alterSalesData = async (req: Request, res: Response): Promise<void> => {
    try {
        const {customerId, projectId, id } = req.params; // Sales ID from URL parameter

        const [existingSale]: any = await pool.query(`SELECT * FROM sales WHERE id = ?`, [id]);

        let result;
        if (existingSale.length > 0) {
            //  If sale exists, update it
            const updateQuery = `UPDATE sales SET customerId = ?, projectId = ? WHERE id = ?`;
            result = await pool.query(updateQuery, [customerId, projectId, id]);
        }
        

        //  Fetch updated sales record
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
            WHERE s.id = ? 
            `, [id]);

        res.status(200).json({
            message: existingSale.length > 0 ? "Sales record updated successfully!" : "Sales record added successfully!",
            ...getResult[0]
        });

    } catch (error) {
        console.error(" Error adding/updating sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        //  Check if the todo exists
        const [sale]: any = await pool.query(
            "SELECT * FROM sales WHERE id = ?",
            [id]
        );

        if (sale.length === 0) {
            res.status(404).json({ message: "progress not found!" });
            return;
        }

        //  Soft delete: Update `todoStatus` to 'N'
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
        console.error(" Error deleting progress:", error);
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

        res.status(200).send(result);
    } catch (error) {
        console.error(" Error fetching payments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



export const addPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { paymentMethod, description, amount, date } = req.body;

        if (!id || !paymentMethod || !amount || !date) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        const [customer]: any = await pool.query("SELECT id FROM customers WHERE id = ?", [id]);
        if (customer.length === 0) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }

        const query = `
            INSERT INTO payments (paymentMethod, customerId, description, amount, date) 
            VALUES (?, ?, ?, ?, ?)
        `;
        await pool.query(query, [paymentMethod, id, description || null, amount, date]);

        const [addedPayments]: any = await pool.query(
            `SELECT 
                p.paymentMethod, 
                p.customerId, 
                c.customerName, 
                p.description, 
                p.amount, 
                p.date
             FROM payments p
             JOIN customers c ON p.customerId = c.id
             WHERE p.customerId = ?
             ORDER BY p.date DESC LIMIT 1`,
            [id]
        );

        res.status(201).json({
            ...addedPayments[0]
        })

    } catch (error) {
        console.error(" Error adding payment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const alterPayments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, id } = req.params; 
        const { paymentMethod, description, amount, date } = req.body; 
        console.log("cusomterid:", customerId , " id: " , id , date, amount)

        //  Check if the payment record exists
        const [existingPayment]: any = await pool.query(`SELECT * FROM payments WHERE id = ?`, [id]);

        if (existingPayment.length === 0) {
            res.status(404).json({ message: "Payment record not found!" });
            return;
        }


        const updateQuery = `
            UPDATE payments 
            SET paymentMethod = ?, customerId = ?, description = ?, amount = ?, date = ?
            WHERE id = ?
        `;
        const values = [paymentMethod, customerId, description, amount, date, id];

        await pool.query(updateQuery, values);

        //  Fetch the updated payment record
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
        console.error(" Error updating payment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export const deletePayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        //  Check if the todo exists
        const [sale]: any = await pool.query(
            "SELECT * FROM payments WHERE id = ?",
            [id]
        );

        if (sale.length === 0) {
            res.status(404).json({ message: "payments not found!" });
            return;
        }

        //  Soft delete: Update `todoStatus` to 'N'
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
        console.error(" Error deleting progress:", error);
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

        //  Bypass TypeScript's strict session type checking
        const sessionData: any = req.session;

        if (!sessionData.cart) {
            sessionData.cart = [];
        }

        sessionData.cart.push({ description, QTY, UnitPrice });

        res.status(200).json({ ...sessionData.cart[0] });
    } catch (error) {
        console.error(" Error adding to cart:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};



export const addQuotation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId } = req.params;
        const { date, taxRate, shippingHandling } = req.body;
        const sessionData: any = req.session;

        if (!sessionData.cart || sessionData.cart.length === 0) {
            res.status(400).json({ message: "Cart is empty! Add products first." });
            return;
        }

        const [id]: any = await pool.query(`select id from invoiceno`);
        let invoiceId = id[0].id;
        console.log(id);

        //  Fetch the latest invoice number
        const [latestQuotation]: any = await pool.query("SELECT quotationNo FROM invoiceno");
        if (latestQuotation.length===0) {
            res.status(400).json({ message: "No invoice record found!" });
            return;
        }

        let QuotationNo = latestQuotation[0].quotationNo;
        let nextInvoiceNo = QuotationNo; //  Corrected Invoice Increment
        nextInvoiceNo++
        console.log("incremented iD:", nextInvoiceNo);
        const values: any[] = [];
        let subTotal = 0;

        //  Process Cart Items
        for (let item of sessionData.cart) {
            const itemSubTotal = item.QTY * item.UnitPrice;
            subTotal += itemSubTotal;
            values.push([`QT-${QuotationNo}`, item.description, item.QTY, item.UnitPrice, itemSubTotal]);
        }

        //  Ensure the `invoiceno` exists before inserting into `quotationdetail`
        await pool.query(
            `INSERT INTO quotationdetail (invoiceno, description, QTY, UnitPrice, subtotal) VALUES ?`,
            [values]
        );

        //  Validate Customer Exists
        const [customer]: any = await pool.query("SELECT id FROM customers WHERE id = ?", [customerId]);
        if (!customer.length) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }

        //  Calculate Total Amounts
        const totalTax = (subTotal * taxRate) / 100;
        const totalBill = subTotal + totalTax + shippingHandling;

        //  Insert Quotation Data
        await pool.query(
            `INSERT INTO quotation (customerId, date, subTotal, taxRate, totalTax, shippingHandling, totalBill, invoiceno)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [customerId, date, subTotal, taxRate, totalTax, shippingHandling, totalBill, `QT-${QuotationNo}`]
        );

        //  Update existing invoice instead of inserting a new one
        const [check]:any = await pool.query(
            `UPDATE invoiceno SET quotationNo = ? WHERE id = ?`, 
            [nextInvoiceNo, invoiceId ]
        );
        console.log("newinvoice: " , nextInvoiceNo , "QuotationNo: " , invoiceId)

        //  Fetch Updated Quotation Data
        const [getSavedData]: any = await pool.query(
            `SELECT q.*, c.*, i.*
            FROM quotation q
             LEFT JOIN customers c ON q.customerId = c.id
             LEFT JOIN invoiceno i ON i.id = q.invoiceno
             WHERE q.quotationStatus = 'Y'`
        );

        //  Clear Session Cart
        sessionData.cart = [];

        res.status(200).json({
            ...getSavedData[0]
                });

    } catch (error) {
        console.error(" Error finalizing quotation:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};






export const getQuotations = async (req: Request, res: Response): Promise<void> => {
    try {

        const entry = parseInt(req.params.entry, 10);
        console.log(entry);
        const limit = !isNaN(entry) && entry > 0 ? entry : 10;

        const [result]:any = await pool.query(`SELECT q.*, c.*, i.*
            FROM quotation q
             LEFT JOIN customers c ON q.customerId = c.id
             LEFT JOIN invoiceno i ON i.id = q.invoiceno
             WHERE q.quotationStatus = 'Y'
            LIMIT ?`,  [limit]);

        if(result.lenght ===0){
            res.send({message: "no quotation found!"})
        }

        res.status(200).send(result);
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

        //  Step 1: Ensure `invoiceNo` exists
        const [existingInvoice]: any = await pool.query("SELECT * FROM invoiceno WHERE id = ?", [invoiceNo]);
        if (existingInvoice.length === 0) {
            res.status(404).json({ message: "Invoice not found!" });
            return;
        }

        //  Step 2: Fetch `customerId` using `customerName`
        const [customer]: any = await pool.query("SELECT id FROM customers WHERE customerName = ?", [customerName]);
        if (customer.length === 0) {
            res.status(404).json({ message: "Customer not found!" });
            return;
        }
        const customerId = customer[0].id;

        //  Step 3: Delete Existing `quotationDetail` Entries for This Invoice
        await pool.query("DELETE FROM quotationDetail WHERE invoiceNo = ?", [invoiceNo]);

        //  Step 4: Insert Updated `quotationDetail` Records
        const subtotal = QTY * UnitPrice; //  Calculate subtotal
        await pool.query(
            `INSERT INTO quotationDetail (invoiceNo, description, QTY, UnitPrice, subtotal) VALUES (?, ?, ?, ?, ?)`,
            [invoiceNo, description, QTY, UnitPrice, subtotal]
        );

        //  Step 5: Calculate `subTotal`, `totalTax`, and `totalBill`
        const totalTax = (subtotal * taxRate) / 100;
        const totalBill = subtotal + totalTax + shippingHandling;

        //  Step 6: Update `quotation` Table
        await pool.query(
            `UPDATE quotation 
            SET customerId = ?, date = ?, subTotal = ?, taxRate = ?, totalTax = ?, shippingHandling = ?, totalBill = ?
            WHERE invoiceNo = ?`,
            [customerId, date, subtotal, taxRate, totalTax, shippingHandling, totalBill, invoiceNo]
        );

        //  Fetch Updated Data
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
        console.error(" Error updating quotation:", error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};



// deleteQuotation
export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        //  Check if the quotation exists
        const [existingQuotation]: any = await pool.query(`SELECT * FROM quotation WHERE id = ?`, [id]);
        if (existingQuotation.length === 0) {
            res.status(404).json({ message: "No quotation found!" });
            return;
        }

        //  Soft delete: Update `quotationDetailStatus` & `status` to 'N'
        const [query]: any = await pool.query(
            `UPDATE quotationdetail SET quotationDetailStatus = 'N' WHERE id = ?`, 
            [id]
        );

        const [query2]: any = await pool.query(
            `UPDATE quotation SET quotationStatus = 'N' WHERE id = ?`, 
            [id]
        );

        //  Check if any row was affected
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
        console.error(" Error deleting quotation:", error);
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
        console.error(" Error fetching categories:", error);
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
        console.error(" Error Adding expenseCategory:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
    
}




export const alterExpenseCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { categoryName } = req.body;

        //  Ensure required fields are provided
        if (!categoryName) {
            res.status(400).json({ message: "Please provide the category name!" });
            return;
        }

        //  Check if category exists
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM expenseCategory WHERE id = ?",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "expenseCategory not found!" });
            return;
        }

        //  Update category in the database
        const updateQuery = `UPDATE expenseCategory SET categoryName = ? WHERE id = ?`;
        const values = [categoryName, id];

        await pool.query(updateQuery, values);

        //  Fetch updated category data
        const [updatedCategory]: any = await pool.query(
            "SELECT * FROM expenseCategory WHERE id = ?",
            [id]
        );

        //  Send success response
        res.status(200).json({
            message: "Category updated successfully!",
            ...updatedCategory[0]
        });

    } catch (error) {
        console.error(" Error updating category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const deleteExpenseCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        //  Check if category exists and is active
        const [existingCategory]: any = await pool.query(
            "SELECT * FROM expenseCategory WHERE id = ? AND categoryStatus = 'Y'",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found or already disabled!" });
            return;
        }


        //  Update `categoryStatus` from 'Y' to 'N' (Soft Delete)
        const updateQuery = `UPDATE expenseCategory SET categoryStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        //  Send success response
        res.status(200).json({
            message: "Category successfully disabled (soft deleted)!"
        });

    } catch (error) {
        console.error(" Error disabling category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// getExpense
export const getExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `select * from expenses where expenseStatus = 'Y'`;
        const [result]:any = await pool.query(query);

        if(!result){
            res.send({message:"no Expense Found!"});
            return;
        }

        res.status(200).send(result)
    } catch (error) {
        console.error(" Error fetching expense List:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




// addExpense
export const addExpense = async (req: Request, res: Response): Promise<void> => {
    try {
    const { expenseCategoryId } = req.params;
    const {expenseName,  addedBy, date } = req.body;

     const query = `insert into expenses (expenseName, expenseCategoryId, addedBy, date )
     values (?, ?, ?, ?)`;

    const values  =[expenseName, expenseCategoryId, addedBy, date];

    const [results]: any = await pool.query( query, values);

    res.status(200).send({message: "Expense Added Successfully!",
        ...results[0]
        })

    } catch (error) {
        console.error(" Error adding expense:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const {expenseCategoryId, id} = req.params;
        const { expenseName,  addedBy, date } = req.body;

        const [existingExpense]: any = await pool.query(
            "SELECT * FROM expenses WHERE id = ?", 
            [id]
        );
        if (existingExpense.length === 0) {
            res.status(404).json({ message: "Expense not found!" });
            return;
        }

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
        console.error(" Error updating expense:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


// deleteExpense
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        const [existingCategory]: any = await pool.query(
            "SELECT * FROM expenses WHERE id = ? AND expenseStatus = 'Y'",
            [id]
        );

        if (existingCategory.length === 0) {
            res.status(404).json({ message: "Category not found or already disabled!" });
            return;
        }


        const updateQuery = `UPDATE expenses SET expenseStatus = 'N' WHERE id = ?`;
        await pool.query(updateQuery, [id]);

        res.status(200).json({
            message: "Category successfully disabled (soft deleted)!"
        });

    } catch (error) {
        console.error(" Error disabling category:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const getSalaryInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const [result]:any = await pool.query( `select s.* , l.name
            from configureSalaries s
            join login l on
            s.userId = l.id`
        );

        res.status(200).send(result)
    } catch (error) {
        console.error(" Error fetching information:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const configureSalary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { monthlySalary, overtimeAllowance, projectAllowance, bonusAllowance, medicalAllowance, date, wefDate, wefStatus } = req.body;

        if (!id || !monthlySalary || !date || !wefDate || !wefStatus) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        const [employee]: any = await pool.query("SELECT id FROM login WHERE id = ?", [id]);
        if (employee.length === 0) {
            res.status(404).json({ message: "Employee not found!" });
            return;
        }

        const query = `
            INSERT INTO configureSalaries(employeeId, monthlySalary, overtimeAllowance, projectAllowance, bonusAllowance, 
                medicalAllowance, date, wefDate, wefStatus) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result]: any = await pool.query(query, [id, monthlySalary, overtimeAllowance, projectAllowance, bonusAllowance, medicalAllowance, date, wefDate, wefStatus]);

        res.status(201).json({
            ...result[0]
        });

    } catch (error) {
        console.error(" Error adding information:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// addCalendarSession
export const addCalendarSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startingMonth } = req.body;

        //  Extract Year
        const [extractYear]: any = await pool.query(`SELECT YEAR(?) AS year`, [startingMonth]);
        const year = extractYear[0]?.year;

        if (!year) {
            res.status(400).json({ message: "Invalid starting month provided!" });
            return;
        }

        const monthMap: { [key: string]: number } = {
            january: 1, february: 2, march: 3, april: 4,
            may: 5, june: 6, july: 7, august: 8,
            september: 9, october: 10, november: 11, december: 12
        };

        const [extractMonth]: any = await pool.query(`SELECT MONTH(?) AS month`, [startingMonth]);
        let monthNum = extractMonth[0]?.month;

        if (!monthNum) {
            res.status(400).json({ message: "Invalid starting month provided!" });
            return;
        }

        //  Loop to Insert 12 Months
        for (let i = 0; i < 12; i++) {
            const currentMonth = (monthNum + i - 1) % 12 + 1; // Get month number (1-12)
            const monthName = Object.keys(monthMap).find(key => monthMap[key] === currentMonth); // Get month name

            await pool.query(
                `INSERT INTO calendarSession (year, month) VALUES (?, ?)`, 
                [year, monthName]
            );
        }

        res.status(200).json({ message: "12-month calendar session added successfully!" });

    } catch (error) {
        console.error(" Error adding information:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const salaryCycle = async (req: Request, res: Response): Promise<void> => {
    try {
        const { year, month } = req.body;

        const convertToDate = (year: string, monthName: string): string | null => {
            const monthMap: { [key: string]: string } = {
                january: "01", february: "02", march: "03", april: "04",
                may: "05", june: "06", july: "07", august: "08",
                september: "09", october: "10", november: "11", december: "12"
            };

            const monthLower = monthName.toLowerCase(); // Convert to lowercase for matching
            const monthNum = monthMap[monthLower]; // Find corresponding number

            return monthNum ? `${year}-${monthNum}-01` : null; // Return YYYY-MM-DD or null
        };

        const cycleDate = convertToDate(year, month);
        if (!cycleDate) {
            res.status(400).json({ message: "Invalid month name provided!" });
            return;
        }

        const [sessionCheck]: any = await pool.query(
            `SELECT id, calendarStatus FROM calendarSession WHERE year = ? AND month = ?`,
            [year, month]
        );

        if (!sessionCheck.length) {
            res.status(400).json({ message: "Cycle is expired, enter a new cycle." });
            return;
        }

        const [users]: any = await pool.query(`SELECT id FROM login`);
        if (!users.length) {
            res.status(404).json({ message: "No users found!" });
            return;
        }

        for (const user of users) {
            const userId = user.id;

            const [salaryData]: any = await pool.query(
                `SELECT total FROM configureSalaries WHERE userId = ?`, 
                [userId]
            );

            if (!salaryData.length) {
                console.log(`⚠️ No salary configured for user ${userId}, skipping...`);
                continue; 
            }

            const totalAmount = salaryData[0].total;

            const [existingCycle]: any = await pool.query(
                `SELECT id FROM salaryCycle WHERE userId = ? AND date = ?`, 
                [userId, cycleDate]
            );

            if (existingCycle.length > 0) {
                console.log(`⚠️ Salary cycle for user ${userId} in ${month}-${year} already exists, skipping...`);
                continue;
            }

            const balance  = totalAmount +  0.00;

            await pool.query(
                `INSERT INTO salaryCycle (userId, totalAmount, paidAmount, balance, date) VALUES (?, ?, ?, ?, ?)`, 
                [userId, totalAmount, 0.00, balance, cycleDate]
            );

            console.log(`Salary cycle added for user ${userId} - ${month} ${year}`);
        }

        await pool.query(
            `UPDATE calendarSession SET calendarStatus = 'Active' WHERE year = ? AND month = ?`,
            [year, month]
        );

        res.status(200).json({ message: "Salary Cycle processed successfully for all users!" });

    } catch (error) {
        console.error(" Error processing Salary Cycle:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



// getTimeConfigured
export const getTimeConfigured = async (req: Request, res: Response): Promise<void> => {
       try {
        const [query]: any = await pool.query(`select * from configuretime where status = 'Y'`);
        if(!query){
            res.send({message: "No Entry Found!"})
            return;
        } 

        res.status(200).send(query)
       } catch (error) {
        console.error(" Error Fetching Time:", error);
        res.status(500).json({ message: "Internal Server Error" });
       }
}




export const configureTime = async (req: Request, res: Response): Promise<void> => {
    try {
        const {configureType ,configureTime} = req.body;

        if(!configureType || !configureTime){
            res.send({message: "Please provide all the fields!"});
            return;
        }

        const  [query]: any = await pool.query(`insert into configuretime (configureType, configureTime)
            values (?, ?)`, [configureType, configureTime]);

            const [getEnty]:any  = await pool.query(`select * from configuretime order by configureTime desc`);

        res.status(200).send({message: "time configured successfully!",
            ...getEnty[0]
        })
    } catch (error) {
        console.error(" Error configuring time:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




// updateTime
export const updateTime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const {configureType, configureTime}  = req.body;
        if(!configureType || !configureTime){
            res.send({message: "Please provide all the fields!"});
            return;
        }

        const [checkExisting]: any = await pool.query(`select * from configuretime where id = ?` , [id]);
        if(checkExisting.lenght===0){
            res.send({message: "No record found!"})
        }

        const [getEnty]:any = await pool.query("select * from configuretime where id = ? ", [id]);

        const [query]:any  = await pool.query(`update configuretime set configureType = ? , configureTime  = ? where id = ?`, [configureType, configureTime, id]);
        res.status(200).send({message: "time updated successfully!",
            ...getEnty[0]
        })

    } catch (error) {
        console.error(" Error updating time:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const deleteTime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        if(!id){
            res.send({message: "No Entry found for this Id!"})
            return;
        }

        const [query]: any = await pool.query(`update configuretime set status = 'N' where id = ?`, [id]);

        res.status(200).send({message: "Success deleting the entry!",
            ...query[0]
        })
    } catch (error) {
        console.error(" Error deleting time:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}




export const withdrawSalary = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { paymentMethod, withdrawAmount, paidBy } = req.body;

        // Fetch latest invoice number
        const [invoice]: any = await pool.query(`SELECT employeeInvoice, id FROM invoiceno ORDER BY id DESC LIMIT 1`);
        let newInvoice = invoice.length > 0 ? invoice[0].employeeInvoice : 0;
        let invoiceId = invoice.length > 0 ? invoice[0].id : null;
        
        newInvoice++; // Increment invoice number

        if (!id || !paymentMethod || !withdrawAmount || !paidBy) {
            res.status(400).send({ message: "Enter all fields!" });
            return;
        }

        // Fetch the latest balance (instead of using an outdated one)
        const [totalAmount]: any = await pool.query(
            `SELECT * FROM salaryCycle WHERE userId = ? ORDER BY id DESC LIMIT 1`, 
            [id]
        );

        if (!totalAmount.length) {
            res.status(404).send({ message: "User not found!" });
            return;
        }

        let balance = Number(totalAmount[0].balance);
        let calculateWithdraw = Number(totalAmount[0].withdrawAmount);
        let totalWithdrawAmount = calculateWithdraw + Number(withdrawAmount);
        let getTotalAmount = totalAmount[0].totalAmount;
        let getPaidAmount = totalAmount[0].paidAmount;
        let date = totalAmount[0].date;

        const remainingAmount = balance - withdrawAmount;

        // Insert new withdrawal record
        const [query]: any = await pool.query(
            `INSERT INTO salaryCycle (userId, totalAmount, paidAmount, date, balance, paymentMethod, withdrawAmount, paidBy, invoiceId) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,  
            [id, getTotalAmount, getPaidAmount, date, remainingAmount, paymentMethod, totalWithdrawAmount, paidBy, `WD-${newInvoice}`]
        );

        // Update invoice number
        if (invoiceId !== null) {
            await pool.query(`UPDATE invoiceno SET employeeInvoice = ? WHERE id = ?`, [newInvoice, invoiceId]);
        }

        res.status(200).send({
            message: `Success!${remainingAmount < 0 ? ` Your Loan: ${Math.abs(remainingAmount)}` : ''}`,
            transactionId: query.insertId
        });

    } catch (error) {
        console.error(" Error in taking Withdraw:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




export const refundAmount = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { paymentMethod, refundAmount, depositedBy } = req.body;

        if ( !paymentMethod || !refundAmount || !depositedBy) {
            res.status(400).send({ message: "Enter Required Fields to Continue!" });
            return;
        }

        console.log(paymentMethod, refundAmount, depositedBy);

        // Fetch latest invoice number
        const [invoice]: any = await pool.query(
            `SELECT employeeInvoice, id FROM invoiceno ORDER BY id DESC LIMIT 1`
        );
        
        let newInvoice = invoice.length > 0 ? invoice[0].employeeInvoice : 0;
        let invoiceId = invoice.length > 0 ? invoice[0].id : null;
        
        newInvoice++; // Increment invoice number

        // Fetch the latest balance (instead of using an outdated one)
        const [latestEntry]: any = await pool.query(
            `SELECT balance, refundAmount, totalAmount, paidAmount, date 
             FROM salaryCycle 
             WHERE userId = ? 
             ORDER BY id DESC 
             LIMIT 1`, 
            [id]
        );

        if (!latestEntry.length) {
            res.status(404).send({ message: "User not found!" });
            return;
        }

        let previousBalance = Number(latestEntry[0].balance);
        let previousRefundAmount = Number(latestEntry[0].refundAmount);
        let getTotalAmount = latestEntry[0].totalAmount;
        let getPaidAmount = latestEntry[0].paidAmount;
        let date = latestEntry[0].date;

        const refundAmountNum = Number(refundAmount);
        const newBalance = previousBalance + refundAmountNum;
        const refundAmountSum = previousRefundAmount + refundAmountNum;

        console.log("Previous Refund:", previousRefundAmount, "New Refund:", refundAmountNum, "Total Refund:", refundAmountSum);

        // Insert new refund entry
        const [query]: any = await pool.query(
            `INSERT INTO salaryCycle (userId, totalAmount, paidAmount, date, balance, paymentMethod, refundAmount, depositedBy, invoiceId) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,  
            [id, getTotalAmount, getPaidAmount, date, newBalance, paymentMethod, refundAmountSum, depositedBy, `RF-${newInvoice}`]
        );

        // Update invoice number
        if (invoiceId !== null) {
            await pool.query(`UPDATE invoiceno SET employeeInvoice = ? WHERE id = ?`, [newInvoice, invoiceId]);
        }

        res.status(200).send({
            message: `Success! Refund of ${refundAmountNum} added. New balance: ${newBalance}`,
            transactionId: query.insertId
        });

    } catch (error) {
        console.error(" Error in Refunding Amount:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




// salesReport
export const salesReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, projectId } = req.query;

        let query = `SELECT * FROM sales WHERE salesStatus = 'Y'`;
        let queryParams: any[] = [];

        if (customerId) {
            query += ` AND customerId = ?`;
            queryParams.push(customerId);
        }

        if (projectId) {
            query += ` AND projectId = ?`;
            queryParams.push(projectId);
        }

        const [result]: any = await pool.query(query, queryParams);

        if (result.length === 0) {
            res.status(404).json({ message: "No sales found!" });
            return;
        }

        res.status(200).json({
            status: 200,
            message: "Sales fetched successfully!",
            sales: result
        });

    } catch (error) {
        console.error(" Error fetching sales:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};






export const progressReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const filter = req.query; // Already an object, no need to await

        let query = `SELECT * FROM progress WHERE progressStatus = 'Y'`;
        let queryParams: any[] = [];

        if (filter.employeeId) {
            query += ` AND employeeId = ?`;
            queryParams.push(filter.employeeId);
        }
        if (filter.projectId) {
            query += ` AND projectId = ?`;
            queryParams.push(filter.projectId);
        }
        if (filter.date) {
            query += ` AND date = ?`;
            queryParams.push(filter.date);
        }

        const [result]: any = await pool.query(query, queryParams);

        if (result.length === 0) {
            res.status(404).json({ message: "No progress records found!" });
            return;
        }

        res.status(200).json({
            status: 200,
            message: "Progress fetched successfully!",
            progress: result
        });

    } catch (error) {
        console.error(" Error fetching progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





// attendanceReport
export const attendanceReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, date, day, fromDate, toDate } = req.query;
        let queryParams: any[] = [];

        let query = `SELECT 
                        userId, 
                        CONVERT_TZ(date, '+00:00', @@session.time_zone) AS date, 
                        clockIn, 
                        clockOut, 
                        day, 
                        status, 
                        attendanceStatus, 
                        leaveApprovalStatus, 
                        workingHours,
                        id
                    FROM attendance 
                    WHERE status = 'Y'`;

        if (userId) {
            query += ` AND userId = ?`;
            queryParams.push(userId);
        }
        if (date) {
            query += ` AND date = ?`;
            queryParams.push(date);
        }
        if (day) {
            query += ` AND day = ?`;
            queryParams.push(day);
        }
        if (fromDate && toDate) {
            query += ` AND date BETWEEN ? AND ?`;
            queryParams.push(fromDate, toDate);
        }

        query += ` ORDER BY date DESC`;

        const [result]: any = await pool.query(query, queryParams);

        if (result.length === 0) {
            res.status(404).json({ status: 404, message: "No attendance records found" });
            return;
        }

        res.status(200).json(result);

    } catch (error) {
        console.error(" Error fetching attendance:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};





// paymentReport
export const paymentReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const {customerId, date, fromDate, toDate} = req.query; 
        let query  = `select * from payments where paymentStatus = 'Y'`;
        const [result]:any = await pool.query(query);
        let queryParams: any[] = [];


        if (customerId) {
            query += ` AND customerId = ?`;
            queryParams.push(customerId);
        }
        if (date) {
            query += ` AND date = ?`;
            queryParams.push(date);
        }
      
        if (fromDate && toDate) {
            query += ` AND date BETWEEN ? AND ?`;
            queryParams.push(fromDate, toDate);
        }


        if(result.length ===0){
            res.send({message:"no payments found!"})
            return;
        }

        res.status(200).send(result)
    } catch (error) {
        console.error(" Error fetching payments:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





// expenseReport
export const expenseReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const {date} = req.query;
        let queryParams: any[] = [];
        let query = `select * from expenses where expenseStatus = 'Y'`;
        const [result]:any = await pool.query(query);

        if(date){
            query += ` AND date = ?`;
            queryParams.push(date);        
        }

        if(!result){
            res.send({message:"no Expense Found!"});
            return;
        }

        res.status(200).send(result)
    } catch (error) {
        console.error(" Error fetching expense List:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



//it Ends here!



export const searchPosition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, position } = req.query;

    if (!employeeId && !position) {
      res.status(400).json({ message: 'Please provide employeeId or position to search.' });
      return;
    }

    let query = "SELECT * FROM `position` WHERE status = 'Y'";
    const params: any[] = [];

    if (employeeId) {
      query += ' AND employeeId = ?';
      params.push(employeeId);
    }

    if (position) {
      query += ' AND `position` LIKE ?';
      params.push(`%${position}%`);
    }

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error('Error during search:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};





export const addPosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const {employeeId, position} = req.body;
        if (!employeeId || !position) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        }

        const [insertQuery]:any = await pool.query("INSERT INTO `position` (employeeId, `position`) VALUES (?, ?)", [employeeId, position]);

        const id = insertQuery.insertId;

        const [result]: any = await pool.query(`SELECT * FROM position WHERE id = ?`, [id]);
        if (result.length === 0) {
            res.status(404).send({ message: "Position not found!" });
            return;
        }   

        res.status(200).send({...result[0]})

        if (insertQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to add position!" });
            return;
        }   
        
    } catch (error) {
        console.error(" Error adding position of the user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;

        if (!userId) {
            res.status(400).send({ message: "User ID is required!" });
            return;
        } 

        const [user]: any = await pool.query(`SELECT * FROM login WHERE id = ? and loginStatus = 'Y'`, [userId]);
        if (user.length === 0) {    
            res.status(404).send({ message: "User not found!" });
            return;
        }   


        res.status(200).send({...user[0]});

    } catch (error) {
        console.error(" Error fetching user by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const updatePosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { employeeId, position } = req.body;

        if (!id || !employeeId || !position) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        }   

        const [existingPosition]: any = await pool.query(`SELECT * FROM position WHERE id = ?`, [id]);
        if (existingPosition.length === 0) {
            res.status(404).send({ message: "Position not found!" });
            return;
        }

        const [updateQuery]: any = await pool.query(
            "UPDATE `position` SET employeeId = ?, `position` = ? WHERE id = ?", 
            [employeeId, position, id]
        );  
        if (updateQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to update position!" });
            return;
        }
        const [result]: any = await pool.query(`SELECT * FROM position WHERE id = ?`, [id]);

        res.status(200).send({...result[0], message: "Position updated successfully!"});

    } catch (error) {
        console.error(" Error updating position:", error);
        res.status(500).json({ message: "Internal Server Error" });
        
    }
}





export const deletePosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).send({ message: "Position ID is required!" });
            return;
        }   

        const [existingPosition]: any = await pool.query(`SELECT * FROM position WHERE id = ?`, [id]);
        if (existingPosition.length === 0) {
            res.status(404).send({ message: "Position not found!" });
            return;
        }

        const [deleteQuery]: any = await pool.query("update `position` set status = 'N' WHERE id = ?", [id]);
        if (deleteQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to delete position!" });
            return;
        }

        res.status(200).send({ message: "Position deleted successfully!" });

    } catch (error) {
        console.error(" Error deleting position:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};






export const getUserPosition = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.query.entry as string) || 10;
        const page = parseInt(req.query.page as string) || 1;

        const limit = Math.max(1, entry);
        const offset = (Math.max(1, page) - 1) * limit;        


        const [result]: any = await pool.query(`select * from position where status = 'Y' limit ? offset ?`, [limit, offset]);
        if (result.length === 0) {
            res.status(404).send({ message: "No positions found!" });
            return;
        }

        res.status(200).send(result);


    } catch (error) {
        console.error(" Error fetching users Positions:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const addSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const {supplierName, supplierAddress, supplierContact, supplierEmail} = req.body;

        if(!supplierName|| !supplierAddress || !supplierContact ||  !supplierEmail){
            res.send({message: "Provide All fields!"});
            return;
        }

        const [query]: any  = await pool.query(`insert into supplier (supplierName, supplierAddress, supplierContact, supplierEmail) values (? ,?, ?, ?)`, [supplierName, supplierAddress, supplierContact, supplierEmail]);

        const id  = query.insertId;

        if(!id){
            res.send({message: "Failed to add Supplier!"});
            return;
        }

        const [result] : any = await pool.query(`select * from supplier where id = ?`, [id]);


        res.status(200).send({...result[0]});
    } catch (error) {
        console.error(" Error adding Supplier:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}






export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.query.entry as string) || 10;
        const page = parseInt(req.query.page as string) || 1;

        const limit = Math.max(1, entry);
        const offset = (Math.max(1, page) - 1) * limit;        


        const [result]: any = await pool.query(`select * from supplier where supplierStatus = 'Y' limit ? offset ?`, [limit, offset]);
        if (result.length === 0) {
            res.status(404).send({ message: "No positions found!" });
            return;
        }

        res.status(200).send(result);


    } catch (error) {
        console.error(" Error fetching users Positions:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}







export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { supplierName, supplierAddress, supplierContact, supplierEmail } = req.body;

        if (!id || !supplierName || !supplierAddress || !supplierContact || !supplierEmail) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        }   

        const [existingPosition]: any = await pool.query(`SELECT * FROM supplier WHERE id = ?`, [id]);
        if (existingPosition.length === 0) {
            res.status(404).send({ message: "Position not found!" });
            return;
        }

        const [updateQuery]: any = await pool.query(
            "UPDATE supplier SET supplierName = ?, supplierAddress = ?, supplierContact = ?, supplierEmail = ? WHERE id = ?", 
            [supplierName, supplierAddress, supplierContact, supplierEmail, id]
        );  
        if (updateQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to update supplier info!" });
            return;
        }
        const [result]: any = await pool.query(`SELECT * FROM supplier WHERE id = ?`, [id]);

        res.status(200).send({...result[0], message: "Supplier updated successfully!"});

    } catch (error) {
        console.error(" Error updating Supplier:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}






export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).send({ message: "Supplier ID is required!" });
            return;
        }   

        const [existingSupplier]: any = await pool.query(`SELECT * FROM supplier WHERE id = ?`, [id]);
        if (existingSupplier.length === 0) {
            res.status(404).send({ message: "Supplier not found!" });
            return;
        }

        const [deleteQuery]: any = await pool.query("update supplier set supplierStatus = 'N' WHERE id = ?", [id]);
        if (deleteQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to delete Supplier!" });
            return;
        }

        res.status(200).send({ message: "Supplier deleted successfully!" });

    } catch (error) {
        console.error(" Error deleting Supplier:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};






export const getSupplierById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;

        if (!userId) {
            res.status(400).send({ message: "User ID is required!" });
            return;
        } 

        const [user]: any = await pool.query(`SELECT * FROM supplier WHERE id = ? and supplierStatus = 'Y'`, [userId]);
        if (user.length === 0) {    
            res.status(404).send({ message: "User not found!" });
            return;
        }


        res.status(200).send({...user[0]});

    } catch (error) {
        console.error(" Error fetching user by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}









export const searchSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      supplierName,
      supplierAddress,
      supplierContact,
      supplierEmail
    } = req.query;

    if (
      !supplierName &&
      !supplierAddress &&
      !supplierContact &&
      !supplierEmail
    ) {
      res.status(400).json({ message: 'Please provide at least one search field.' });
      return;
    }

    let query = 'SELECT * FROM `supplier` WHERE 1=1';
    const params: any[] = [];

    if (supplierName) {
      query += ' AND supplierName LIKE ?';
      params.push(`%${supplierName}%`);
    }

    if (supplierAddress) {
      query += ' AND supplierAddress LIKE ?';
      params.push(`%${supplierAddress}%`);
    }

    if (supplierContact) {
      query += ' AND supplierContact LIKE ?';
      params.push(`%${supplierContact}%`);
    }

    if (supplierEmail) {
      query += ' AND supplierEmail LIKE ?';
      params.push(`%${supplierEmail}%`);
    }

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error('Error searching suppliers:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};






export const addOvertime = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, time, date, description } = req.body;

        if (!employeeId || !time || !date || !description) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        }  

        const [todayOvertime]: any = await pool.query(`select * from overtime where employeeId = ? and date = CURRENT_DATE() and status = 'Y'`, [employeeId]);

        if (todayOvertime.length > 0) {
            res.send({ message: "You have already added overtime for this employee today!" });
            return;
        }

        const [query]: any = await pool.query(`insert into overtime (employeeId, time, date, description) values (?, ?, ?, ?)`, [employeeId, time, date, description]);

        const id = query.insertId;

        const [result]: any = await pool.query(`select * from overtime where status = 'Y' and id = ?`, [id]);

        res.status(200).send(result);

    } catch (error) {
        console.error('Error searching suppliers:', error);
        res.status(500).json({ message: 'Internal server error.' });   
    }
}






export const getOvertime = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.query.entry as string) || 10;
        const page = parseInt(req.query.page as string) || 1;

        const limit = Math.max(1, entry);
        const offset = (Math.max(1, page) - 1) * limit;        


        const [result]: any = await pool.query(`SELECT o.*, l.*  FROM overtime o join  login l on  l.id = o.employeeId WHERE  o.status = 'Y' limit ? offset ?`, [limit, offset]);
        if (result.length === 0) {
            res.status(404).send({ message: "No overtime for the employee found!" });
            return;
        }

        res.status(200).send(result);


    } catch (error) {
        console.error(" Error fetching users overtime:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const updateOvertime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { employeeId, time, date, description } = req.body;

        if (!id || !employeeId || !time || !date || !description) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        }   

        const [existingOvertime]: any = await pool.query(`SELECT * FROM overtime WHERE id = ?`, [id]);
        if (existingOvertime.length === 0) {
            res.status(404).send({ message: "Position not found!" });
            return;
        }

        const [updateQuery]: any = await pool.query(
            "UPDATE overtime SET employeeId = ?, time = ?, date = ?, description = ? WHERE id = ?", 
            [employeeId, time, date, description, id]
        );  
        if (updateQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to update overtime of user!" });
            return;
        }
        const [result]: any = await pool.query(`SELECT * FROM overtime WHERE id = ?`, [id]);

        res.status(200).send({...result[0], message: "Overtime updated successfully!"});

    } catch (error) {
        console.error(" Error updating overtime:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const deleteOvertime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).send({ message: "Overtime ID is required!" });
            return;
        }   

        const [existingOvertime]: any = await pool.query(`SELECT * FROM overtime WHERE id = ?`, [id]);
        if (existingOvertime.length === 0) {
            res.status(404).send({ message: "Existing Overtime not found!" });
            return;
        }

        const [deleteQuery]: any = await pool.query("update overtime set status = 'N' WHERE id = ?", [id]);
        if (deleteQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to delete overtime!" });
            return;
        }

        res.status(200).send({ message: "Overtime deleted successfully!" });

    } catch (error) {
        console.error(" Error deleting overtime:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};







export const getOvertimeById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;

        if (!userId) {
            res.status(400).send({ message: "Employee ID is required!" });
            return;
        } 

        const [user]: any = await pool.query(`SELECT o.*, l.*  FROM overtime o join  login l on  l.id = o.employeeId WHERE o.id = ? and status = 'Y'`, [userId]);
        if (user.length === 0) {    
            res.status(404).send({ message: "User not found!" });
            return;
        }


        res.status(200).send({...user[0]});

    } catch (error) {
        console.error(" Error fetching user by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}






export const searchOvertime = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, time, date, description } = req.query;

    if (!employeeId && !time && !date && !description) {
      res.status(400).json({ message: 'Please provide at least one search parameter.' });
      return;
    }

    let query = "SELECT o.*, l.*  FROM overtime o join  login l on  l.id = o.employeeId WHERE status = 'Y'";
    const params: any[] = [];

    if (employeeId) {
      query += ' AND employeeId = ?';
      params.push(employeeId);
    }

    if (time) {
      query += ' AND time = ?';
      params.push(time);
    }

    if (date) {
      query += ' AND `date` = ?';
      params.push(date);
    }

    if (description) {
      query += ' AND description LIKE ?';

      params.push(`%${description}%`);
    }

    const [rows]: any = await pool.query(query, params);

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error searching overtime:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};






export const addLoan = async (req: Request, res: Response): Promise<void> => {
    try {
        const {employeeId, loanAmount, installments, paidAmount, remainingAmount, applyDate, loanStatus} = req.body;
         if (!employeeId || !loanAmount || !installments || !paidAmount || !remainingAmount || !applyDate || !loanStatus) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        } 

        const [query]: any = await pool.query(`insert into loan (employeeId, loanAmount, installments, paidAmount, remainingAmount, applyDate, loanStatus) values (?, ?, ?, ?, ?, ?, ?)`, [employeeId, loanAmount, installments, paidAmount, remainingAmount, applyDate, loanStatus]);
        const id = query.insertId;

        const [result]: any = await pool.query(`select * from loan where id = ?`, [id]);
        console.log(id, result);
        res.status(200).send({...result[0]});
    } catch (error) {
        console.error('Error searching overtime:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}




export const getLoan = async (req: Request, res: Response): Promise<void> => {
    try {
        const entry = parseInt(req.query.entry as string) || 10;
        const page = parseInt(req.query.page as string) || 1;

        const limit = Math.max(1, entry);
        const offset = (Math.max(1, page) - 1) * limit;        


        const [result]: any = await pool.query(`SELECT lo.*, l.*  FROM loan lo join  login l on  l.id = lo.employeeId WHERE  lo.status = 'Y' limit ? offset ?`, [limit, offset]);
        if (result.length === 0) {
            res.status(404).send({ message: "No loan for the employee found!" });
            return;
        }

        res.status(200).send(result);


    } catch (error) {
        console.error(" Error fetching users overtime:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}






export const updateLoan = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { employeeId, loanAmount, installments, paidAmount, remainingAmount, applyDate, loanStatus } = req.body;

        if (!id || !employeeId || !loanAmount || !installments || !paidAmount || !remainingAmount || !applyDate || !loanStatus) {
            res.status(400).send({ message: "Please provide all fields!" });
            return;
        }   

        const [existingloan]: any = await pool.query(`SELECT * FROM loan WHERE id = ?`, [id]);
        if (existingloan.length === 0) {
            res.status(404).send({ message: "Loan for this user not found!" });
            return;
        }

        const [updateQuery]: any = await pool.query(
              `UPDATE loan 
                SET employeeId = ?, 
                loanAmount = ?, 
                installments = ?, 
                paidAmount = ?, 
                remainingAmount = ?, 
                applyDate = ?, 
                loanStatus = ?
                WHERE id = ?`,
            [employeeId, loanAmount, installments, paidAmount, remainingAmount, applyDate, loanStatus, id]
        );

        if (updateQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to update loan of user!" });
            return;
        }

        const [result]: any = await pool.query(`SELECT * FROM loan WHERE id = ?`, [id]);

        res.status(200).send({...result[0], message: "Loan updated successfully!"});

    } catch (error) {
        console.error(" Error updating overtime:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





export const deleteLoan = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).send({ message: "Loan ID is required!" });
            return;
        }   

        const [existingLoan]: any = await pool.query(`SELECT * FROM loan WHERE id = ?`, [id]);
        if (existingLoan.length === 0) {
            res.status(404).send({ message: "loan not found!" });
            return;
        }

        const [deleteQuery]: any = await pool.query("update loan set status = 'N' WHERE id = ?", [id]);
        if (deleteQuery.affectedRows === 0) {
            res.status(500).send({ message: "Failed to delete loan!" });
            return;
        }

        res.status(200).send({ message: "loan deleted successfully!" });

    } catch (error) {
        console.error(" Error deleting loan :", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};






export const searchLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      employeeId,
      loanAmount,
      installments,
      paidAmount,
      remainingAmount,
      applyDate,
      loanStatus
    } = req.query;

    if (
      !id &&
      !employeeId &&
      !loanAmount &&
      !installments &&
      !paidAmount &&
      !remainingAmount &&
      !applyDate &&
      !loanStatus
    ) {
      res.status(400).json({ message: 'Please provide at least one search parameter.' });
      return;
    }

    let query = "SELECT lo.*, l.* FROM loan lo JOIN login l ON l.id = lo.employeeId WHERE lo.status = 'Y' AND 1=1";
    const params: any[] = [];

    if (id) {
      query += ' AND id = ?';
      params.push(id);
    }

    if (employeeId) {
      query += ' AND employeeId = ?';
      params.push(employeeId);
    }

    if (loanAmount) {
      query += ' AND loanAmount = ?';
      params.push(loanAmount);
    }

    if (installments) {
      query += ' AND installments = ?';
      params.push(installments);
    }

    if (paidAmount) {
      query += ' AND paidAmount = ?';
      params.push(paidAmount);
    }

    if (remainingAmount) {
      query += ' AND remainingAmount = ?';
      params.push(remainingAmount);
    }

    if (applyDate) {
      query += ' AND applyDate = ?';
      params.push(applyDate);
    }

    if (loanStatus) {
      query += ' AND status = ?';
      params.push(loanStatus);
    }

    const [rows]: any = await pool.query(query, params);

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error searching loan:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};


