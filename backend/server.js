// ============================================================
// SATPUDA VALLEY INTERNATIONAL PUBLIC SCHOOL - COMPLETE BACKEND
// All Models + Routes + Auth + Seed in ONE file
// ============================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan('dev'));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 1000,
  message: { success: false, message: 'Too many requests' }
}));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 15,
  message: { success: false, message: 'Too many login attempts' }
}));

// Uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'misc';
    const dir = path.join(uploadsDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|gif|pdf|doc|docx|xlsx|xls|csv/.test(
      path.extname(file.originalname).toLowerCase()
    );
    cb(ok ? null : new Error('File type not allowed'), ok);
  }
});

// Razorpay setup
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Nodemailer
let mailer = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  const nodemailer = require('nodemailer');
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// ============================================================
// DATABASE
// ============================================================
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

// ============================================================
// MODELS
// ============================================================
// ============ USER MODEL ============
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  phone: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
// ============ END USER MODEL ============

const Notice = mongoose.model('Notice', new mongoose.Schema({
  title: { type: String, required: true },
  titleHi: { type: String, default: '' },
  content: { type: String, required: true },
  contentHi: { type: String, default: '' },
  category: { type: String, default: 'General' },
  isTicker: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 5 },
  publishDate: { type: Date, default: Date.now }
}, { timestamps: true }));

const Enquiry = mongoose.model('Enquiry', new mongoose.Schema({
  parentName: { type: String, required: true },
  childName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  grade: { type: String, required: true },
  medium: { type: String, required: true },
  village: { type: String, required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['new', 'contacted', 'follow-up', 'admitted', 'rejected'], default: 'new' },
  notes: { type: String, default: '' },
  ipAddress: String
}, { timestamps: true }));

const Video = mongoose.model('Video', new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  thumbnail: { type: String, default: '' },
  badge: { type: String, default: 'Recent Video' },
  category: { type: String, default: 'Event' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true }));

const Gallery = mongoose.model('Gallery', new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  category: { type: String, default: 'Campus' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true }));

const Download = mongoose.model('Download', new mongoose.Schema({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, default: 'PDF' },
  fileSize: { type: String, default: '' },
  category: { type: String, default: 'Other' },
  isActive: { type: Boolean, default: true },
  downloads: { type: Number, default: 0 }
}, { timestamps: true }));

const Faculty = mongoose.model('Faculty', new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  qualification: { type: String, default: '' },
  subject: { type: String, default: '' },
  experience: { type: String, default: '' },
  photo: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true }));

const Fee = mongoose.model('Fee', new mongoose.Schema({
  classRange: { type: String, required: true },
  amount: { type: Number, required: true },
  features: [String],
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true }));

const Event = mongoose.model('Event', new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  eventDate: { type: Date, required: true },
  endDate: { type: Date },
  venue: { type: String, default: '' },
  category: { type: String, default: 'Event' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const Testimonial = mongoose.model('Testimonial', new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Parent' },
  message: { type: String, required: true },
  location: { type: String, default: '' },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  photo: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const Achievement = mongoose.model('Achievement', new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Academic' },
  year: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const News = mongoose.model('News', new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, default: '' },
  category: { type: String, default: 'General' },
  imageUrl: { type: String, default: '' },
  isPublished: { type: Boolean, default: true },
  views: { type: Number, default: 0 }
}, { timestamps: true }));

const Holiday = mongoose.model('Holiday', new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  description: { type: String, default: '' },
  type: { type: String, default: 'Holiday' }
}, { timestamps: true }));

const Job = mongoose.model('Job', new mongoose.Schema({
  position: { type: String, required: true },
  description: { type: String, default: '' },
  qualification: { type: String, default: '' },
  experience: { type: String, default: '' },
  salary: { type: String, default: '' },
  lastDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const Alumni = mongoose.model('Alumni', new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: String, required: true },
  currentOccupation: { type: String, default: '' },
  city: { type: String, default: '' },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  message: { type: String, default: '' },
  status: { type: String, default: 'pending' }
}, { timestamps: true }));

const Album = mongoose.model('Album', new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  photos: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const Payment = mongoose.model('Payment', new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String },
  studentName: { type: String, required: true },
  rollNo: { type: String, required: true },
  className: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  amount: { type: Number, required: true },
  purpose: { type: String, default: 'Tuition Fee' },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  receipt: { type: String },
  notes: { type: String, default: '' }
}, { timestamps: true }));

