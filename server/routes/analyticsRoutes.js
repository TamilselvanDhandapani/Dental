// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const {
    patientsByYear,
  patientsByYearMonth,
  patientsByYearGender,
  visitsByYear,
  visitsByMonth,
  patientsByAgeGroup,
} = require('../controller/analyticsController');

// All endpoints require Auth header (Supabase JWT)
router.get('/by-year', patientsByYear);
router.get('/by-year-month', patientsByYearMonth);
router.get('/by-year-gender', patientsByYearGender);

router.get('/by-year', visitsByYear);
router.get('/by-month', visitsByMonth);

router.get('/by-age-group', patientsByAgeGroup);

module.exports = router;
