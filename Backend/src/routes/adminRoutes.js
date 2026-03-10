const express = require('express');
const adminController = require('../controllers/adminController');
const adminPaymentController = require('../controllers/adminPaymentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);
router.use(apiLimiter);

router.get('/stats', adminController.getStats);
router.get('/storage', adminController.getStorageAnalytics);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users', adminController.createUser);
router.get('/files', adminController.listFiles);
router.get('/shares', adminController.listShares);
router.get('/logs', adminController.listLogs);
router.get('/server', adminController.getServerHealth);
router.get('/plans', adminController.getPlans);
router.patch('/plans/:id', adminController.updatePlan);
router.post('/plans', adminController.createPlan);
router.delete('/plans/:id', adminController.deletePlan);
router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.updateSettings);

router.get('/payments/stats', adminPaymentController.getPaymentStats);
router.get('/payments', adminPaymentController.listPayments);
router.get('/payments/:id', adminPaymentController.getPayment);
router.get('/payments/:id/proof/image', adminPaymentController.servePaymentProof);
router.patch('/payments/:id/approve', adminPaymentController.approvePayment);
router.patch('/payments/:id/reject', adminPaymentController.rejectPayment);

module.exports = router;
