import { Request, Response } from "express";
import pool from "../database/db"; // ✅ Import MySQL connection

// 🛠 Get Attendance Function (Now Properly Checks User Existence)
export const getAttendance = async (req: Request, res: Response) => {
    try {
        const user_id= req.params.id; // ✅ Get user ID from URL
        console.log(user_id);
        // ✅ Check if the user exists in the `login` table
        const [user]: any = await pool.query(
            "SELECT id, name, email FROM login WHERE id = ?",
            [user_id]
        );

        if (user.length === 0) {
            res.status(404).json({ status: 404, msg: "User not found" });
            return;
        }

        // ✅ Fetch attendance records for the user
        const [attendance]: any = await pool.query(
            "SELECT date, clockin, clockout FROM attendance WHERE user_id = ? ORDER BY date DESC",
            [user_id]
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
        const user_id = req.params.id;
        console.log("User ID:", user_id);

        const time = '2025-02-22';

        // ✅ Check if the user exists in the `login` table
        const [user]: any = await pool.query(
            "SELECT id FROM login WHERE id = ?",
            [user_id]
        );

        if (user.length === 0) {
            res.status(404).json({ status: 404, msg: "User not found" });
            return;
        }

        // ✅ Check if the user has already clocked in today
        const [existingAttendance]: any = await pool.query(
            "SELECT user_id, clockin, clockout FROM attendance WHERE user_id = ? AND date = CURDATE()",
            [user_id]
        );

        if (existingAttendance.length === 0) {
            // ✅ Check if the user missed attendance for the last 24 hours
            const [lastAttendance]: any = await pool.query(
                "SELECT date FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 1",
                [user_id]
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
                        INSERT INTO attendance (user_id, clockin, clockout, date, day, attendanceStatus)
                        VALUES (?, NULL, NULL, CURDATE() - INTERVAL 1 DAY, DAYNAME(CURDATE() - INTERVAL 1 DAY), 'Absent')
                    `, [user_id]);
                }
            }

            // ✅ User is clocking in for the first time today
            const query = `
                INSERT INTO attendance (
                    user_id, clockin, clockout, date, day, attendanceStatus
                ) VALUES (?, CURRENT_TIMESTAMP(), NULL, CURDATE(), DAYNAME(CURDATE()), 'Present')
            `;

            const values = [user_id];
            const [result]: any = await pool.query(query, values);

            res.status(201).json({
                msg: "Clock-in recorded successfully",
                attendanceId: result.insertId
            });

        } else if (existingAttendance[0].clockout === null) {
            // ✅ User is clocking out
            const query = `
                UPDATE attendance 
                SET clockout = CURRENT_TIMESTAMP()
                WHERE user_id = ? AND date = CURDATE()
            `;

            const values = [user_id];
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


