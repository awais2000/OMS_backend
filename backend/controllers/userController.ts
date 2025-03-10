import { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../database/db"; 




export const changePassword = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params; // ✅ Corrected: Extract `id` properly
      const { oldPassword, newPassword } = req.body;
  
      if (!id || !oldPassword || !newPassword) {
        res.status(400).json({
          status: 400,
          message: "Please provide user ID, old password, and new password!",
        });
        return;
      }
  
      // Fetch the stored password from the database
      const [rows]: any = await pool.query(
        `SELECT password FROM login WHERE id = ?`,
        [id]
      );
  
      if (rows.length === 0) {
        res.status(404).json({ status: 404, message: "User not found" });
        return;
      }
  
      const storedPassword = rows[0].password;
      const isMatch = await bcrypt.compare(oldPassword, storedPassword);
  
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
  
      res
        .status(200)
        .json({ status: 200, message: "Password changed successfully!" });
    } catch (error) {
      console.error("❌ Error Changing Password:", error);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  };




// 🛠 Get Attendance Function (Now Properly Checks User Existence)
export const getAttendance = async (req: Request, res: Response) => {
    try {
        

       const userId= req.params.id; // ✅ Get user ID from URL
        console.log(userId);
        // ✅ Check if the user exists in the `login` table
        const [user]: any = await pool.query(
            "SELECT id, name, email FROM login WHERE id = ?",
            [userId]
        );

        if (user.length === 0) {
            res.status(404).json({ status: 404, message: "User not found" });
            return;
        }

        // ✅ Fetch attendance records for the user
        const [attendance]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC",
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




export const addLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        
        const userId = req.params.id;

        const { attendanceStatus, leaveReason } = req.body;

        // ✅ Ensure required fields are present
        if (!attendanceStatus || !leaveReason) {
            res.status(400).json({ message: "Provide all the required information!" });
            return;
        }

        // ✅ Set date to today
        const date = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

        console.log("Received Data:", userId, attendanceStatus, date, leaveReason);

        // ✅ Check if user has already submitted a leave request for today
        const [existingLeave]: any = await pool.query(
            "SELECT COUNT(*) AS leaveCount FROM attendance WHERE userId = ? AND date = CURDATE() AND attendanceStatus = 'Leave'",
            [userId]
        );

        if (existingLeave[0].leaveCount > 0) {
            res.status(400).json({ message: "You have already submitted a leave request for today." });
            return;
        }

        // ✅ SQL Query (Insert into `attendance` table with automatic current day)
        const query = `
            INSERT INTO attendance (userId, date, day, attendanceStatus, leaveReason, leaveApprovalStatus)
            VALUES (?, CURDATE(), DAYNAME(CURDATE()), ?, ?, 'Pending')
        `;

        const values = [userId, attendanceStatus, leaveReason];

        // ✅ Execute the query
        const [result]: any = await pool.query(query, values);

        // ✅ Fetch updated leave records for the frontend
        const [updatedLeaves]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC",
            [userId]
        );

        // ✅ Send success response with updated leave data
        res.status(201).json({
            status: 201,
            message: "Leave added successfully",
            leaveId: result.insertId,
            ...updatedLeaves[0]
        });

    } catch (error) {
        console.error("❌ Error adding leave:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
