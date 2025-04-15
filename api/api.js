const User = require('./models/User'); // Đường dẫn tới model User
const bcrypt = require('bcrypt');

// Tạo tài khoản admin nếu chưa có
const createAdmin = async () => {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    });
    await adminUser.save();
    console.log('✅ Tài khoản admin đã được tạo!');
  } else {
    console.log('⚡ Admin đã tồn tại');
  }
};


createAdmin();