const Timetable = mongoose.model('Timetable', new mongoose.Schema({
  className: { type: String, required: true },
  day: { type: String, required: true },
  periods: [{
    period: { type: String, required: true },
    time: { type: String, default: '' },
    subject: { type: String, required: true },
    teacher: { type: String, default: '' }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

Timetable.schema.index({ className: 1, day: 1 }, { unique: true });

const LiveClass = mongoose.model('LiveClass', new mongoose.Schema({
  title: { type: String, required: true },
  className: { type: String, required: true },
  subject: { type: String, default: '' },
  teacher: { type: String, default: '' },
  meetLink: { type: String, required: true },
  startTime: { type: Date, required: true },
  duration: { type: Number, default: 45 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  rollNo: { type: String, required: true },
  studentName: { type: String, default: '' },
  className: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'leave', 'late'], default: 'present' },
  remarks: { type: String, default: '' }
}, { timestamps: true }));

Attendance.schema.index({ rollNo: 1, className: 1, date: 1 }, { unique: true });

// ============================================================
// MIDDLEWARE FUNCTIONS
// ============================================================
const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Login required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errs.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const asyncH = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================
// AUTH ROUTES
// ============================================================
app.post('/api/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  asyncH(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || '7d'
    });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  })
);

app.get('/api/auth/me', protect, (req, res) =>
  res.json({ success: true, user: req.user })
);

app.post('/api/auth/logout', (req, res) => {
  res.cookie('token', '', { maxAge: 1 });
  res.json({ success: true });
});

app.post('/api/auth/change-password', protect,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  asyncH(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password wrong' });
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  })
);

// ============================================================
// NOTICES
// ============================================================
app.get('/api/notices', asyncH(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.ticker === 'true') filter.isTicker = true;
  if (req.query.category) filter.category = req.query.category;
  const notices = await Notice.find(filter).sort({ priority: -1, publishDate: -1 });
  res.json({ success: true, notices });
}));

app.post('/api/notices', protect, asyncH(async (req, res) => {
  const n = await Notice.create(req.body);
  res.status(201).json({ success: true, notice: n });
}));

app.put('/api/notices/:id', protect, asyncH(async (req, res) => {
  const n = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, notice: n });
}));

app.delete('/api/notices/:id', protect, asyncH(async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// ENQUIRIES
// ============================================================
app.post('/api/enquiries',
  [
    body('parentName').trim().notEmpty(),
    body('childName').trim().notEmpty(),
    body('phone').matches(/^[0-9]{10}$/),
    body('grade').notEmpty(),
    body('medium').notEmpty(),
    body('village').trim().notEmpty()
  ],
  validate,
  asyncH(async (req, res) => {
    const e = await Enquiry.create({ ...req.body, ipAddress: req.ip });

    // Send email notification
    if (mailer && process.env.ADMIN_EMAIL) {
      mailer.sendMail({
        from: `"Satpuda Valley School" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🎓 New Admission Enquiry - ${e.childName}`,
        html: `
          <div style="font-family:Arial;max-width:600px;padding:20px;background:#f9fafb;border-radius:10px">
            <div style="background:#114b27;color:#fff;padding:15px;border-radius:8px;text-align:center">
              <h2 style="margin:0">New Admission Enquiry</h2>
            </div>
            <table style="width:100%;margin-top:20px;font-size:14px;background:#fff;padding:15px;border-radius:8px">
              <tr><td style="padding:8px;font-weight:bold;width:140px">Parent:</td><td>${e.parentName}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Student:</td><td>${e.childName}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Phone:</td><td>${e.phone}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Class:</td><td>${e.grade}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Medium:</td><td>${e.medium}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Village:</td><td>${e.village}</td></tr>
            </table>
          </div>
        `
      }).catch(err => console.error('Email failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted!',
      enquiryId: e._id
    });
  })
);

app.get('/api/enquiries', protect, asyncH(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(500);
  const total = await Enquiry.countDocuments(filter);
  res.json({ success: true, total, enquiries });
}));

app.put('/api/enquiries/:id', protect, asyncH(async (req, res) => {
  const e = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, enquiry: e });
}));

