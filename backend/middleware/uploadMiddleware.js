"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ✅ Ensure the 'uploads/documents' directory exists
const uploadDir = "uploads/documents/";
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// ✅ Configure Multer for file storage
const storage = multer_1.default.diskStorage({
    destination: (_req, file, cb) => {
        cb(null, uploadDir); // Save files in 'uploads/documents/'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + path_1.default.basename(file.originalname)); // Unique filename
    }
});
// ✅ Export Multer middleware
exports.upload = (0, multer_1.default)({ storage });
