
const express = require('express');
const { requireUser } = require('../middleware/auth');
const { upsertMedicalHistory, getMedicalHistory } = require('../controller/medicalHistoryController');

const router = express.Router();


router.get('/:patientId/medical-history',requireUser, getMedicalHistory);
router.put('/:patientId/medical-history',requireUser, upsertMedicalHistory);

module.exports = router;