app.delete('/api/enquiries/:id', protect, asyncH(async (req, res) => {
  await Enquiry.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// VIDEOS
// ============================================================
app.get('/api/videos', asyncH(async (req, res) => {
  const videos = await Video.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, videos });
}));

app.post('/api/videos', protect, asyncH(async (req, res) => {
  const v = await Video.create(req.body);
  res.status(201).json({ success: true, video: v });
}));

app.put('/api/videos/:id', protect, asyncH(async (req, res) => {
  const v = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, video: v });
}));

app.delete('/api/videos/:id', protect, asyncH(async (req, res) => {
  await Video.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// GALLERY
// ============================================================
app.get('/api/gallery', asyncH(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  const images = await Gallery.find(filter).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, images });
}));

app.post('/api/gallery', protect,
  (req, res, next) => { req.uploadFolder = 'gallery'; next(); },
  upload.single('image'),
  asyncH(async (req, res) => {
    const imageUrl = req.file
      ? `/uploads/gallery/${req.file.filename}`
      : req.body.imageUrl;
    const g = await Gallery.create({ ...req.body, imageUrl });
    res.status(201).json({ success: true, item: g });
  })
);

app.delete('/api/gallery/:id', protect, asyncH(async (req, res) => {
  await Gallery.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// DOWNLOADS
// ============================================================
app.get('/api/downloads', asyncH(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  const files = await Download.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, files });
}));

app.post('/api/downloads', protect,
  (req, res, next) => { req.uploadFolder = 'downloads'; next(); },
  upload.single('file'),
  asyncH(async (req, res) => {
    const fileUrl = req.file
      ? `/uploads/downloads/${req.file.filename}`
      : req.body.fileUrl;
    const fileType = req.file
      ? path.extname(req.file.originalname).substring(1).toUpperCase()
      : 'PDF';
    const d = await Download.create({ ...req.body, fileUrl, fileType });
    res.status(201).json({ success: true, item: d });
  })
);

app.delete('/api/downloads/:id', protect, asyncH(async (req, res) => {
  await Download.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// FACULTY
// ============================================================
app.get('/api/faculty', asyncH(async (req, res) => {
  const list = await Faculty.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, faculty: list });
}));

app.post('/api/faculty', protect,
  (req, res, next) => { req.uploadFolder = 'faculty'; next(); },
  upload.single('photo'),
  asyncH(async (req, res) => {
    const photo = req.file
      ? `/uploads/faculty/${req.file.filename}`
      : req.body.photo || '';
    const f = await Faculty.create({ ...req.body, photo });
    res.status(201).json({ success: true, faculty: f });
  })
);

app.put('/api/faculty/:id', protect, asyncH(async (req, res) => {
  const f = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, faculty: f });
}));

app.delete('/api/faculty/:id', protect, asyncH(async (req, res) => {
  await Faculty.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// FEES
// ============================================================
app.get('/api/fees', asyncH(async (req, res) => {
  const fees = await Fee.find({ isActive: true }).sort({ order: 1 });
  res.json({ success: true, fees });
}));

app.post('/api/fees', protect, asyncH(async (req, res) => {
  const fee = await Fee.create(req.body);
  res.status(201).json({ success: true, fee });
}));

app.put('/api/fees/:id', protect, asyncH(async (req, res) => {
  const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, fee });
}));

app.delete('/api/fees/:id', protect, asyncH(async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// EVENTS
// ============================================================
app.get('/api/events', asyncH(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.upcoming === 'true') filter.eventDate = { $gte: new Date() };
  const events = await Event.find(filter).sort({ eventDate: 1 });
  res.json({ success: true, events });
}));

app.post('/api/events', protect, asyncH(async (req, res) => {
  const event = await Event.create(req.body);
  res.status(201).json({ success: true, event });
}));

app.put('/api/events/:id', protect, asyncH(async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, event });
}));

app.delete('/api/events/:id', protect, asyncH(async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// TESTIMONIALS
// ============================================================
app.get('/api/testimonials', asyncH(async (req, res) => {
  const testimonials = await Testimonial.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, testimonials });
}));

app.post('/api/testimonials', protect,
  (req, res, next) => { req.uploadFolder = 'testimonials'; next(); },
  upload.single('photo'),
  asyncH(async (req, res) => {
    const photo = req.file
      ? `/uploads/testimonials/${req.file.filename}`
      : req.body.photo || '';
    const t = await Testimonial.create({ ...req.body, photo });
    res.status(201).json({ success: true, testimonial: t });
  })
);

