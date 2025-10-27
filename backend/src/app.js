const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const tenantRoutes = require('./routes/tenant');
const unitRoutes = require('./routes/units');
const rentBillRoutes = require('./routes/rentBills');
const waterBillRoutes = require('./routes/waterBills');
const maintenanceRoutes = require('./routes/maintenance');
const paymentsRouter = require('./routes/payments')
const leasesRouter = require('./routes/leases')
const remindersRouter = require('./routes/reminders');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/tenants', tenantRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/rentbills', rentBillRoutes);
app.use('/api/waterbills', waterBillRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/leases', leasesRouter);
app.use('/api/reminders', remindersRouter);

module.exports = app;
