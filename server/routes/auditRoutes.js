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

// Order matters: put the specific route before the generic :schema/:table/:rowId
router.get('/recent', getAuditRecent);
router.get('/patients/:id/provenance', getPatientProvenance);
router.get('/patients/:id', getPatientAudit);
router.get('/actors/:actorId', getActorAudit);
router.get('/:schema/:table/:rowId', getRowAudit);

module.exports = router;
