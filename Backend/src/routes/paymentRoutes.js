const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { uploadPaymentProof } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', paymentController.createOrder);
router.post('/generate-qris', paymentController.generateQris);
router.get('/my', paymentController.listMyPayments);
router.get('/:orderId', paymentController.getOrderByOrderId);
router.post('/:orderId/proof', uploadPaymentProof, paymentController.uploadProof);
router.get('/:orderId/proof/image', paymentController.serveProofImage);
router.get('/:orderId/qris-image', paymentController.serveDynamicQris);

module.exports = router;
