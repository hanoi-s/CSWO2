const mongoose = require('mongoose');
const User = require('./userModel').schema;
const Request = require('./requestModel').schema;

const auditSchema = new mongoose.Schema({
    DateCreated: {type: Date, required: true},
    Action: {type: String},
    User: User,
    Previous: Request,
    Changes: Request
})

module.exports = mongoose.connection.model('Audit', auditSchema);