app.delete('/api/testimonials/:id', protect, asyncH(async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// ACHIEVEMENTS
// ============================================================
app.get('/api/achievements', asyncH(async (req, res) => {
  const achievements = await Achievement.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, achievements });
}));

app.post('/api/achievements', protect,
  (req, res, next) => { req.uploadFolder = 'achievements'; next(); },
  upload.single('image'),
  asyncH(async (req, res) => {
    const imageUrl = req.file
      ? `/uploads/achievements/${req.file.filename}`
      : req.body.imageUrl || '';
    const a = await Achievement.create({ ...req.body, imageUrl });
    res.status(201).json({ success: true, achievement: a });
  })
);

app.delete('/api/achievements/:id', protect, asyncH(async (req, res) => {
  await Achievement.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// NEWS
// ============================================================
app.get('/api/news', asyncH(async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.category) filter.category = req.query.category;
  const news = await News.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, news });
}));

app.get('/api/news/:slug', asyncH(async (req, res) => {
  const n = await News.findOne({ slug: req.params.slug, isPublished: true });
  if (!n) return res.status(404).json({ success: false, message: 'Not found' });
  n.views = (n.views || 0) + 1;
  await n.save();
  res.json({ success: true, news: n });
}));

app.post('/api/news', protect,
  (req, res, next) => { req.uploadFolder = 'news'; next(); },
  upload.single('image'),
  asyncH(async (req, res) => {
    const imageUrl = req.file
      ? `/uploads/news/${req.file.filename}`
      : req.body.imageUrl || '';
    let slug = req.body.slug ||
      req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const baseSlug = slug;
    let counter = 1;
    while (await News.findOne({ slug })) slug = `${baseSlug}-${counter++}`;
    const n = await News.create({ ...req.body, slug, imageUrl });
    res.status(201).json({ success: true, news: n });
  })
);

