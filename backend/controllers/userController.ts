import { Request, Response } from "express";
import pool from "../database/db"; 

// 🛠 Get Attendance Function (Now Properly Checks User Existence)
export const getAttendance = async (req: Request, res: Response) => {
    try {
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = (page - 1) * limit; // ✅ Calculate the offset

        console.log(`Fetching page ${page} with limit ${limit}`);
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

        if (existingAttendance.length === 0) {
            // ✅ Marking User as Absent if they missed attendance
            const [lastAttendance]: any = await pool.query(
                "SELECT date FROM attendance WHERE userId = ? ORDER BY date DESC LIMIT 1",
                [userId]
            );

            if (lastAttendance.length > 0) {
                const lastDate = new Date(lastAttendance[0].date);
                const currentDate = new Date();

                const timeDiffMs = Math.abs(currentDate.getTime() - lastDate.getTime()); // Time difference in milliseconds

                const hours = Math.floor(timeDiffMs / (1000 * 60 * 60)); // Convert to hours
                const minutes = Math.floor((timeDiffMs % (1000 * 60 * 60)) / (1000 * 60)); // Get remaining minutes

                const diffTimeInHours = hours + minutes / 60; // Convert "HH:MM" to decimal (e.g., 1.5 hours)

                if (diffTimeInHours >= 1) {
                    await pool.query(`
                    INSERT INTO attendance (userId, clockIn, clockOut, date, day, attendanceStatus, workingHours)
                    VALUES (?, NULL, NULL, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DAYNAME(DATE_SUB(CURDATE(), INTERVAL 1 DAY)), 'Absent', NULL)
                    `, [userId]);
                }
            }


            // ✅ Clock In Logic
            const query = `
                INSERT INTO attendance (
                    userId, clockIn, clockOut, date, day, attendanceStatus, workingHours
                ) VALUES (?, CURRENT_TIMESTAMP(), NULL, CURDATE(), DAYNAME(CURDATE()), 'Present', NULL)
            `;

            const [result]: any = await pool.query(query, [userId]);

            res.status(201).json({
                message: "Clock-in recorded successfully",
                attendanceId: result.insertId
            });

        } else if (existingAttendance[0].clockOut === null) {
            // ✅ Clock Out & Calculate Working Hours
            const query = `
                UPDATE attendance 
                SET clockOut = CURRENT_TIMESTAMP(), workingHours = TIMESTAMPDIFF(HOUR, clockIn, CURRENT_TIMESTAMP())
                WHERE userId = ? AND date = CURDATE()
            `;

            await pool.query(query, [userId]);

            const [attendance]: any = await pool.query(
                "SELECT * FROM attendance WHERE userId = ? AND date = CURDATE()",
                [userId]
            );

            res.status(200).json({
                message: "Clock-out recorded successfully",
                ...attendance[0]
            });

        } else {
            res.status(400).json({
                message: "You have already marked attendance for today!"
            });
        }

    } catch (error) {
        console.error("❌ Error marking attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const addLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const user_id = (req as any).user.id; // ✅ Get user ID from authenticated token

        // ✅ Get `page` and `limit` from query params (Default: page=1, limit=10)
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = (page - 1) * limit; // ✅ Calculate the offset

        console.log(`Fetching page ${page} with limit ${limit}`);
        // ✅ Get `userId` from authenticated user (via JWT token)
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
