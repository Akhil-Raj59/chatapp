const asyncHandler = (requestHandeler) => {
    return (req,res,next)=>{
        Promise.resolve(requestHandeler(req,res,next))
        .catch((err) => next(err))
    }
}

export { asyncHandler }

// const asyncHandlerr = (fn) => async(req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             sucess: false,
//             message: error.message || "Internal Server Error"
//         })

//     }
// }