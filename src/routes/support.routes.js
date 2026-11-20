const express = require('express');
const {
  getTickets,
  createTicket,
  addMessage,
  updateTicketStatus
} = require('../controllers/support.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyToken, getTickets);
router.post('/', verifyToken, createTicket);
router.post('/:id/messages', verifyToken, addMessage);
router.patch('/:id/status', verifyToken, updateTicketStatus);

module.exports = router;