app.delete('/api/news/:id', protect, asyncH(async (req, res) => {
  await News.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// HOLIDAYS
// ============================================================
app.get('/api/holidays', asyncH(async (req, res) => {
  const holidays = await Holiday.find().sort({ date: 1 });
  res.json({ success: true, holidays });
}));

app.post('/api/holidays', protect, asyncH(async (req, res) => {
  const h = await Holiday.create(req.body);
  res.status(201).json({ success: true, holiday: h });
}));

app.delete('/api/holidays/:id', protect, asyncH(async (req, res) => {
  await Holiday.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// CAREERS
// ============================================================
app.get('/api/careers', asyncH(async (req, res) => {
  const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, jobs });
}));

app.post('/api/careers', protect, asyncH(async (req, res) => {
  const j = await Job.create(req.body);
  res.status(201).json({ success: true, job: j });
}));

app.delete('/api/careers/:id', protect, asyncH(async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// ALUMNI
// ============================================================
app.post('/api/alumni',
  [
    body('name').trim().notEmpty(),
    body('batch').trim().notEmpty(),
    body('phone').matches(/^[0-9]{10}$/)
  ],
  validate,
  asyncH(async (req, res) => {
    const a = await Alumni.create(req.body);
    res.status(201).json({ success: true, message: 'Registration submitted!', alumniId: a._id });
  })
);

app.get('/api/alumni', protect, asyncH(async (req, res) => {
  const list = await Alumni.find().sort({ createdAt: -1 });
  const total = await Alumni.countDocuments();
  res.json({ success: true, total, alumni: list });
}));

app.put('/api/alumni/:id', protect, asyncH(async (req, res) => {
  const a = await Alumni.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, alumni: a });
}));

app.delete('/api/alumni/:id', protect, asyncH(async (req, res) => {
  await Alumni.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// ALBUMS
// ============================================================
app.get('/api/albums', asyncH(async (req, res) => {
  const albums = await Album.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ success: true, albums });
}));

app.get('/api/albums/:id', asyncH(async (req, res) => {
  const album = await Album.findById(req.params.id);
  if (!album) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, album });
}));

app.post('/api/albums', protect, asyncH(async (req, res) => {
  const album = await Album.create({
    name: req.body.name,
    description: req.body.description || '',
    photos: []
  });
  res.status(201).json({ success: true, album });
}));

app.post('/api/albums/:id/photos', protect,
  (req, res, next) => { req.uploadFolder = 'albums'; next(); },
  upload.array('photos', 20),
  asyncH(async (req, res) => {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found' });
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No photos uploaded' });
    }
    files.forEach(f => {
      album.photos.push({ url: `/uploads/albums/${f.filename}`, caption: '' });
    });
    if (!album.coverImage && album.photos.length > 0) {
      album.coverImage = album.photos[0].url;
    }
    await album.save();
    res.json({ success: true, album });
  })
);

app.delete('/api/albums/:albumId/photos/:photoId', protect, asyncH(async (req, res) => {
  const album = await Album.findById(req.params.albumId);
  if (!album) return res.status(404).json({ success: false, message: 'Album not found' });
  album.photos = album.photos.filter(p => p._id.toString() !== req.params.photoId);
  await album.save();
  res.json({ success: true, album });
}));

app.delete('/api/albums/:id', protect, asyncH(async (req, res) => {
  await Album.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// PAYMENTS
// ============================================================
app.post('/api/payments/create-order', asyncH(async (req, res) => {
  if (!razorpay) {
    return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
  }
  const { studentName, rollNo, className, phone, email, amount, purpose } = req.body;
  if (!studentName || !rollNo || !className || !phone || !amount) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  if (amount < 1 || amount > 100000) {
    return res.status(400).json({ success: false, message: 'Amount must be ₹1 - ₹1,00,000' });
  }

  try {
    const receipt = `SV-${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes: { studentName, rollNo, className, purpose: purpose || 'Tuition Fee' }
    });

    await Payment.create({
      orderId: order.id,
      studentName, rollNo, className, phone,
      email: email || '',
      amount,
      purpose: purpose || 'Tuition Fee',
      receipt,
      status: 'created'
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
}));

app.post('/api/payments/verify', asyncH(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { status: 'failed' }
    );
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const payment = await Payment.findOneAndUpdate(
    { orderId: razorpay_order_id },
    { status: 'paid', paymentId: razorpay_payment_id },
    { new: true }
  );
  res.json({ success: true, payment, message: 'Payment successful!' });
}));

app.get('/api/payments/status/:orderId', asyncH(async (req, res) => {
  const payment = await Payment.findOne({ orderId: req.params.orderId });
  if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, payment });
}));

app.get('/api/payments', protect, asyncH(async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 }).limit(500);
  const total = await Payment.countDocuments();
  const paid = await Payment.countDocuments({ status: 'paid' });
  const totalCollected = await Payment.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } }
  ]);
  res.json({
    success: true,
    total,
    paid,
    totalCollected: totalCollected[0]?.sum || 0,
    payments
  });
}));

app.delete('/api/payments/:id', protect, asyncH(async (req, res) => {
  await Payment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// Payment Receipt
app.get('/api/payments/:orderId/receipt', asyncH(async (req, res) => {
  const payment = await Payment.findOne({ orderId: req.params.orderId, status: 'paid' });
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Receipt not found' });
  }
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt - ${payment.receipt}</title>
<style>
body{font-family:Arial;padding:40px;background:#f9fafb;color:#111}
.card{max-width:600px;margin:auto;background:#fff;padding:40px;border:3px solid #114b27;border-radius:12px}
h1{color:#0a341b;text-align:center;font-size:22px;margin:0}
.sub{text-align:center;font-size:11px;color:#666;margin-top:4px}
.badge{display:inline-block;padding:4px 14px;background:#10b981;color:#fff;font-size:10px;font-weight:bold;border-radius:20px;margin:15px auto;text-align:center}
table{width:100%;margin-top:20px;font-size:13px;border-collapse:collapse}
td{padding:10px;border-bottom:1px solid #eee}
td:first-child{font-weight:bold;color:#555;width:40%}
.total{background:#f2f9f4;padding:15px;border-radius:8px;text-align:center;font-size:24px;color:#114b27;font-weight:900;margin-top:20px}
.footer{text-align:center;font-size:10px;color:#888;margin-top:30px}
@media print{body{background:#fff;padding:0}.card{border-width:2px}}
</style></head><body>
<div class="card">
<h1>Satpuda Valley International Public School</h1>
<p class="sub">Shivnagar Colony, Harrai Road, Batkakhapa - 480224, M.P.</p>
<p class="sub">Phone: +91 94078 96997 | Email: info@satpudavalleyschool.com</p>
<div style="text-align:center"><span class="badge">✓ PAYMENT RECEIPT</span></div>
<table>
<tr><td>Receipt No:</td><td>${payment.receipt}</td></tr>
<tr><td>Student Name:</td><td>${payment.studentName}</td></tr>
<tr><td>Roll No:</td><td>${payment.rollNo}</td></tr>
<tr><td>Class:</td><td>${payment.className}</td></tr>
<tr><td>Purpose:</td><td>${payment.purpose}</td></tr>
<tr><td>Phone:</td><td>${payment.phone}</td></tr>
<tr><td>Payment ID:</td><td>${payment.paymentId || '-'}</td></tr>
<tr><td>Date:</td><td>${new Date(payment.createdAt).toLocaleString('en-IN')}</td></tr>
</table>
<div class="total">₹ ${payment.amount.toLocaleString('en-IN')} PAID</div>
<p class="footer">This is a computer-generated receipt. For queries contact school office.</p>
<p style="text-align:center"><button onclick="window.print()" style="padding:8px 20px;background:#114b27;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer">🖨️ Print Receipt</button></p>
</div></body></html>`;
  res.header('Content-Type', 'text/html');
  res.send(html);
}));

// ============================================================
// TIMETABLE
// ============================================================
app.get('/api/timetable', asyncH(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.className) filter.className = req.query.className;
  const list = await Timetable.find(filter).sort({ className: 1, day: 1 });
  res.json({ success: true, timetable: list });
}));

app.get('/api/timetable/:className', asyncH(async (req, res) => {
  const list = await Timetable.find({
    className: req.params.className,
    isActive: true
  }).sort({ day: 1 });
  res.json({ success: true, timetable: list });
}));

app.post('/api/timetable', protect, asyncH(async (req, res) => {
  const { className, day, periods } = req.body;
  const t = await Timetable.findOneAndUpdate(
    { className, day },
    { className, day, periods },
    { upsert: true, new: true }
  );
  res.status(201).json({ success: true, timetable: t });
}));

app.delete('/api/timetable/:id', protect, asyncH(async (req, res) => {
  await Timetable.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// LIVE CLASSES
// ============================================================
app.get('/api/live-classes', asyncH(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.className) filter.className = req.query.className;
  const list = await LiveClass.find(filter).sort({ startTime: 1 });
  res.json({ success: true, liveClasses: list });
}));

app.post('/api/live-classes', protect, asyncH(async (req, res) => {
  const c = await LiveClass.create(req.body);
  res.status(201).json({ success: true, liveClass: c });
}));

app.delete('/api/live-classes/:id', protect, asyncH(async (req, res) => {
  await LiveClass.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ============================================================
// ATTENDANCE
// ============================================================
app.post('/api/attendance/bulk', protect, asyncH(async (req, res) => {
  const { className, date, records } = req.body;
  if (!className || !date || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'class, date, records required' });
  }
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let saved = 0;
  for (const r of records) {
    if (!r.rollNo || !r.status) continue;
    await Attendance.findOneAndUpdate(
      { rollNo: r.rollNo, className, date: { $gte: dayStart, $lt: dayEnd } },
      {
        rollNo: r.rollNo,
        studentName: r.studentName || '',
        className,
        date: dayStart,
        status: r.status,
        remarks: r.remarks || ''
      },
      { upsert: true }
    );
    saved++;
  }
  res.json({ success: true, count: saved, message: `${saved} records saved` });
}));

app.get('/api/attendance/:rollNo/:className', asyncH(async (req, res) => {
  const { rollNo, className } = req.params;
  const { month, year } = req.query;

  const filter = { rollNo, className };
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    filter.date = { $gte: start, $lt: end };
  }
  const records = await Attendance.find(filter).sort({ date: -1 }).limit(200);

  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const total = records.length;
  const percent = total ? ((present / total) * 100).toFixed(1) : 0;

  res.json({ success: true, total, present, percentage: percent, records });
}));

app.get('/api/attendance/class/:className', protect, asyncH(async (req, res) => {
  const { className } = req.params;
  const { date } = req.query;
  const dayStart = date ? new Date(date) : new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const records = await Attendance.find({
    className,
    date: { $gte: dayStart, $lt: dayEnd }
  });
  res.json({ success: true, records });
}));

// ============================================================
// CHATBOT
// ============================================================
const chatbotReplies = [
  { keys: ['bus', 'बस'], reply: 'हर्रई, बटकाखापा, धनौरा और आंदोल मार्गों पर बस सुविधा उपलब्ध है। कॉल: +91 94078 96997' },
  { keys: ['fee', 'फीस'], reply: 'फीस अत्यंत किफायती है और भाई-बहनों के लिए विशेष छूट उपलब्ध है।' },
  { keys: ['admission', 'प्रवेश'], reply: 'प्रवेश 2026-27 के लिए खुले हैं। ऑनलाइन फॉर्म वेबसाइट पर भरें या +91 94078 96997 पर कॉल करें।' },
  { keys: ['result', 'परिणाम'], reply: 'परिणाम देखने के लिए Results section में "Open Result Portal" button दबाएं।' },
  { keys: ['timing', 'समय'], reply: 'स्कूल समय: सुबह 8:00 से दोपहर 2:00 (सोम-शनि)।' },
  { keys: ['contact', 'संपर्क'], reply: 'संपर्क: +91 94078 96997 | बटकाखापा, हर्रई रोड - 480224' },
  { keys: ['hello', 'hi', 'नमस्ते'], reply: 'नमस्ते! सतपुड़ा वैली स्कूल के AI सहायक में आपका स्वागत है।' }
];

app.post('/api/chatbot', asyncH(async (req, res) => {
  const msg = (req.body.message || '').toLowerCase();
  if (!msg) return res.status(400).json({ success: false, message: 'Message required' });
  let reply = 'धन्यवाद! अधिक जानकारी के लिए +91 94078 96997 पर संपर्क करें।';
  for (const r of chatbotReplies) {
    if (r.keys.some(k => msg.includes(k))) { reply = r.reply; break; }
  }
  res.json({ success: true, reply });
}));

// ============================================================
// ANALYTICS
// ============================================================
app.get('/api/analytics/dashboard', protect, asyncH(async (req, res) => {
  const [
    totalEnquiries, newEnquiries, totalNotices, totalVideos,
    totalGalleryImages, totalFaculty, totalDownloads,
    totalAchievements, totalNews, totalHolidays,
    totalJobs, totalAlumni, totalPayments, totalPaid
  ] = await Promise.all([
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ status: 'new' }),
    Notice.countDocuments({ isActive: true }),
    Video.countDocuments({ isActive: true }),
    Gallery.countDocuments({ isActive: true }),
    Faculty.countDocuments({ isActive: true }),
    Download.countDocuments({ isActive: true }),
    Achievement.countDocuments({ isActive: true }),
    News.countDocuments({ isPublished: true }),
    Holiday.countDocuments(),
    Job.countDocuments({ isActive: true }),
    Alumni.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: 'paid' })
  ]);

  const revenueData = await Payment.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalRevenue = revenueData[0]?.total || 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyEnquiries = await Enquiry.countDocuments({ createdAt: { $gte: weekAgo } });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyPayments = await Payment.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const topClasses = await Enquiry.aggregate([
    { $group: { _id: '$grade', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const recentEnquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(5).lean();

  res.json({
    success: true,
    stats: {
      totalEnquiries, newEnquiries, weeklyEnquiries,
      totalNotices, totalVideos, totalGalleryImages, totalFaculty, totalDownloads,
      totalAchievements, totalNews, totalHolidays, totalJobs, totalAlumni,
      totalPayments, totalPaid, totalRevenue,
      monthlyPayments: monthlyPayments[0] || { total: 0, count: 0 },
      topClasses,
      recentEnquiries
    }
  });
}));

// ============================================================
// SITEMAP
// ============================================================
app.get('/sitemap.xml', asyncH(async (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://satpudaschool.netlify.app';

  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${baseUrl}/#about`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${baseUrl}/#results`, priority: '0.95', changefreq: 'weekly' },
    { loc: `${baseUrl}/#faculty`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/#fees`, priority: '0.85', changefreq: 'monthly' },
    { loc: `${baseUrl}/#events`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/#gallery`, priority: '0.75', changefreq: 'weekly' },
    { loc: `${baseUrl}/#news`, priority: '0.85', changefreq: 'daily' },
    { loc: `${baseUrl}/#careers`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${baseUrl}/#contact`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${baseUrl}/parent.html`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy.html`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${baseUrl}/terms.html`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${baseUrl}/grievance.html`, priority: '0.4', changefreq: 'yearly' },
    { loc: `${baseUrl}/anti-ragging.html`, priority: '0.4', changefreq: 'yearly' },
    { loc: `${baseUrl}/posh.html`, priority: '0.4', changefreq: 'yearly' },
    { loc: `${baseUrl}/mandatory-disclosure.html`, priority: '0.4', changefreq: 'yearly' }
  ];

  try {
    const newsList = await News.find({ isPublished: true }).select('slug updatedAt').lean();
    newsList.forEach(n => {
      urls.push({
        loc: `${baseUrl}/news.html?slug=${n.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: n.updatedAt ? new Date(n.updatedAt).toISOString().split('T')[0] : ''
      });
    });
  } catch (e) { /* ignore */ }

  const today = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.send(xml);
}));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 404 + ERROR HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
});

// ============================================================
// SEED FUNCTION
// ============================================================
async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Admin user
    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existing) {
      await User.create({
        name: 'School Admin',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'superadmin',
        phone: process.env.WHATSAPP_NUMBER
      });
      console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL}`);
    } else {
      console.log('✅ Admin already exists');
    }

    // Notices
    if (await Notice.countDocuments() === 0) {
      await Notice.create({
        title: 'Admissions Open 2026-27',
        titleHi: 'प्रवेश प्रारंभ 2026-27',
        content: 'Nursery to Class 10 admissions open for Hindi & English medium.',
        contentHi: 'नर्सरी से 10वीं तक हिन्दी व अंग्रेजी माध्यम में प्रवेश प्रारंभ।',
        category: 'Admission',
        isTicker: true,
        priority: 10
      });
      console.log('✅ Demo notice created');
    }

    // Videos
    if (await Video.countDocuments() === 0) {
      await Video.insertMany([
        { title: 'Parent Review Video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', badge: 'Parent Review' },
        { title: 'Class 10 Topper Talk', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', badge: 'Topper Talk' },
        { title: 'Sports Day Highlights', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', badge: 'Sports Meet' }
      ]);
      console.log('✅ Demo videos created');
    }

    // Fees
    if (await Fee.countDocuments() === 0) {
      await Fee.insertMany([
        { classRange: 'Nursery / KG', amount: 8500, features: ['English & Hindi Medium', 'Activity-based learning', 'Free uniforms + books'], order: 1 },
        { classRange: 'Class 1 - 5', amount: 12500, features: ['English & Hindi Medium', 'Smart Classes', 'Free uniforms + books', 'Sports & Yoga'], isPopular: true, order: 2 },
        { classRange: 'Class 6 - 10', amount: 15500, features: ['MP Board Curriculum', 'Science + Computer Lab', 'Library Access', 'Board Exam Prep'], order: 3 }
      ]);
      console.log('✅ Demo fees created');
    }

    // Testimonials
    if (await Testimonial.countDocuments() === 0) {
      await Testimonial.insertMany([
        { name: 'Rajesh Kumar', role: 'Parent', location: 'Batkakhapa', message: 'मेरे दोनों बच्चे इसी स्कूल में पढ़ते हैं। शिक्षकों का व्यवहार बहुत अच्छा है।' },
        { name: 'Sunita Patel', role: 'Parent', location: 'Harrai Road', message: 'बेटी ने 10वीं में 96% अंक प्राप्त किए। धन्यवाद!' },
        { name: 'Amit Sahu', role: 'Parent', location: 'Dhanora', message: 'हिन्दी माध्यम में भी अंग्रेजी पर बराबर ध्यान दिया जाता है।' }
      ]);
      console.log('✅ Demo testimonials created');
    }

    // Achievements
    if (await Achievement.countDocuments() === 0) {
      await Achievement.insertMany([
        { title: 'District Topper 2025', description: 'Priya Patel scored 96.8% in Class 10 Board Exam', category: 'Academic', year: '2025' },
        { title: 'Best School Award', description: 'Awarded by District Education Officer', category: 'Award', year: '2024' }
      ]);
      console.log('✅ Demo achievements created');
    }

    // Holidays
    if (await Holiday.countDocuments() === 0) {
      const y = new Date().getFullYear();
      await Holiday.insertMany([
        { title: 'Diwali Holidays', date: new Date(y, 10, 20), type: 'Festival' },
        { title: 'Winter Vacation', date: new Date(y, 11, 25), endDate: new Date(y + 1, 0, 5), type: 'Vacation' },
        { title: 'Republic Day', date: new Date(y + 1, 0, 26), type: 'Holiday' }
      ]);
      console.log('✅ Demo holidays created');
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

// ============================================================
// START SERVER
// ============================================================
if (process.argv[2] === 'seed') {
  mongoose.connection.once('open', seed);
} else {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}