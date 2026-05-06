const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const sessionMiddleware = session({
  secret: 'classroom-seat-booking-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'views');

// Session configuration
app.use(sessionMiddleware);

// Define paths
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const LAYOUT_FILE = path.join(__dirname, 'seat-layout.json');
const POSITIONS_FILE = path.join(__dirname, 'seat-positions.json');
const ROOM_SIZE_FILE = path.join(__dirname, 'room-size.json');
const ADMIN_PIN = '1234'; // Admin PIN
const DEFAULT_ROOM_SIZE = {
  width: 1400,
  height: 900
};
const DEFAULT_SEAT_LAYOUT = [
  'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3',
  'D1', 'D2', 'D3', 'E1', 'E2', 'E3', 'F1', 'F2', 'F3',
  'G1', 'G2', 'G3', 'H1', 'H2', 'H3', 'I1', 'I2', 'I3',
  'J1', 'J2', 'J3', 'K1', 'K2', 'K3', 'L1', 'L2', 'L3',
  'M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'O1', 'O2', 'O3'
];

// ========================
// Middleware - Authentication
// ========================

function checkAdminAuth(req, res, next) {
  const adminPin = req.session?.adminPin;
  if (adminPin === ADMIN_PIN) {
    next();
  } else {
    res.redirect('/admin-login');
  }
}

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

function isAdminSocket(socket) {
  return socket.request?.session?.adminPin === ADMIN_PIN;
}

// ========================
// File Operations
// ========================

/**
 * อ่านข้อมูลการจองจากไฟล์ JSON
 */
function readBookings() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading bookings:', error);
    return [];
  }
}

/**
 * เขียนข้อมูลการจองลงไฟล์ JSON
 */
function writeBookings(bookings) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing bookings:', error);
    return false;
  }
}

/**
 * อ่านลำดับผังโต๊ะจากไฟล์ JSON
 */
function readSeatLayout() {
  try {
    if (fs.existsSync(LAYOUT_FILE)) {
      const data = fs.readFileSync(LAYOUT_FILE, 'utf-8');
      const layout = JSON.parse(data);
      if (Array.isArray(layout)) {
        return layout;
      }
    }

    return [];
  } catch (error) {
    console.error('Error reading seat layout:', error);
    return [];
  }
}

/**
 * อ่านตำแหน่งโต๊ะจากไฟล์ JSON
 */
function readSeatPositions() {
  try {
    if (fs.existsSync(POSITIONS_FILE)) {
      const data = fs.readFileSync(POSITIONS_FILE, 'utf-8');
      const positions = JSON.parse(data);
      if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
        return positions;
      }
    }

    return {};
  } catch (error) {
    console.error('Error reading seat positions:', error);
    return {};
  }
}

/**
 * เขียนตำแหน่งโต๊ะลงไฟล์ JSON
 */
function writeSeatPositions(positions) {
  try {
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing seat positions:', error);
    return false;
  }
}

/**
 * เขียนลำดับผังโต๊ะลงไฟล์ JSON
 */
