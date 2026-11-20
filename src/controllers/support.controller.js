const SupportTicket = require('../models/support.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Clean In-Memory Tickets store (starts empty)
let memoryTickets = [];

// Get tickets
const getTickets = async (req, res, next) => {
  try {
    const role = req.user?.role || req.headers['x-user-role'] || 'admin';
    const email = req.user?.email || req.headers['x-user-email'];

    let tickets = [];
    try {
      const query = role === 'admin' ? {} : { customerEmail: email };
      tickets = await SupportTicket.find(query).sort({ updatedAt: -1 });
    } catch (_) {}

    if (tickets.length === 0) {
      tickets = memoryTickets;
      if (role !== 'admin' && email) {
        tickets = memoryTickets.filter(t => t.customerEmail === email);
      }
    }

    return ApiResponse.success(res, 'Support tickets retrieved', tickets);
  } catch (error) {
    next(error);
  }
};

// Create new ticket
const createTicket = async (req, res, next) => {
  try {
    const { customerName, customerEmail, customerPhone, subject, category, message, images } = req.body;

    if (!subject || !message) {
      return next(ApiError.badRequest('Subject and message are required'));
    }

    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
    const newTicketData = {
      ticketNumber,
      customer: req.user?._id || null,
      customerName: customerName || req.user?.name || 'Customer',
      customerEmail: customerEmail || req.user?.email || 'customer@enterprise.in',
      customerPhone: customerPhone || req.user?.phone || '',
      subject,
      category: category || 'bulk_order',
      status: 'open',
      messages: [
        {
          sender: 'customer',
          senderName: customerName || req.user?.name || 'Customer',
          text: message,
          images: images || [],
          createdAt: new Date()
        }
      ],
      createdAt: new Date()
    };

    let created = null;
    try {
      created = await SupportTicket.create(newTicketData);
    } catch (_) {
      newTicketData._id = `tkt-${Date.now()}`;
      created = newTicketData;
    }

    memoryTickets.unshift(created);

    return ApiResponse.created(res, 'Support ticket created successfully', created);
  } catch (error) {
    next(error);
  }
};

// Add reply message
const addMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, images, sender, senderName } = req.body;

    if (!text && (!images || images.length === 0)) {
      return next(ApiError.badRequest('Message text or reference image is required'));
    }

    const role = req.user?.role || req.headers['x-user-role'] || 'customer';
    const resolvedSender = sender || (role === 'admin' ? 'admin' : 'customer');
    const resolvedName = senderName || (role === 'admin' ? 'Amba Support Specialist' : req.user?.name || 'Customer');

    const newMsg = {
      sender: resolvedSender,
      senderName: resolvedName,
      text: text || '(Shared Reference Image)',
      images: images || [],
      createdAt: new Date()
    };

    let ticket = null;
    try {
      ticket = await SupportTicket.findByIdAndUpdate(
        id,
        {
          $push: { messages: newMsg },
          status: resolvedSender === 'admin' ? 'in_progress' : 'open'
        },
        { new: true }
      );
    } catch (_) {}

    const memIdx = memoryTickets.findIndex(t => t._id === id || t.ticketNumber === id);
    if (memIdx !== -1) {
      memoryTickets[memIdx].messages.push(newMsg);
      memoryTickets[memIdx].status = resolvedSender === 'admin' ? 'in_progress' : 'open';
      ticket = memoryTickets[memIdx];
    }

    if (!ticket) {
      return next(ApiError.notFound('Ticket not found'));
    }

    return ApiResponse.success(res, 'Message added to support thread', ticket);
  } catch (error) {
    next(error);
  }
};

// Update status
const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let ticket = null;
    try {
      ticket = await SupportTicket.findByIdAndUpdate(id, { status }, { new: true });
    } catch (_) {}

    const memIdx = memoryTickets.findIndex(t => t._id === id || t.ticketNumber === id);
    if (memIdx !== -1) {
      memoryTickets[memIdx].status = status;
      ticket = memoryTickets[memIdx];
    }

    return ApiResponse.success(res, `Ticket status updated to ${status}`, ticket);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTickets,
  createTicket,
  addMessage,
  updateTicketStatus
};

