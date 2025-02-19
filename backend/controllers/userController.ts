import { Request, Response } from "express";
import pool from "../database/db"; 

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params; // ✅ Get user ID from URL

        // ✅ Check if user exists
        const [user]: any = await pool.query("SELECT date, clockin, clockout FROM login");
        
        // ✅ Fetch attendance records for the user
        const [attendance]: any = await pool.query(
            "SELECT * FROM attendance",
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
            user: attendance
        });

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        res.status(500).json({ status: 500, msg: "Internal Server Error" });
    }
}