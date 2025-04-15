const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log("Authorization Header:", authHeader); // Debug

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Không có token hoặc token không hợp lệ' });
  }

  const token = authHeader.split(' ')[1];
  console.log("Token nhận được:", token); // Debug token

  jwt.verify(token, 'secretKey', (err, decoded) => {
    if (err) {
      console.error('Lỗi xác thực token:', err);
      return res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ' });
    }

    console.log("User decoded từ token:", decoded); // Debug user từ token

    // Kiểm tra xem token có chứa name hoặc username không
    if (!decoded.name && !decoded.username) {
      console.error("Token không chứa tên người dùng");
    }

    req.user = decoded; // Gán thông tin user vào request
    next();
  });
};


const isAdmin = (req, res, next) => {
  // Kiểm tra quyền admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới được phép' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
