import { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../database/db"; 
import { PoolConnection } from "mysql2/typings/mysql/lib/PoolConnection";




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




// getTodo
export const getTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const [query]:any  =await pool.query(`SELECT t.id, l.name AS employeeName, t.task, t.note,
            DATE_FORMAT(CONVERT_TZ(t.startDate, '+00:00', @@session.time_zone), '%Y-%m-%d') AS startDate,
            DATE_FORMAT(CONVERT_TZ(t.endDate, '+00:00', @@session.time_zone), '%Y-%m-%d') AS endDate,
            DATE_FORMAT(CONVERT_TZ(t.deadline, '+00:00', @@session.time_zone), '%Y-%m-%d') AS Deadline,
             t.completionStatus,
             t.comments
            FROM todo t 
            JOIN login l ON l.id = t.employeeId
            order by date desc`);
        
        if(!query){
            res.send({messsage: "No, Todo Found!"});
            return;
        }

        res.status(200).send(query);
    } catch (error) {
        console.error("❌ Error Fetching Todo!:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}






//createTodo
export const createTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { task, note, startDate, endDate, deadline } = req.body;

        // ✅ Validate required fields before inserting
        if (!id || !task || !startDate || !endDate || !deadline) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        // ✅ Check if User Exists
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

        // ✅ Fetch the newly created Todo
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
        console.error("❌ Error creating todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};






// updateTodo
export const alterTodo = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, id } = req.params; 
        const { task, note, startDate, endDate, deadline, completionStatus,  comments} = req.body;

        console.log( "ID:",  id);

        const [existingTodo]: any = await pool.query("SELECT * FROM todo WHERE id = ?", [id]);
        if (existingTodo.length === 0) {
            res.status(404).json({ message: "Todo not found!" });
            return;
        }

        const query = `
            UPDATE todo 
            SET employeeId=?,  task = ?, note = ?, startDate = ?, endDate = ?, deadline = ?, completionStatus=?, comments = ?
            WHERE id = ?
        `;
        const values = [employeeId, task, note, startDate, endDate, deadline, completionStatus, comments, id];

        const [result]: any = await pool.query(query, values);

        if (result.affectedRows === 0) {
            res.status(404).json({ message: "No changes made!" });
            return;
        }

        const [updatedTodo]: any = await pool.query(`
            SELECT t.id, l.name AS employeeName, t.task, t.note,
            DATE_FORMAT(CONVERT_TZ(t.startDate, '+00:00', @@session.time_zone), '%Y-%m-%d') AS startDate,
            DATE_FORMAT(CONVERT_TZ(t.endDate, '+00:00', @@session.time_zone), '%Y-%m-%d') AS endDate,
            DATE_FORMAT(CONVERT_TZ(t.deadline, '+00:00', @@session.time_zone), '%Y-%m-%d') AS Deadline,
             t.completionStatus,
             t.comments
            FROM todo t 
            JOIN login l ON l.id = t.employeeId
            WHERE t.id = ? order by date desc`
            , [id]);

        res.status(200).json({
            message: "Todo updated successfully!",
            ...updatedTodo[0]
        });

    } catch (error) {
        console.error("❌ Error Updating Todo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





//get Assigned Projects:
export const getAssignProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `SELECT 
        a.id, a.employeeId, a.projectId, 
        DATE_FORMAT(CONVERT_TZ(a.date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date,
        l.name,
        p.projectName
        FROM assignedprojects a 
        JOIN login l ON a.employeeId = l.id
        join projects p on 
        p.id = a.projectId`;
        const [result]:any = await pool.query(query);

        res.status(200).send(result)
    } catch (error) {
        console.error("❌ Error Fetching Assigned Projects:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





//getProgress
export const getProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        // const entry = parseInt(req.params.entry, 10);
        // console.log(entry);
        // const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query  = `SELECT prg.employeeId, prg.projectId, l.name AS employeeName, 
             pro.projectName, prg.note, 
             DATE_FORMAT(CONVERT_TZ(prg.date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date
             FROM progress prg
             JOIN login l ON l.id = prg.employeeId
             JOIN projects pro ON prg.projectId = pro.id 
             where progressStatus = 'Y'`;
        const [result]:any = await pool.query(query);

        if(result.length ===0){
            res.send({message:"no users found!"})
            return;
        }

        res.status(200).send(result)
    } catch (error) {
        console.error("❌ Error fetching progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}





//addProgress
export const addProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employeeId, projectId } = req.params; // ✅ Get IDs directly from URL parameters
        const { date, note } = req.body;

        // ✅ Validate required fields before inserting progress
        if (!employeeId || !projectId || !date || !note) {
            res.status(400).json({ message: "Missing required fields!" });
            return;
        }

        // ✅ Check if Employee Exists
        const [user]: any = await pool.query("SELECT id FROM login WHERE id = ?", [employeeId]);
        if (user.length === 0) {
            res.status(404).json({ message: "User not found!" });
            return;
        }

        // ✅ Check if Project Exists
        const [project]: any = await pool.query("SELECT id FROM projects WHERE id = ?", [projectId]);
        if (project.length === 0) {
            res.status(404).json({ message: "Project not found!" });
            return;
        }

        // ✅ Insert into `progress` table
        const query = `
            INSERT INTO progress (employeeId, projectId, date, note) 
            VALUES (?, ?, ?, ?)
        `;
        await pool.query(query, [employeeId, projectId, date, note]);

        // ✅ Fetch the newly added progress
        const [seeProgress]: any = await pool.query(
            `SELECT prg.employeeId, prg.projectId, l.name AS employeeName, 
             pro.projectName, prg.note, 
             DATE_FORMAT(CONVERT_TZ(prg.date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date
             FROM progress prg
             JOIN login l ON l.id = prg.employeeId
             JOIN projects pro ON prg.projectId = pro.id
             WHERE prg.employeeId = ? AND prg.projectId = ?
             ORDER BY prg.date DESC LIMIT 1`, 
            [employeeId, projectId]
        );

        res.status(201).json({
            message: "Progress added successfully!",
            progress: seeProgress[0]
        });

    } catch (error) {
        console.error("❌ Error adding progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};




//get Leaves:
export const getUsersLeaves = async (req: Request, res: Response): Promise<void> => {
    try {

        // const entry = parseInt(req.params.entry, 10);
        // console.log(entry);
        // const limit = !isNaN(entry) && entry > 0 ? entry : 10;
        const query = `
            SELECT 
                a.userId,
                l.name AS name,
             DATE_FORMAT(CONVERT_TZ(a.date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date,
                a.day,
                a.attendanceStatus,
                a.leaveApprovalStatus
            FROM attendance a
            JOIN login l ON a.userId = l.id
            where a.attendanceStatus = 'Leave'
            ORDER BY a.date DESC 
        `;

        const [attendance]: any = await pool.query(query);

        if (attendance.length === 0) {
            res.status(404).json({ message: "No attendance records found" });
            return;
        }

        // ✅ Send attendance records with user names
        res.status(200).json(["Attendance records fetched successfully",
            ...attendance
        ]);

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





export const addLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: userId } = req.params;
        const { leaveReason } = req.body;

        if (!userId || !leaveReason) {
            res.status(400).json({ message: "Provide all required information!" });
            return;
        }

        const date = new Date().toISOString().split("T")[0];

        console.log("Received Data:", { userId, date, leaveReason });

        const [existingLeave]: any = await pool.query(
            "SELECT COUNT(*) AS leaveCount FROM attendance WHERE userId = ? AND date = CURDATE() AND attendanceStatus = 'Leave'",
            [userId]
        );

        if (existingLeave[0].leaveCount > 0) {
            res.status(400).json({ message: "You have already submitted a leave request for today." });
            return;
        }

        const query = `
            INSERT INTO attendance (userId, date, day, attendanceStatus, leaveReason, leaveApprovalStatus)
            VALUES (?, ?, DAYNAME(?), 'Leave', ?, 'Pending')
        `;

        const values = [userId, date, date, leaveReason];

        const [result]: any = await pool.query(query, values);

        // ✅ Fetch updated leave records
        const [updatedLeaves]: any = await pool.query(
            "SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC",
            [userId]
        );

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





//Progress Report
export const progressReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const filter = req.query; // Already an object, no need to await

        let query = `SELECT 
        id,
        employeeId,
        projectId,
        DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date,
         note,
         progressStatus
         FROM progress WHERE progressStatus = 'Y'`;
        let queryParams: any[] = [];

        // ✅ Apply date range filter if both 'fromDate' and 'toDate' are provided
        if (filter.fromDate && filter.toDate) {
            query += ` AND date BETWEEN ? AND ?`;
            queryParams.push(filter.fromDate, filter.toDate);
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
        console.error("❌ Error fetching progress:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};





//attendanceReport
export const attendanceReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, fromDate, toDate } = req.query;
        let queryParams: any[] = [];

        let query = `SELECT 
                        userId, 
                        DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS date,
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

        res.status(200).json(...result);

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};





//taskReport
export const taskReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fromDate, toDate } = req.query; 

        let query = `
            SELECT t.id, l.name AS employeeName, t.task, t.note,
            DATE_FORMAT(CONVERT_TZ(t.startDate, '+00:00', @@session.time_zone), '%Y-%m-%d') AS startDate,
            DATE_FORMAT(CONVERT_TZ(t.endDate, '+00:00', @@session.time_zone), '%Y-%m-%d') AS endDate,
            DATE_FORMAT(CONVERT_TZ(t.deadline, '+00:00', @@session.time_zone), '%Y-%m-%d') AS Deadline,
            t.completionStatus, t.comments
            FROM todo t 
            JOIN login l ON l.id = t.employeeId
            WHERE 1 = 1`;  

        let queryParams: any[] = [];

        if (fromDate && toDate) {
            query += ` AND t.startDate BETWEEN ? AND ?`;
            queryParams.push(fromDate, toDate);
        }

        query += ` ORDER BY t.startDate DESC`;  

        const [result]: any = await pool.query(query, queryParams);

        if (result.length === 0) {
            res.status(404).json({ message: "No tasks found within the given date range!" });
            return;
        }

        res.status(200).json(result);

    } catch (error) {
        console.error("❌ Error Fetching Todo!:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


//it ends here