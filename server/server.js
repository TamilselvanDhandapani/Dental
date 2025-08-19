require('dotenv').config();
const express = require('express');
const cors = require('cors');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/medicalhistory', require('./routes/medicalHistoryRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/appointments', require('./routes/appointmentsRoutes'));


app.listen(port, () => console.log(`🚀 Server running on :${port}`));
