require('dotenv').config();
const express = require('express');
const cors = require('cors');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => console.log(`🚀 Server running on :${port}`));
