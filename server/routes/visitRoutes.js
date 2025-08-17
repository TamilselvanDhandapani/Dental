const express = require("express");
const { requireUser } = require("../middleware/auth");
const {
  createVisit,
  listVisitsByPatient,
  getVisit,
  updateVisit,
  deleteVisit,
  getNextApptForVisit,
  getNextApptsForVisit,
  getOverallNextAppts,
} = require("../controller/visitController");

const router = express.Router();

// All visit routes require an authenticated user (JWT via Authorization header)
router.use(requireUser);

// routes/visit.routes.js (example)

// Create
router.post("/:patientId/visits", createVisit);

// Read (list + single)
router.get("/:patientId/visits", listVisitsByPatient);
router.get("/:visitId", getVisit);

// Update
router.patch("/:visitId", updateVisit);

// Delete
router.delete("/:visitId", deleteVisit);

// Next Appointment summary for a patient
router.get("/:visitId/next-appt", getNextApptForVisit);
router.get("/:visitId/next-appts", getNextApptsForVisit);

// over All Appointments
router.get("/appointments/next", getOverallNextAppts);

module.exports = router;
