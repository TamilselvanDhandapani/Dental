// routes/campSubmission.js
const express = require("express");
const {
  listCampSubmissions,
  getCampSubmission,
  createCampSubmission,
  updateCampSubmission,
  deleteCampSubmission,
} = require("../controller/campSubmissionController");

const router = express.Router();

router.get("/", listCampSubmissions);
router.post("/", createCampSubmission);
router.get("/:id", getCampSubmission);
router.patch("/:id", updateCampSubmission);
router.delete("/:id", deleteCampSubmission);

module.exports = router;
