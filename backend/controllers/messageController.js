import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Message } from "../models/messageSchema.js";
import { User } from "../models/userSchema.js";
import { Certificate } from "../models/certificateSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { uploadFileFromTemp, deleteFileById } from "../utils/gridfs.js";

// Send a message
export const sendMessage = catchAsyncErrors(async (req, res, next) => {
  const { receiverId, subject, content, messageType, relatedCertificate } = req.body;
  
  if (!receiverId || !subject || !content) {
    return next(new ErrorHandler("Please provide all required fields!", 400));
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return next(new ErrorHandler("Receiver not found!", 404));
  }

  // Prevent users from sending messages to themselves
  if (req.user._id.toString() === receiverId.toString()) {
    return next(new ErrorHandler("You cannot send a message to yourself!", 400));
  }

  // Validate message type based on user roles
  const { role } = req.user;
  const validMessageTypes = ["recruitment_inquiry", "general", "interview_invite"];
  
  if (messageType && !validMessageTypes.includes(messageType)) {
    return next(new ErrorHandler("Invalid message type!", 400));
  }

  // Only employers can send recruitment inquiries and interview invites
  if ((messageType === "recruitment_inquiry" || messageType === "interview_invite") && role !== "Employer") {
    return next(new ErrorHandler("Only employers can send recruitment inquiries and interview invites!", 400));
  }

  // Validate related certificate if provided
  if (relatedCertificate) {
    const certificate = await Certificate.findById(relatedCertificate);
    if (!certificate) {
      return next(new ErrorHandler("Related certificate not found!", 404));
    }
  }

  let attachments = [];
  
  // Handle file attachments if provided
  if (req.files && req.files.attachments) {
    const files = Array.isArray(req.files.attachments) 
      ? req.files.attachments 
      : [req.files.attachments];
    
    const allowedFormats = [
      "image/png", "image/jpeg", "image/webp", 
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    for (const file of files) {
      if (!allowedFormats.includes(file.mimetype)) {
        return next(
          new ErrorHandler("Invalid file type! Please upload PNG, JPG, WEBP, PDF, or DOC files.", 400)
        );
      }
      
      const fileId = await uploadFileFromTemp(
        file.tempFilePath,
        file.name,
        file.mimetype
      );

      attachments.push({
        public_id: fileId.toString(),
        url: `${req.protocol}://${req.get('host')}/api/v1/files/${fileId.toString()}`,
        filename: file.name
      });
    }
  }

  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    subject,
    content,
    messageType: messageType || "general",
    relatedCertificate: relatedCertificate || null,
    attachments
  });

  const populatedMessage = await Message.findById(message._id)
    .populate("sender", "name email role")
    .populate("receiver", "name email role")
    .populate("relatedCertificate", "title");

  res.status(201).json({
    success: true,
    message: "Message sent successfully!",
    data: populatedMessage,
  });
});

// Get received messages
export const getReceivedMessages = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  let query = { receiver: req.user._id };
  
  // Filter by read status
  if (req.query.isRead !== undefined) {
    query.isRead = req.query.isRead === 'true';
  }
  
  // Filter by message type
  if (req.query.messageType) {
    query.messageType = req.query.messageType;
  }

  const messages = await Message.find(query)
    .populate("sender", "name email role")
    .populate("relatedCertificate", "title")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalMessages = await Message.countDocuments(query);
  const unreadCount = await Message.countDocuments({ 
    receiver: req.user._id, 
    isRead: false 
  });
  const totalPages = Math.ceil(totalMessages / limit);

  res.status(200).json({
    success: true,
    messages,
    unreadCount,
    pagination: {
      currentPage: page,
      totalPages,
      totalMessages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// Get sent messages
export const getSentMessages = catchAsyncErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ sender: req.user._id })
    .populate("receiver", "name email role")
    .populate("relatedCertificate", "title")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalMessages = await Message.countDocuments({ sender: req.user._id });
  const totalPages = Math.ceil(totalMessages / limit);

  res.status(200).json({
    success: true,
    messages,
    pagination: {
      currentPage: page,
      totalPages,
      totalMessages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// Get single message
export const getSingleMessage = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  
  const message = await Message.findById(id)
    .populate("sender", "name email phone role")
    .populate("receiver", "name email phone role")
    .populate("relatedCertificate", "title description");

  if (!message) {
    return next(new ErrorHandler("Message not found!", 404));
  }

  // Check if user is authorized to view this message
  if (
    message.sender._id.toString() !== req.user._id.toString() &&
    message.receiver._id.toString() !== req.user._id.toString()
  ) {
    return next(new ErrorHandler("Not authorized to view this message!", 403));
  }

  // Mark as read if the current user is the receiver and message is unread
  if (
    message.receiver._id.toString() === req.user._id.toString() &&
    !message.isRead
  ) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
  }

  res.status(200).json({
    success: true,
    message,
  });
});

// Mark message as read
export const markAsRead = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  
  const message = await Message.findById(id);
  
  if (!message) {
    return next(new ErrorHandler("Message not found!", 404));
  }

  // Check if current user is the receiver
  if (message.receiver.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to mark this message as read!", 403));
  }

  if (!message.isRead) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
  }

  res.status(200).json({
    success: true,
    message: "Message marked as read!",
  });
});

// Mark multiple messages as read
export const markMultipleAsRead = catchAsyncErrors(async (req, res, next) => {
  const { messageIds } = req.body;
  
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return next(new ErrorHandler("Please provide message IDs!", 400));
  }

  const result = await Message.updateMany(
    {
      _id: { $in: messageIds },
      receiver: req.user._id,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} messages marked as read!`,
    modifiedCount: result.modifiedCount
  });
});

// Delete message
export const deleteMessage = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  
  const message = await Message.findById(id);
  
  if (!message) {
    return next(new ErrorHandler("Message not found!", 404));
  }

  // Check if user is authorized to delete this message (only receiver can delete)
  if (message.receiver.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to delete this message!", 403));
  }

  // Delete attachments from MongoDB GridFS if any
  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      await deleteFileById(attachment.public_id);
    }
  }

  await message.deleteOne();

  res.status(200).json({
    success: true,
    message: "Message deleted successfully!",
  });
});

// Get conversation between two users
export const getConversation = catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Check if the other user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return next(new ErrorHandler("User not found!", 404));
  }

  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id }
    ]
  })
    .populate("sender", "name email role")
    .populate("receiver", "name email role")
    .populate("relatedCertificate", "title")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Mark received messages in this conversation as read
  await Message.updateMany(
    {
      sender: userId,
      receiver: req.user._id,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );

  const totalMessages = await Message.countDocuments({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id }
    ]
  });
  
  const totalPages = Math.ceil(totalMessages / limit);

  res.status(200).json({
    success: true,
    messages: messages.reverse(), // Reverse to show chronological order
    otherUser: {
      _id: otherUser._id,
      name: otherUser.name,
      email: otherUser.email,
      role: otherUser.role
    },
    pagination: {
      currentPage: page,
      totalPages,
      totalMessages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// Get message statistics
export const getMessageStats = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const [totalReceived, totalSent, unreadCount, totalConversations] = await Promise.all([
    Message.countDocuments({ receiver: userId }),
    Message.countDocuments({ sender: userId }),
    Message.countDocuments({ receiver: userId, isRead: false }),
    Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$receiver",
              "$sender"
            ]
          }
        }
      },
      {
        $count: "total"
      }
    ])
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalReceived,
      totalSent,
      unreadCount,
      totalConversations: totalConversations[0]?.total || 0
    }
  });
});