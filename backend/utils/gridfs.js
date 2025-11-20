import mongoose from "mongoose";
import fs from "fs";
import { ObjectId } from "mongodb";

export const getBucket = () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
};

export const uploadFileFromTemp = (tempFilePath, filename, contentType) => {
  return new Promise((resolve, reject) => {
    try {
      const bucket = getBucket();
      const readStream = fs.createReadStream(tempFilePath);
      const uploadStream = bucket.openUploadStream(filename, { contentType });
      readStream.pipe(uploadStream)
        .on("error", (err) => reject(err))
        .on("finish", () => resolve(uploadStream.id));
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteFileById = async (id) => {
  const bucket = getBucket();
  const fileId = typeof id === "string" ? new ObjectId(id) : id;
  await bucket.delete(fileId);
};

export const streamFileById = (id, res) => {
  const bucket = getBucket();
  const fileId = typeof id === "string" ? new ObjectId(id) : id;
  const downloadStream = bucket.openDownloadStream(fileId);
  downloadStream.on("error", (err) => {
    res.status(404).json({ success: false, message: "File not found" });
  });
  downloadStream.pipe(res);
};