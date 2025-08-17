const express = require('express');
const {
  createPatient,
  getAllPatients,
  getPatient,
  updatePatient,
  deletePatient,
} = require('../controller/patientController');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

// All patient routes require an authenticated user (JWT in Authorization header)

router.get('/', requireUser, getAllPatients);
router.get('/:id', requireUser, getPatient);
router.post('/', requireUser, createPatient);
router.put('/:id', requireUser, updatePatient);
router.delete('/:id', requireUser, deletePatient);

module.exports = router;
