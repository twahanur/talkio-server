import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// ✅ 1. Get all users except the logged in user, with unseen message count
export const getUserForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        const unseenMessages = {};
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({ senderId: user._id, receiverId: userId, seen: false });
            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        });

        await Promise.all(promises);

        res.json({ success: true, users: filteredUsers, unseenMessages });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ✅ 2. Get all messages for a selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ]
        }).sort({ createdAt: 1 }); // Sort messages chronologically

        // Mark messages from selectedUser as seen
        await Message.updateMany({ senderId: selectedUserId, receiverId: myId }, { seen: true });

        res.json({ success: true, messages });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
// ✅ 3. Mark a single message as seen
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true });
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
// ✅ 4. Send message (text or image) with Cloudinary support
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;

        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        // 🔁 Real-time message to receiver using socket
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        // ✅ FIXED response for frontend
        res.json({ success: true, newMessage });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
