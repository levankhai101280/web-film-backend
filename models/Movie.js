const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Liên kết với User
  rating: Number,
  comment: String,
  date: { type: Date, default: Date.now }
});

const movieSchema = new mongoose.Schema({
  title: String,
  genre: String,
  description: String,
  type: { type: String }, // 👈 Thêm trường phân loại
  image: String,
  video: String,
  rating: Number, // Số điểm trung bình
  reviews: [reviewSchema]
});

module.exports = mongoose.model('Movie', movieSchema);
