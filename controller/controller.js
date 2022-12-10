const bcrypt = require("bcryptjs");

const db = require('../models/db.js');
const RequestModel = require('../models/requestModel.js');
const RequesterModel = require('../models/requesterModel.js');
const EmployeeModel = require('../models/employeeModel.js');
const TypeModel = require('../models/typeModel.js');
const CategoryModel = require('../models/categoryModel.js');
const StatusModel = require('../models/statusModel.js');
const CriteriasModel = require('../models/criteriasModel.js');
const FeedbackModel = require('../models/feedbackModel.js');
const UserModel = require('../models/userModel.js');
const AuditModel = require('../models/auditModel.js');

const PDFDocument = require('pdfkit');
const pdfService = require('../js/pdf-service');

const controller = {
    getDashboard: function (req, res) {
        if(req.session.email) {
            // Renders dashboard page with all requests from database
            RequestModel.find( {} ).sort({ DateReceived: 'asc' }).then((workOrders) => { 
                res.render('dashboard', {request:workOrders});  
            }); 
        } else {
            res.redirect('/login');
        }
    },

    getNewOrder: function (req, res) {
        // Renders new order page with data coming from database such as types, categories, employees, and status

        // Query for reading all Types from the Database
        db.findMany(TypeModel, {}, {}, function(typesresult){
            // Query for reading all Categories from the Database
            db.findMany(CategoryModel, {}, {}, function(categoriesresult){
                // Query for reading all Employees from the Database
                db.findMany(EmployeeModel, {}, {}, function(employeesresult){
                    // Query for reading all Statuses from the Database
                    db.findMany(StatusModel, {}, {}, function(statusesresult){
                        res.render('neworder', {type:typesresult, category:categoriesresult, employee:employeesresult, status:statusesresult});
                    });
                });
            });
        });

    },

    getWorkOrder: function (req, res) {
        // Renders work order page catering to a specific work order request
        // also with data coming from database such as types, categories, employees, and status

        // Query for reading all Types from the Database
        db.findMany(TypeModel, {}, {}, function(typesresult){
            // Query for reading all Categories from the Database
            db.findMany(CategoryModel, {}, {}, function(categoriesresult){
                // Query for reading all Employees from the Database
                db.findMany(EmployeeModel, {}, {}, function(employeesresult){
                    // Query for reading all Statuses from the Database
                    db.findMany(StatusModel, {}, {}, function(statusesresult){
                        db.findMany(CriteriasModel, {}, {}, function(criteriasresult) {
                            db.findOne(RequestModel, {_id: req.params.woid}, {}, function(result){
                                res.render('workorder', {request:result, type:typesresult, category:categoriesresult, employee:employeesresult, status:statusesresult, criterias:criteriasresult});
                            });
                        });
                    });
                });
            });
        });
    },

    viewWorkOrder: function (req, res) {
        // Renders work order page catering to a specific work order request
        // also with data coming from database such as types, categories, employees, and status

        // Query for reading all Types from the Database
        db.findMany(TypeModel, {}, {}, function(typesresult){
            // Query for reading all Categories from the Database
            db.findMany(CategoryModel, {}, {}, function(categoriesresult){
                // Query for reading all Employees from the Database
                db.findMany(EmployeeModel, {}, {}, function(employeesresult){
                    // Query for reading all Statuses from the Database
                    db.findMany(StatusModel, {}, {}, function(statusesresult){
                        db.findMany(CriteriasModel, {}, {}, function(criteriasresult) {
                            db.findOne(RequestModel, {_id: req.params.woid}, {}, function(result){
                                res.render('viewwo', {request:result, type:typesresult, category:categoriesresult, employee:employeesresult, status:statusesresult, criterias:criteriasresult});
                            });
                        });
                    });
                });
            });
        });
    },
    
    getSummary: function (req, res) {
        RequestModel.find( {Disabled: false} ).count().then((totalWorkOrders) => { 
            RequestModel.find( {Disabled: false, "Status.StatusName": "Pending for Approval"} ).count().then((pending) => { 
                RequestModel.find( {Disabled: false, "Status.StatusName": "Approved"} ).count().then((approved) => { 
                    RequestModel.find( {Disabled: false, "Status.StatusName": "Completed"} ).count().then((completed) => { 
                        res.render('summary', {Total:totalWorkOrders, Pending:pending, Approved:approved, Completed:completed});
                    })
                })
            })
        })
    },

    postNewOrder: async function(req, res) {
        // This is what happens in order to create a single work order

        const feedback = new FeedbackModel({
            DateCreated: null,
            Remarks: null
        });

        // Creates a new Requester instance
        // Collects the information from the form (req.body...)
        const requester = new RequesterModel({
            FirstName: req.body.firstName,
            LastName: req.body.lastName,
            Email: req.body.email,
            Department: req.body.address,
            Feedback: feedback
        })
    
        // Collects the information from the form
        // They are separated because they are objects.
        // We are storing their value to use in finding them on the DB
        var CATEGORY = req.body.workCtg;
        var TYPE = req.body.workType;
        var INCHARGE = req.body.incharge;
        var STATUS = req.body.status;

        if (STATUS == "Approved") {
            var DATEAPPROVED = new Date();
        } else {
            var DATEAPPROVED = null;
        }

        // Searches the database for the four variables above 
        // as they are data already found on the database
        TypeModel.findOne({TypeName:TYPE}).then((type) => {
            CategoryModel.findOne({ CategoryName:CATEGORY}).then((category) => {
                EmployeeModel.findOne({ FirstName:INCHARGE}).then((incharge) => {
                    StatusModel.findOne({ StatusName:STATUS}).then((status) => {
                        RequestModel.find( {} ).count().then((totalWorkOrders) => { 
                            UserModel.findOne({Email: req.session.email}).then((user) => {
                                // For Refernece Number
                                var refNum0 = new Date();
                                var refYear = refNum0.getFullYear().toString();
                                var refMonth0 = refNum0.getMonth();
                                var refMonth00 = refMonth0 + 1;
                                var refMonth = refMonth00.toString();
                                var count0 = totalWorkOrders;
                                var count0 = count0 + 1;
                                var count = count0.toString();

                                if(totalWorkOrders < 10) {
                                    var padding = "00000";
                                } else if (totalWorkOrders < 100 && totalWorkOrders >= 10) {
                                    var padding = "0000";
                                } else if (totalWorkOrders > 100) {
                                    var padding = "000";
                                } 

                                var referenceNumber = refYear + refMonth + padding + count;

                                

                                // Creates a new Request instance with all the information collected
                                // both from the form and the database
                                const request = new RequestModel({
                                    ReferenceNo: referenceNumber,
                                    Location: req.body.location,
                                    Item: req.body.item,
                                    Details: req.body.details,
                                    DateTarget: req.body.targetdate,
                                    DateReceived: new Date(),
                                    DateApproved: DATEAPPROVED,
                                    DateCompleted: null,
                                    CreatedBy: user,
                                    Requester: requester,       // This is where new Requester instance is stored
                                    Status: status,             // This is where the data from db is stored
                                    Category: category,         // This is where the data from db is stored
                                    Type: type,                 // This is where the data from db is stored
                                    InCharge: incharge,         // This is where the data from db is stored
                                });

                                const audit = new AuditModel({
                                    DateCreated: new Date(),
                                    Action: "Created",
                                    User: user,
                                    Previous: request,
                                    Changes: null
                                })

                                // request.save() - Saves the new Request instance on the database
                                request.save()
                                .then((result) => {
                                    requester.save();               // requester.save() - Saves the new Requester information instance on the database
                                    audit.save();
                                    res.redirect('/dashboard');     // Redirects the user on the dashboard to view new work order
                                });
                            })
                        })
                    })
                })
            })
        })
    },

    postUpdateOrder: async function(req, res) {
        // Collects the information from the form

        var LOCATION = req.body.location;
        var ITEM = req.body.item;
        var DETAILS = req.body.details;
        var CATEGORY = req.body.workCtg;
        var TYPE = req.body.workType;
        var DATETARGET = req.body.DateTarget;
        var INCHARGE = req.body.incharge;
        var STATUS = req.body.status;

        var FIRSTNAME = req.body.firstName;
        var LASTNAME = req.body.lastName;
        var EMAIL = req.body.email;
        var ADDRESS = req.body.address;

        var array = req.body.workers;
        var WORKER_ARRAY = array.split(", ");
        var REMARKS = req.body.remarks;     // by cswo   
       
        // If status was changed to Approved or Completed,
        // Date Approved or Date Completed is given a new Date/Timestamp
        // Else they are null
        switch(STATUS) {
            case "Approved":
                var req = RequestModel.findOne({_id: req.params.woid});
                var user = UserModel.findOne({Email: req.session.email});

                var DATEAPPROVED = new Date();
                const auditApproved = new AuditModel({
                    DateCreated: new Date(),
                    Action: "Approved",
                    User: user,
                    Previous: req
                })
                auditApproved.save();
                break;
            case "Completed":
                var req = RequestModel.findOne({_id: req.params.woid});
                var user = UserModel.findOne({Email: req.session.email});

                var DATECOMPLETED = new Date();
                const auditCompleted = new AuditModel({
                    DateCreated: new Date(),
                    Action: "Completed",
                    User: user,
                    Previous: req
                })
                auditCompleted.save();
                break;
            default:
                var DATEAPPROVED = null;
                var DATECOMPLETED = null;
                var FEEDBACK_DATECREATED = null;
        }

        // if(req.body.feedback) {
        //     var FEEDBACK_DATECREATED = new Date();
        // } else {
        //     var FEEDBACK_DATECREATED = null;
        // }

        // Adds user to ModifiedBy array of RequestModel
        UserModel.findOne({Email: req.session.email}).then((user) => {
            RequestModel.updateOne({_id: req.params.woid}, {$push: {ModifiedBy: user}},
                function(err, req){ if(err) throw err; //console.log("ModifiedBy Added")
            })
        })

        // Searches the database for the four variables above 
        // as they are data already found on the database
        TypeModel.findOne({TypeName:TYPE}).then((type) => {
        CategoryModel.findOne({ CategoryName:CATEGORY }).then((category) => {
        EmployeeModel.findOne({ FirstName:INCHARGE }).then((incharge) => {
        StatusModel.findOne({ StatusName:STATUS }).then((status) => {
            RequestModel.findOne( {_id: req.params.woid} ).then((REQ) => { 
                UserModel.findOne({Email: req.session.email}).then((user) => {

                    RequestModel.updateOne({_id: req.params.woid}, 
                        {$set: {
                            Location: LOCATION,
                            Item: ITEM,
                            Category: category,
                            Type: type,
                            DateTarget: DATETARGET,
                            Details: DETAILS,
                            InCharge: incharge,
                            Status: status,
                    
                            DateApproved: DATEAPPROVED,
                            DateCompleted: DATECOMPLETED,
                            Remarks: REMARKS,
                            Workers: WORKER_ARRAY,
                            Requester: {
                                FirstName: FIRSTNAME,
                                LastName: LASTNAME,
                                Email: EMAIL,
                                Department: ADDRESS,
                                Feedback: {
                                    DateCreated: FEEDBACK_DATECREATED,
                                    ResponseTime: req.body.responsetime,
                                    Accuracy: req.body.accuracy,
                                    Efficiency: req.body.efficiency,
                                    Courtesy: req.body.courtesy,
                                    Remarks: req.body.feedback,  // by requester
                                }
                            }
                        }}, function(request){})

                        RequestModel.findOne( {_id: req.params.woid} ).then((request) => { 
                            const audit = new AuditModel({
                                DateCreated: new Date(),
                                Action: "Modified",
                                User: user,
                            })
                            audit.save();

                            res.redirect('/viewwo/' + req.params.woid);
                        })


                })
            })
            })
            })
            })
        })
    },

    postDeleteOrder: async function(req, res) {
        RequestModel.findOne({_id: req.body.woid}).then((request) => {
            UserModel.findOne({Email: req.session.email}).then((user) => {
                RequestModel.updateOne({_id: req.body.woid}, 
                    {$set: {
                        Disabled: true,
                        DeletedBy: user
                    }}, function(result){
        
                        const audit = new AuditModel({
                            DateCreated: new Date(),
                            Action: "Deleted",
                            User: user,
                            Previous: request,
                            Changes: null
                        })
        
                        audit.save();
                        res.redirect('/');
                    })
            })
        })
    },

    postSearchOrders: async function(req, res) {
        var slash = "\\"
        var regKey = slash + req.body.keyword + slash

        RequestModel.find({$text: {$search: regKey}}).then((requests) => {
            res.render('searchorders', {request:requests});  
        })
    },

    postDateRange: async function(req, res) {

        // Returns data regardless of Status within date range
        if(req.body.status == "All") {
            const startdate = req.body.startdate;
            const conStartdate = new Date(startdate);
    
            const enddate = req.body.enddate;
            const conEnddate = new Date(enddate);

            if (req.body.keyword) {
                var slash = "\\";
                var regKey = slash + req.body.keyword + slash;
                RequestModel.find({DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}}).sort({ DateReceived: 'asc' }).then((requests) => {
                    RequestModel.find({Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}}).count().then((totalCount) => {
                        RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}} ).count().then((totalWorkOrders) => { 
                            RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": "Pending for Approval"} ).count().then((pending) => { 
                                RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": "Approved"} ).count().then((approved) => { 
                                    RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": "Completed"} ).count().then((completed) => { 
                                        var hasResult = true;
                                        res.render('summary', {request:requests, Total:totalWorkOrders, Pending:pending, Approved:approved, Completed:completed, start:req.body.startdate, end:req.body.enddate, status:req.body.status, totalResults:totalCount, hasResult:hasResult});
                                    })
                                })
                            })
                        })
                    })
                });
            } else {
                RequestModel.find({DateReceived: {$gte: conStartdate, $lte: conEnddate}}).sort({ DateReceived: 'asc' }).then((requests) => {
                    RequestModel.find({Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}}).count().then((totalCount) => {
                        RequestModel.find( {Disabled: false} ).count().then((totalWorkOrders) => { 
                            RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": "Pending for Approval"} ).count().then((pending) => { 
                                RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": "Approved"} ).count().then((approved) => { 
                                    RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": "Completed"} ).count().then((completed) => { 
                                        var hasResult = true;
                                        res.render('summary', {request:requests, Total:totalWorkOrders, Pending:pending, Approved:approved, Completed:completed, start:req.body.startdate, end:req.body.enddate, status:req.body.status, totalResults:totalCount, hasResult:hasResult});
                                    })
                                })
                            })
                        })
                    })
                });
            }
        } else {
            // Returns data depending on the Status within date range
            // Has status, has keyword, has date range
            const status = req.body.status;
            const startdate = req.body.startdate;
            const conStartdate = new Date(startdate);
    
            const enddate = req.body.enddate;
            const conEnddate = new Date(enddate);

            if (req.body.keyword) {
                var slash = "\\"
                var regKey = slash + req.body.keyword + slash

                RequestModel.find({ DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": status }).sort({ DateReceived: 'asc' }).then((requests) => {
                    RequestModel.find({Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": status}).count().then((totalCount) => {
                        RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey} } ).count().then((totalWorkOrders) => { 
                            RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": "Pending for Approval"} ).count().then((pending) => { 
                                RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": "Approved"} ).count().then((approved) => { 
                                    RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, $text: {$search: regKey}, "Status.StatusName": "Completed"} ).count().then((completed) => { 
                                        var hasResult = true;
                                        res.render('summary', {request:requests, Total:totalWorkOrders, Pending:pending, Approved:approved, Completed:completed, start:req.body.startdate, end:req.body.enddate, status:req.body.status, totalResults:totalCount, hasResult:hasResult});
                                    })
                                })
                            })
                        })
                    })
                });
            } else {
                RequestModel.find({ DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": status }).sort({ DateReceived: 'asc' }).then((requests) => {
                    RequestModel.find({Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": status}).count().then((totalCount) => {
                        RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}} ).count().then((totalWorkOrders) => { 
                            RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": "Pending for Approval"} ).count().then((pending) => { 
                                RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": "Approved"} ).count().then((approved) => { 
                                    RequestModel.find( {Disabled: false, DateReceived: {$gte: conStartdate, $lte: conEnddate}, "Status.StatusName": "Completed"} ).count().then((completed) => { 
                                        var hasResult = true;
                                        res.render('summary', {request:requests, Total:totalWorkOrders, Pending:pending, Approved:approved, Completed:completed, start:req.body.startdate, end:req.body.enddate, status:req.body.status, totalResults:totalCount, hasResult:hasResult});
                                    })
                                })
                            })
                        })
                    })
                });
            } 
        }
    },

    getRegister: async function(req, res) {
        res.render('register');
    },

    getLogin: async function(req, res) {
        // If there is already a session, user should be redirected to home
        if(req.session.email){
            res.redirect('/')
        } else {
            res.render('login');
        }
    },

    getLogout: async function(req, res) {
        req.session.destroy(function(err) {
            if(err) throw err;
            res.redirect('login');
        })
    },

    postRegister: async function(req, res) {
        let {firstname, lastname, idnumber, email, password, admin_boolean} = req.body;

        if(admin_boolean === undefined) {
            admin_boolean = false;
        } else {
            admin_boolean = true;
        }

        const user = new UserModel({
            FirstName: firstname,
            LastName: lastname,
            IDNumber: idnumber,
            Email: email,
            Password: password,
            Admin: admin_boolean
        })

        // Count is for checking if there are duplicate emails
        UserModel.find( {Email: email} ).count().then((count) => { 
            if(count > 0) {
                error = "Email already exists. Use another one.";
                res.render("register", {error});
            } else {
                UserModel.insertMany(user);
                res.redirect('/register');
            }
        })  
        
    },

    postLogin: async function(req, res) {
        let {email, password} = req.body;

        // Count is for checking if there are duplicate emails
        UserModel.find( {Email: email} ).count().then((count) => { 
            if(count == 0) {
                error = "Email does not exist";
                res.render("login", {error});
            } else {
                UserModel.findOne( {Email: email} ).then((user) => {
                    if(user.Password == password) {
                        req.session.email = req.body.email;
                        console.log("req.session: " + req.session.email);
                        res.redirect('/');
                    } else {
                        error = "Wrong password";
                        res.render("login", {error});
                    }
                })
            }
        })
    },

    getAuditLogs: async function(req, res) {
        AuditModel.find({}).then((audits) => {
            res.render("auditlogs", {audit:audits});
        })
    }

    // postPrintWorkOrder : async function(req, res) {
    //     const stream = res.writeHead(200, {
    //         'Content-Type': 'application/pdf',
    //         'Content-Disposition': 'attachment;filename=workorder.pdf',
    //     });

    //     function buildPDF(dataCallback, endCallback) {
    //         const doc = new PDFDocument();
    //         doc.on('data', dataCallback);
    //         doc.on('end', endCallback);
    //         doc.fontSize(20).text("Some text");
    //         doc.end();
    //     }

    //     pdfService.buildPDF(
    //         (chunk) => stream.write(chunk),
    //         () => stream.end()
    //     );
    // }

}

// Export this file for other files to find
module.exports = controller;