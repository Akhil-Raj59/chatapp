import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadToCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error("No file found")
        }
        // upload the file to cloudinary
        const resonse = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto",

        })
        // file uploaded sucessfully
        console.log("File uploaded to cloudinary",resonse.url);
        fs.unlinkSync(localFilePath)
        return resonse;
        
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("Error uploading file to cloudinary",error);
        return null;
    }
}

export { uploadToCloudinary }
