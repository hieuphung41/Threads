import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import { v2 as cloudinary } from "cloudinary";
import asyncHandler from "../middlewares/asyncHandler.js";

const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.status(200).json(post);
});

const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: "User not found" });

  const posts = await Post.find({ postedBy: user.id }).sort({ createdAt: -1 });
  if (!posts) return res.status(404).json({ error: "No Posts found" });
  res.status(200).json(posts);
});

const createPost = asyncHandler(async (req, res) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET,
  });

  const { postedBy, text } = req.body;
  let { img } = req.body;

  if (!postedBy || !text)
    return req
      .status(400)
      .json({ error: "PostedBy and text field is required" });

  const user = await User.findById(postedBy);
  if (!user) return req.status(404).json({ error: "User not found" });

  if (user._id.toString() !== req.user._id.toString())
    return req.status(404).json({ error: "Un-Authorized to post" });

  if (text.length > 500)
    return req
      .status(403)
      .json({ error: "Text must have maximum 500 letters" });

  if (img) {
    const uploadedImg = await cloudinary.uploader.upload(img);
    img = uploadedImg.secure_url;
  }

  const newPost = new Post({ postedBy, text, img });
  await newPost.save();

  res.status(201).json({ message: "Successfully created post", post: newPost });
});

const deletePost = asyncHandler(async (req, res) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET,
  });

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (post.postedBy.toString() !== req.user._id.toString())
    return res.status(404).json({ error: "Un-Authorized to delete" });

  if (post.img) {
    await cloudinary.uploader.destroy(post.img.split("/").pop().split(".")[0]);
  }

  await Post.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "Successfully deleted post" });
});

const likeUnLikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isUserLikedPost = post.likes.includes(req.user._id);

  if (isUserLikedPost) {
    await Post.updateOne(
      { _id: req.params.id },
      { $pull: { likes: req.user._id } }
    );
    res.status(200).json({ message: "Successfully un-liked post" });
  } else {
    post.likes.push(req.user._id);
    await post.save();
    res.status(200).json({ message: "Successfully liked post" });
  }
});

const replyToPost = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const postId = req.params.postId;
  if (!text) return res.status(400).json({ error: "Text field required" });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const reply = {
    userId: req.user._id,
    text,
    userProfilePic: req.user.profilePic,
    username: req.user.username,
  };
  post.replies.push(reply);
  await post.save();

  res.status(201).json(reply);
});

const getFeedPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const userFollowing = user.following;
  userFollowing.push(userId.toString());

  const feedPosts = await Post.find({ postedBy: { $in: userFollowing } }).sort({
    createdAt: -1,
  });
  res.status(200).json(feedPosts);
});

export {
  getPost,
  getFeedPosts,
  getUserPosts,
  createPost,
  deletePost,
  likeUnLikePost,
  replyToPost,
};