function writeSeatLayout(layout) {
  try {
    fs.writeFileSync(LAYOUT_FILE, JSON.stringify(layout, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing seat layout:', error);
    return false;
  }
}

function isValidSeatLayout(layout) {
  if (!Array.isArray(layout)) {
    return false;
  }

  const seatPattern = /^[A-Z]+[1-3]$/;
  const uniqueSeats = new Set(layout);

  if (uniqueSeats.size !== layout.length) {
    return false;
  }

  return layout.every(seatId => seatPattern.test(seatId));
}

function isValidSeatPositions(layout, positions) {
  if (!positions || typeof positions !== 'object' || Array.isArray(positions)) {
    return false;
  }

  const seatIds = new Set(layout);
  const positionKeys = Object.keys(positions);

  if (positionKeys.length !== layout.length) {
    return false;
  }

  return positionKeys.every((seatId) => {
    if (!seatIds.has(seatId)) {
      return false;
    }

    const position = positions[seatId];
    return position
      && Number.isFinite(position.x)
      && Number.isFinite(position.y);
  });
}

function normalizeRoomSize(roomSize) {
  return {
    width: Math.round(Number(roomSize.width)),
    height: Math.round(Number(roomSize.height))
  };
}

function isValidRoomSize(roomSize) {
  if (!roomSize || typeof roomSize !== 'object' || Array.isArray(roomSize)) {
    return false;
  }

  const nextRoomSize = normalizeRoomSize(roomSize);
  return Number.isFinite(nextRoomSize.width)
    && Number.isFinite(nextRoomSize.height)
    && nextRoomSize.width >= 960
    && nextRoomSize.width <= 5000
    && nextRoomSize.height >= 720
    && nextRoomSize.height <= 3500;
}

function readRoomSize() {
  try {
    if (fs.existsSync(ROOM_SIZE_FILE)) {
      const data = fs.readFileSync(ROOM_SIZE_FILE, 'utf-8');
      const roomSize = JSON.parse(data);
      if (isValidRoomSize(roomSize)) {
        return normalizeRoomSize(roomSize);
      }
    }

    return { ...DEFAULT_ROOM_SIZE };
  } catch (error) {
    console.error('Error reading room size:', error);
    return { ...DEFAULT_ROOM_SIZE };
  }
}

function writeRoomSize(roomSize) {
  try {
    fs.writeFileSync(ROOM_SIZE_FILE, JSON.stringify(roomSize, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing room size:', error);
    return false;
  }
}

/**
 * ค้นหาว่า seatId ถูกจองแล้วหรือไม่
 */
function isSeatBooked(seatId) {
  const bookings = readBookings();
  return bookings.some(booking => booking.seatId === seatId);
}

/**
 * บันทึกการจองใหม่
 */
function addBooking(seatId, nickname) {
  // ตรวจสอบว่าที่นั่งถูกจองแล้วหรือไม่
  if (isSeatBooked(seatId)) {
    return { success: false, message: 'ที่นั่งนี้ถูกจองแล้ว' };
  }

  const bookings = readBookings();
  const newBooking = {
    seatId,
    nickname,
    timestamp: new Date().toISOString()
  };

  bookings.push(newBooking);

  if (writeBookings(bookings)) {
    return { success: true, message: 'จองที่นั่งสำเร็จ', booking: newBooking };
  } else {
    return { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

/**
 * ยกเลิกการจอง
 */
function cancelBooking(seatId) {
  const bookings = readBookings();
  const initialLength = bookings.length;
  const filtered = bookings.filter(booking => booking.seatId !== seatId);

  if (filtered.length < initialLength) {
    writeBookings(filtered);
    return { success: true, message: 'ยกเลิกการจองสำเร็จ' };
  } else {
    return { success: false, message: 'ไม่พบการจองนี้' };
  }
}

// ========================
// Routes
// ========================

app.get('/', (req, res) => {
  res.render('index');
});

// Summary Page
app.get(['/summary', '/sumerry'], (req, res) => {
  res.render('summary');
});

// Help Page
app.get('/help', (req, res) => {
  res.render('help');
});

// Admin Login Page
app.get('/admin-login', (req, res) => {
  res.render('admin-login', { error: null });
});

// Admin Login POST
app.post('/admin-login', (req, res) => {
  const { pin } = req.body;

  if (pin === ADMIN_PIN) {
    req.session.adminPin = pin;
    res.redirect('/admin');
  } else {
    res.render('admin-login', { error: 'รหัส PIN ไม่ถูกต้อง' });
  }
});

// Admin Dashboard
app.get('/admin', checkAdminAuth, (req, res) => {
  res.render('admin');
});

// Admin Logout
app.get('/admin-logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/api/bookings', (req, res) => {
  const bookings = readBookings();
  res.json(bookings);
});

app.get('/api/layout', (req, res) => {
  res.json({
    seats: readSeatLayout(),
    positions: readSeatPositions(),
    roomSize: readRoomSize()
  });
});

app.put('/api/layout', checkAdminAuth, (req, res) => {
  const { seats, positions } = req.body;
  const currentRoomSize = readRoomSize();
  const hasRoomSize = Object.prototype.hasOwnProperty.call(req.body, 'roomSize');
  const roomSize = hasRoomSize ? req.body.roomSize : currentRoomSize;

  if (!isValidSeatLayout(seats)) {
    return res.status(400).json({
      success: false,
      message: 'รูปแบบผังโต๊ะไม่ถูกต้อง'
    });
  }

  if (!isValidSeatPositions(seats, positions || {})) {
    return res.status(400).json({
      success: false,
      message: 'ตำแหน่งโต๊ะไม่ถูกต้อง'
    });
  }

  if (hasRoomSize && !isValidRoomSize(roomSize)) {
    return res.status(400).json({
      success: false,
      message: 'ขนาดห้องไม่ถูกต้อง'
    });
  }

  const nextRoomSize = hasRoomSize ? normalizeRoomSize(roomSize) : currentRoomSize;

  const bookedSeatIds = new Set(readBookings().map(booking => booking.seatId));
  const nextSeatIds = new Set(seats);

  const missingBookedSeat = [...bookedSeatIds].find(seatId => !nextSeatIds.has(seatId));
  if (missingBookedSeat) {
    return res.status(409).json({
      success: false,
      message: `ลบโต๊ะนี้ไม่ได้ เพราะมีการจองที่นั่ง ${missingBookedSeat} อยู่`
    });
  }

  const result = writeSeatLayout(seats);
  const positionsResult = writeSeatPositions(positions || {});
  const roomSizeResult = writeRoomSize(nextRoomSize);

  if (!result || !positionsResult || !roomSizeResult) {
    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถบันทึกผังโต๊ะได้'
    });
  }

  io.emit('layout-updated', {
    seats,
    positions: positions || {},
    roomSize: nextRoomSize
  });

  res.json({ success: true, seats, positions: positions || {}, roomSize: nextRoomSize });
});

app.post('/api/bookings', (req, res) => {
  const { seatId, nickname } = req.body;

  if (!seatId || !nickname) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const result = addBooking(seatId, nickname);
  res.json(result);
});

app.delete('/api/bookings/:seatId', (req, res) => {
  if (req.session?.adminPin !== ADMIN_PIN) {
    return res.status(403).json({ success: false, message: 'เฉพาะแอดมินเท่านั้น' });
  }

  const { seatId } = req.params;
  const result = cancelBooking(seatId);
  res.json(result);
});

// ========================
// Socket.io Events
// ========================

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // ส่งข้อมูลการจองทั้งหมดให้กับ client ที่เชื่อมต่อใหม่
  const bookings = readBookings();
  socket.emit('load-bookings', bookings);

  // Event: เมื่อ client ส่งการจองใหม่
  socket.on('book-seat', (data) => {
    const { seatId, nickname } = data;

    // ตรวจสอบการจองซ้ำ
    if (isSeatBooked(seatId)) {
      io.emit('booking-failed', {
        seatId,
        message: 'ที่นั่งนี้ถูกจองแล้ว'
      });
      return;
    }

    // บันทึกการจอง
    const result = addBooking(seatId, nickname);

    if (result.success) {
      // ส่งไปยังทุก client (Real-time Update)
      io.emit('booking-success', {
        seatId,
        nickname,
        timestamp: result.booking.timestamp,
        message: 'จองที่นั่งสำเร็จ'
      });
      console.log(`Seat ${seatId} booked by ${nickname}`);
    } else {
      io.emit('booking-failed', {
        seatId,
        message: result.message
      });
    }
  });

  // Event: เมื่อ client ยกเลิกการจอง
  socket.on('cancel-booking', (seatId) => {
    if (!isAdminSocket(socket)) {
      socket.emit('cancel-failed', {
        seatId,
        message: 'เฉพาะแอดมินเท่านั้น'
      });
      return;
    }

    const result = cancelBooking(seatId);

    if (result.success) {
      // ส่งไปยังทุก client (Real-time Update)
      io.emit('cancel-success', {
        seatId,
        message: 'ยกเลิกการจองสำเร็จ'
      });
      console.log(`Seat ${seatId} booking cancelled`);
    } else {
      io.emit('cancel-failed', {
        seatId,
        message: result.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ========================
// Server Start
// ========================

const PORT = process.env.PORT || 25123;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Bookings file location:', BOOKINGS_FILE);
});
