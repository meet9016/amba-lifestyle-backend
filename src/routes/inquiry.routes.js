const express = require('express');
const {
  sendOtp,
  verifyOtp,
  createInquiry,
  getMyInquiries,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
  clearAllInquiries
} = require('../controllers/inquiry.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public OTP & Customer Inquiry Actions
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/', createInquiry);
router.post('/my-inquiries', getMyInquiries);

// Admin Management Endpoints
router.get('/', verifyToken, getAllInquiries);
router.delete('/', verifyToken, clearAllInquiries);
router.get('/:id', verifyToken, getInquiryById);
router.patch('/:id/status', verifyToken, updateInquiryStatus);
router.delete('/:id', verifyToken, deleteInquiry);

module.exports = router;

