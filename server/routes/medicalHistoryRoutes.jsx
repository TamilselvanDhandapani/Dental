// routes/medicalHistory.routes.js
const express = require('express');
const { requireUser } = require('../middleware/auth');
const { upsertMedicalHistory, getMedicalHistory } = require('../controller/medicalHistoryController');

const router = express.Router();


router.get('/patients/:patientId/medical-history',requireUser, getMedicalHistory);
router.put('/patients/:patientId/medical-history',requireUser, upsertMedicalHistory);

module.exports = router;
