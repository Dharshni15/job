import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const getFile = async (req, res) => {
  try {
    const { id } = req.params;
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
    const fileId = new ObjectId(id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    const file = files[0];
    if (file.contentType) res.set("Content-Type", file.contentType);
    res.set("Cache-Control", "public, max-age=31536000");
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    return res.status(404).json({ success: false, message: "File not found" });
  }
};