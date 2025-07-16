import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from 'bcrypt';

// Signup a new user
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;

    try {
        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({ success: false, message: "Missing Details" });
        }

        const user = await User.findOne({ email });

        if (user) {
            return res.status(409).json({ success: false, message: "Account already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio
        });

        const token = generateToken(newUser._id);
        
        return res.status(201).json({
            success: true,
            userData: newUser,
            token,
            message: "Account created successfully"
        });

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Controller to login a user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const userData = await User.findOne({ email });
        
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = generateToken(userData._id);
        
        return res.status(200).json({
            success: true,
            userData,
            token,
            message: "Login successful"
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

// Controller to check if user is authenticated 
export const checkAuth = (req, res) => {
    return res.status(200).json({ success: true, user: req.user });
}

// Controller to update user profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;
        const userId = req.user._id;
        
        if (!bio && !fullName && !profilePic) {
            return res.status(400).json({ success: false, message: "Nothing to update" });
        }

        let updatedUser;
        let updateData = { bio, fullName };

        if (profilePic) {
            const upload = await cloudinary.uploader.upload(profilePic);
            updateData.profilePic = upload.secure_url;
        }

        updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}