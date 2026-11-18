const express = require('express');
const { getAllUsers, updateProfile } = require('../controllers/user.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('admin'), getAllUsers);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;

