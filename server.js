const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');
const Movie = require('./models/Movie');
const { verifyToken, isAdmin } = require('./middleware/authMiddleware');

const app = express();

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/moviedb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Tạo tài khoản admin mặc định
const createAdmin = async () => {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({ username: 'admin', password: hashedPassword, role: 'admin' });
    await adminUser.save();
  }
};
createAdmin();

// API Đăng ký
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Tên người dùng đã tồn tại' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role: 'user' });
    await newUser.save();
    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Đăng nhập
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Sai thông tin đăng nhập' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, 'secretKey', { expiresIn: '7d' });
    res.json({ token, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Lấy danh sách phim
app.get('/api/movies', async (req, res) => {
  try {
    res.json(await Movie.find());
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Thêm phim
// API Thêm phim
app.post('/api/movies', verifyToken, isAdmin, upload.fields([{ name: 'image' }, { name: 'video' }]), async (req, res) => {
  try {
    const { title, genre, description } = req.body;

    // Kiểm tra yêu cầu đầu vào
    if (!title || !genre || !description || !req.files['image']) {
      return res.status(400).json({ message: 'Thiếu thông tin hoặc chưa có ảnh' });
    }

    // Lấy đường dẫn ảnh và video từ request
    const imageUrl = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : '';
    const videoUrl = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : '';

    // Tạo mới một phim với thông tin và đường dẫn ảnh + video
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
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Xóa phim
app.delete('/api/movies/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim' });
    if (movie.image) fs.unlinkSync(path.join(__dirname, movie.image));
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa phim thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Tìm kiếm phim
app.get('/api/movies/search', async (req, res) => {
  try {
    const searchQuery = req.query.search?.trim() || '';
    const filter = searchQuery ? { title: { $regex: searchQuery, $options: 'i' } } : {};
    res.json(await Movie.find(filter));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Lấy chi tiết phim
app.get('/api/movies/detail/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim' });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Sửa phim
app.put('/api/movies/:id', verifyToken, isAdmin, upload.fields([{ name: 'image' }, { name: 'video' }]), async (req, res) => {
  try {
    const { title, genre, description } = req.body;
    const movieId = req.params.id;
    console.log("Sửa phim thành công");
    // Kiểm tra nếu phim tồn tại
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: 'Phim không tồn tại' });

    // Kiểm tra yêu cầu đầu vào
    if (!title || !genre || !description) {
      return res.status(400).json({ message: 'Thiếu thông tin phim' });
    }

    // Cập nhật các trường phim
    movie.title = title;
    movie.genre = genre;
    movie.description = description;

    // Cập nhật ảnh và video nếu có
    if (req.files['image']) {
      // Xóa ảnh cũ nếu có
      if (movie.image) {
        fs.unlinkSync(path.join(__dirname, movie.image));
      }
      movie.image = `/uploads/${req.files['image'][0].filename}`;
    }

    if (req.files['video']) {
      // Xóa video cũ nếu có
      if (movie.video) {
        fs.unlinkSync(path.join(__dirname, movie.video));
      }
      movie.video = `/uploads/${req.files['video'][0].filename}`;
    }

    // Lưu lại phim đã cập nhật
    await movie.save();
    res.status(200).json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi sửa phim', error });
  }
});
// API Thêm đánh giá phim
app.post('/api/movies/review/:id', async (req, res) => {
  try {
    const { rating, comment, username } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim' });
    const newReview = { username, rating, comment, date: new Date() };
    movie.reviews = [...(movie.reviews || []), newReview];
    await movie.save();
    res.status(201).json({ message: 'Thêm đánh giá thành công', reviews: movie.reviews });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi thêm đánh giá' });
  }
});


let refreshTokens = [];

app.post('/api/token', (req, res) => {
  const { token } = req.body;
  if (!token || !refreshTokens.includes(token)) return res.sendStatus(403);

  jwt.verify(token, 'refreshSecretKey', (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = jwt.sign({ id: user.id, role: user.role }, 'secretKey', { expiresIn: '15m' });
    res.json({ accessToken });
  });
});


// Khởi động server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server chạy trên cổng ${PORT}`));