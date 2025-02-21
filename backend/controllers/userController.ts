import { Request, Response } from "express";
import pool from "../database/db"; // ✅ Import MySQL connection

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
            res.status(404).json({ status: 404, msg: "User not found" });
            return;
        }

        // ✅ Fetch attendance records for the user
        const [attendance]: any = await pool.query(
            "SELECT date, clockIn, clockOut FROM attendance WHERE userId = ? ORDER BY date DESC",
            [userId]
        );

        if (attendance.length === 0) {
            res.status(404).json({ status: 404, msg: "No attendance records found" });
            return;
        }

        // ✅ Send attendance records
        res.status(200).json({
            status: 200,
            msg: "Attendance records fetched successfully",
            user: {
                id: user[0].id,
                name: user[0].name,
                email: user[0].email
            },
            attendance
        });

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
};




// 🛠 Mark Attendance Function (Handles Both Clock In & Clock Out + Auto Absent Marking)
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;
        console.log("User ID:", userId);

        // ✅ Check if the user exists in the `login` table
        const [user]: any = await pool.query(
            "SELECT id FROM login WHERE id = ?",
            [userId]
        );

        if (user.length === 0) {
            res.status(404).json({ status: 404, msg: "User not found" });
            return;
        }

        // ✅ Check if the user has already clocked in today
        const [existingAttendance]: any = await pool.query(
            "SELECT userId, clockIn, clockOut FROM attendance WHERE userId = ? AND date = CURDATE()",
            [userId]
        );

        if (existingAttendance.length === 0) {
            // ✅ Check if the user missed attendance for the last 24 hours
            const [lastAttendance]: any = await pool.query(
                "SELECT date FROM attendance WHERE userId = ? ORDER BY date DESC LIMIT 1",
                [userId]
            );

            if (lastAttendance.length > 0) {
                const lastDate = new Date(lastAttendance[0].date);
                const currentDate = new Date();

                // ✅ Check if more than 24 hours (1 day) has passed
                const timeDiff = Math.abs(currentDate.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (diffDays >= 1) {
                    // ✅ Mark user as absent for missing attendance
                    await pool.query(`
                        INSERT INTO attendance (userId, clockIn, clockOut, date, day, attendanceStatus)
                        VALUES (?, NULL, NULL, CURDATE() - INTERVAL 1 DAY, DAYNAME(CURDATE() - INTERVAL 1 DAY), 'Absent')
                    `, [userId]);
                }
            }

            // ✅ User is clockIng in for the first time today
            const query = `
                INSERT INTO attendance (
                    userId, clockIn, clockOut, date, day, attendanceStatus)
                    VALUES (?, CURRENT_TIMESTAMP(), NULL, CURDATE(), DAYNAME(CURDATE()), 'Present')
            `;

            const values = [userId];
            const [result]: any = await pool.query(query, values);

            res.status(201).json({
                msg: "Clock-in recorded successfully",
                attendanceId: result.insertId
            });

        } else if (existingAttendance[0].clockOut === null) {
            // ✅ User is clockIng out
            const query = `
                UPDATE attendance 
                SET clockOut = CURRENT_TIMESTAMP()
                WHERE userId = ? AND date = CURDATE()
            `;

            const values = [userId];
            await pool.query(query, values);

            res.status(200).json({
                msg: "Clock-out recorded successfully"
            });

        } else {
            // ✅ User has already clocked in and clocked out today
            res.status(400).json({
                msg: "You have already marked Attendance for today!"
            });
        }

    } catch (error) {
        console.error("❌ Error marking attendance:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
};
export const addLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ Get `userId` from authenticated user (via JWT token)
        const userId = req.params.id;

        const { attendanceStatus, leaveReason } = req.body;

        // ✅ Ensure required fields are present
        if (!attendanceStatus || !leaveReason) {
            res.status(400).json({ msg: "Provide all the required information!" });
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
            res.status(400).json({ msg: "You have already submitted a leave request for today." });
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
            msg: "Leave added successfully",
            leaveId: result.insertId,
            leaves: updatedLeaves // ✅ Send all leave records to frontend
        });

    } catch (error) {
        console.error("❌ Error adding leave:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
};
