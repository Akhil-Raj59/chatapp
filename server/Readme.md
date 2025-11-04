# Backend Project

This project combines the features of YouTube and Twitter, providing a platform where users can share videos and post tweets.

## Features

- **Video Sharing**: Users can upload, view, and share videos.
- **Tweet Posting**: Users can post tweets, like, and retweet.
- **User Authentication**: Secure user authentication and authorization.
- **User Profiles**: Users can create and manage their profiles.
- **Search Functionality**: Search for videos and tweets.
- **Notifications**: Real-time notifications for user interactions.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Storage**: AWS S3 for video storage
- **Real-time**: Socket.io for real-time notifications

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/backend_project.git
    ```
2. Navigate to the project directory:
    ```bash
    cd backend_project
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Set up environment variables:
    - Create a `.env` file in the root directory.
    - Add the following variables:
        ```
        MONGODB_URI=your_mongodb_uri
        JWT_SECRET=your_jwt_secret
        AWS_ACCESS_KEY_ID=your_aws_access_key_id
        AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
        ```

## Usage

1. Start the server:
    ```bash
    npm start
    ```
2. Access the API at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.