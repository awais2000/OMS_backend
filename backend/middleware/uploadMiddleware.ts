import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Ensure the 'uploads/images' directory exists
const uploadDir = "uploads/images/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        cb(null, uploadDir); // ✅ Save files in 'uploads/images/'
    },
    filename: (_req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "_")); // ✅ Unique filename
    }
});

// ✅ Export Multer middleware
export const upload = multer({ storage });
