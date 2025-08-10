const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const tenantRoutes = require('./routes/tenants');
const unitRoutes = require('./routes/units');
const rentBillRoutes = require('./routes/rentBills');
const waterBillRoutes = require('./routes/waterBills');
const maintenanceRoutes = require('./routes/maintenance');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/tenants', tenantRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/rent-bills', rentBillRoutes);
app.use('/api/water-bills', waterBillRoutes);
app.use('/api/maintenance', maintenanceRoutes);

module.exports = app;
