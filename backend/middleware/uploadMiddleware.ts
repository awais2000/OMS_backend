import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Ensure the 'uploads/documents' directory exists
const uploadDir = "uploads/documents/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        cb(null, uploadDir); // Save files in 'uploads/documents/'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + path.basename(file.originalname)); // Unique filename
    }
});

// ✅ Export Multer middleware
export const upload = multer({ storage });
