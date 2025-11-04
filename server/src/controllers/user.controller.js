import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // save refresh token 
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong during generate tokens")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend

    const {fullName, email,username,password} = req.body
    // validate
    if (
        [fullName,email,username,password].some((field)=>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    // check if user already exists
    const existedUser =await User.findOne({
        $or: [{ email }, { username }]
    })

    if(existedUser){
        throw new ApiError(400, "User already exists")
    }
   // check for avatar image and avatar
   const avatarLocalPath = req.files?.avatar[0]?.path
//    const coverImageLocalPath = req.files?.coverImage[0]?.path

    // check for cover image
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")  
    }
    // check for cover image
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    //upload to cloudinary
    const avatar = await uploadToCloudinary(avatarLocalPath)
    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadToCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar")
    }
    // create user object
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })
    // remove password from refresh token
    const createdUser = await User.findById(user._id).select(
        ("-password") -("refreshToken"))
    // check for user creation success
    if (!createdUser) {
        throw new ApiError(500, "Failed to create user")
    }
    // return response
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body - email, password
    const { email, username, password } = req.body;
    
    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    // Find the user
    const user = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    // Check password
    const isPasswordValid = await user.isPasswordMatch(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Fetch user data without sensitive fields
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken") 
        .lean(); // Converts to plain object to prevent circular structure error

    const options = {
        httpOnly: true,
        secure: true
    };

    console.log(loggedInUser); // Debugging: Check user data before sending response

    // Send response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, 
                    accessToken, 
                    refreshToken
                },
                "User Logged In Successfully"
            )
        );
});


const logoutUser = asyncHandler(async(req,res)=> {
        await  User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new:true
            }
        )
        
        const options = {
            httpOnly:true,
            secure: true
        }
        // send res
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(
            new ApiResponse(
                200,
                {},
                "User Loggend out Scessfully"
            )
        )
    })

const refreshAccessToken = asyncHandler(async (req, res) => {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        try {
            // Verify refresh token
            let decodedToken;
            try {
                decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
            } catch (error) {
                throw new ApiError(401, "Invalid refresh token");
            }
    
            // Find user
            const user = await User.findById(decodedToken?._id);
            if (!user) {
                throw new ApiError(401, "Invalid refresh token");
            }
    
            // Validate stored refresh token
            if (!user.refreshToken || incomingRefreshToken !== user.refreshToken) {
                return res
                    .clearCookie("accessToken")
                    .clearCookie("refreshToken")
                    .status(401)
                    .json({ message: "Refresh token is expired or used. Please log in again." });
            }
    
            // Generate new access and refresh tokens
            const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
            // Store new refresh token in the database
            user.refreshToken = newRefreshToken;
            await user.save();
    
            // Cookie options
            const options = {
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            };
    
            return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(
                        200,
                        { accessToken, newRefreshToken },
                        "Access token refreshed successfully"
                    )
                );
        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid refresh token");
        }
    });
    
export {
    registerUser ,
    loginUser,
    logoutUser,
    refreshAccessToken
}