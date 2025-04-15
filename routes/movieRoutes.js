const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { addReview } = require("../controllers/movieController"); // Import hàm xử lý đánh giá
const Movie = require('../models/Movie');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Cấu hình multer để upload ảnh và video
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Lưu file vào thư mục uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Đặt tên file theo thời gian hiện tại để tránh trùng
  }
});

const upload = multer({ storage });

// ✅ API thêm phim (chỉ admin mới có thể thêm)
router.post('/', verifyToken, isAdmin, upload.fields([{ name: 'image' }, { name: 'video' }]), async (req, res) => {
  const { title, genre, description } = req.body;

  // Lấy đường dẫn ảnh và video từ request
  const imageUrl = req.files['image'] ? `uploads/${req.files['image'][0].filename}` : '';
  const videoUrl = req.files['video'] ? `uploads/${req.files['video'][0].filename}` : '';

  try {
    // Tạo mới phim với thông tin từ request body và đường dẫn ảnh + video
    const newMovie = new Movie({
      title,
      genre,
      description,
      image: imageUrl,
      video: videoUrl  // Lưu đường dẫn video
    });

    await newMovie.save();  // Lưu phim vào cơ sở dữ liệu
    res.status(201).json(newMovie);  // Trả về phim mới được tạo
  } catch (error) {
    console.error('❌ Lỗi thêm phim:', error);
    res.status(500).json({ message: 'Lỗi server' });  // Xử lý lỗi nếu có
  }
});

// ✅ API tìm kiếm phim theo tên
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';

    let filter = {};
    if (searchQuery.trim() !== '') {
      filter = { title: { $regex: `^${searchQuery}$`, $options: "i" } };  // Tìm chính xác tên phim
    }

    const movies = await Movie.find(filter);  // Lấy danh sách phim từ cơ sở dữ liệu
    res.json(movies);  // Trả về danh sách phim
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách phim:", error);
    res.status(500).json({ message: "Lỗi server" });  // Xử lý lỗi nếu có
  }
});

// ✅ API thêm đánh giá phim (yêu cầu đăng nhập)
router.post("/review/:id", verifyToken, addReview);

router.delete('/movies/:id', verifyToken, isAdmin, movieController.deleteMovie);

module.exports = router;
