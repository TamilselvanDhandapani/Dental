// routes/auditRoutes.js
const express = require('express');
const {
  getAuditRecent,
  getPatientAudit,
  getActorAudit,
  getRowAudit,
  getPatientProvenance,
} = require('../controller/auditController');

const router = express.Router();

// Recent events (optionally filter by schema/table/action)
router.get('/audit/recent', getAuditRecent);

// Full history for a specific patient row
router.get('/audit/patients/:id', getPatientAudit);

// Events by a specific actor (auth.uid)
router.get('/audit/actors/:actorId', getActorAudit);

// Generic row-history for any audited table
router.get('/audit/:schema/:table/:rowId', getRowAudit);

// Quick provenance for a patient (created_by, updated_by + audit first/last)
router.get('/patients/:id/provenance', getPatientProvenance);

module.exports = router;
