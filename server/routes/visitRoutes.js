const express = require('express');
const { requireUser } = require('../middleware/auth');
const {
  createVisit,
  listVisitsByPatient,
  getVisit,
  updateVisit,
} = require('../controller/visitController');

const router = express.Router();

// All visit routes require an authenticated user (JWT via Authorization header)
router.use(requireUser);

// Create a visit for a patient
router.post('/patients/:patientId/visits', createVisit);

// List visits for a patient (most recent first)
router.get('/patients/:patientId/visits', listVisitsByPatient);

// Get a single visit
router.get('/visits/:visitId', getVisit);

// Update a visit
router.put('/visits/:visitId', updateVisit);

module.exports = router;
