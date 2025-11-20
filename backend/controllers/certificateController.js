import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Certificate } from "../models/certificateSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { uploadFileFromTemp, deleteFileById } from "../utils/gridfs.js";

// Post a new certificate
export const postCertificate = catchAsyncErrors(async (req, res, next) => {
  console.log("🚀 Certificate POST request received");
  console.log("📝 Request body:", req.body);
  console.log("📁 Request files:", req.files);
  console.log("👤 User:", req.user);
  
  const { role } = req.user;
  if (role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to post certificates.", 400)
    );
  }

  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Certificate image required!", 400));
  }

  const { certificate } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  
  if (!allowedFormats.includes(certificate.mimetype)) {
    return next(
      new ErrorHandler("Invalid file type! Please upload PNG, JPG, WEBP, or PDF files.", 400)
    );
  }

  const {
    title,
    description,
    issuingOrganization,
    issueDate,
    expiryDate,
    credentialId,
    skills
  } = req.body;

  if (!title || !description || !issuingOrganization || !issueDate) {
    return next(new ErrorHandler("Please provide complete certificate information!", 400));
  }

  console.log("📤 Starting upload to MongoDB GridFS:", certificate.tempFilePath);
  const fileId = await uploadFileFromTemp(
    certificate.tempFilePath,
    certificate.name,
    certificate.mimetype
  );
  console.log("✅ Stored file in MongoDB GridFS:", fileId.toString());

  const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];
  console.log("📋 Skills array:", skillsArray);

  console.log("💾 Starting database save...");
  const certificateDoc = await Certificate.create({
    title,
    description,
    issuingOrganization,
    issueDate,
    expiryDate: expiryDate || null,
    certificateUrl: {
      public_id: fileId.toString(),
      url: `${req.protocol}://${req.get('host')}/api/v1/files/${fileId.toString()}`,
    },
    credentialId: credentialId || null,
    skills: skillsArray,
    postedBy: req.user._id,
  });
  console.log("✅ Certificate saved successfully:", certificateDoc._id);

  res.status(200).json({
    success: true,
    message: "Certificate posted successfully!",
    certificate: certificateDoc,
  });
});

// Get all certificates with pagination and filtering
export const getAllCertificates = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  let query = {};
  
  // Filter by skills if provided
  if (req.query.skills) {
    const skillsArray = req.query.skills.split(',').map(skill => skill.trim());
    query.skills = { $in: skillsArray };
  }
  
  // Filter by organization if provided
  if (req.query.organization) {
    query.issuingOrganization = new RegExp(req.query.organization, 'i');
  }
  
  // Search in title and description
  if (req.query.search) {
    query.$or = [
      { title: new RegExp(req.query.search, 'i') },
      { description: new RegExp(req.query.search, 'i') }
    ];
  }

  const certificates = await Certificate.find(query)
    .populate("postedBy", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCertificates = await Certificate.countDocuments(query);
  const totalPages = Math.ceil(totalCertificates / limit);

  res.status(200).json({
    success: true,
    certificates,
    pagination: {
      currentPage: page,
      totalPages,
      totalCertificates,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// Get certificates by current user (job seeker)
export const getMyCertificates = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const myCertificates = await Certificate.find({ postedBy: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCertificates = await Certificate.countDocuments({ postedBy: req.user._id });
  const totalPages = Math.ceil(totalCertificates / limit);

  res.status(200).json({
    success: true,
    certificates: myCertificates,
    pagination: {
      currentPage: page,
      totalPages,
      totalCertificates,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// Get single certificate by ID
export const getSingleCertificate = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  
  try {
    // Increment view count
    const certificate = await Certificate.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("postedBy", "name email phone role");

    if (!certificate) {
      return next(new ErrorHandler("Certificate not found.", 404));
    }

    res.status(200).json({
      success: true,
      certificate,
    });
  } catch (error) {
    return next(new ErrorHandler(`Invalid certificate ID.`, 400));
  }
});

// Update certificate
export const updateCertificate = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }

  const { id } = req.params;
  let certificate = await Certificate.findById(id);
  
  if (!certificate) {
    return next(new ErrorHandler("Certificate not found.", 404));
  }

  if (certificate.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to update this certificate.", 403));
  }

  const updateData = { ...req.body };
  
  // Handle skills array
  if (req.body.skills) {
    updateData.skills = req.body.skills.split(',').map(skill => skill.trim());
  }

  // Handle file update if provided
  if (req.files && req.files.certificate) {
    const { certificate: newCertFile } = req.files;
    const allowedFormats = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    
    if (!allowedFormats.includes(newCertFile.mimetype)) {
      return next(
        new ErrorHandler("Invalid file type! Please upload PNG, JPG, WEBP, or PDF files.", 400)
      );
    }

    // Delete old file from storage
    await deleteFileById(certificate.certificateUrl.public_id);

    // Upload new file to MongoDB GridFS
    const newFileId = await uploadFileFromTemp(
      newCertFile.tempFilePath,
      newCertFile.name,
      newCertFile.mimetype
    );

    updateData.certificateUrl = {
      public_id: newFileId.toString(),
      url: `${req.protocol}://${req.get('host')}/api/v1/files/${newFileId.toString()}`,
    };
  }

  certificate = await Certificate.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    message: "Certificate updated successfully!",
    certificate,
  });
});

// Delete certificate
export const deleteCertificate = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }

  const { id } = req.params;
  const certificate = await Certificate.findById(id);
  
  if (!certificate) {
    return next(new ErrorHandler("Certificate not found.", 404));
  }

  if (certificate.postedBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to delete this certificate.", 403));
  }

  // Delete certificate file from MongoDB GridFS
  await deleteFileById(certificate.certificateUrl.public_id);

  await certificate.deleteOne();

  res.status(200).json({
    success: true,
    message: "Certificate deleted successfully!",
  });
});

// Like/Unlike certificate
export const toggleLikeCertificate = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const certificate = await Certificate.findById(id);
  if (!certificate) {
    return next(new ErrorHandler("Certificate not found.", 404));
  }

  const hasLiked = certificate.likes.includes(userId);

  if (hasLiked) {
    // Unlike
    certificate.likes = certificate.likes.filter(
      (like) => like.toString() !== userId.toString()
    );
  } else {
    // Like
    certificate.likes.push(userId);
  }

  await certificate.save();

  res.status(200).json({
    success: true,
    message: hasLiked ? "Certificate unliked!" : "Certificate liked!",
    likesCount: certificate.likes.length,
    hasLiked: !hasLiked,
  });
});