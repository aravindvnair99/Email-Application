const functions = require("firebase-functions"),
	express = require("express"),
	app = express(),
	bodyParser = require("body-parser"),
	admin = require("firebase-admin"),
	cookieParser = require("cookie-parser");

/*=============================================>>>>>

				= init and config =

===============================================>>>>>*/

admin.initializeApp({
	credential: admin.credential.applicationDefault()
});
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
app.use(cookieParser());
app.set("views", "./views");
app.set("view engine", "ejs");
var db = admin.firestore();

/*=============================================>>>>>

				= security functions =

===============================================>>>>>*/

function checkCookieMiddleware(req, res, next) {
	const sessionCookie = req.cookies.__session || "";
	admin
		.auth()
		.verifySessionCookie(sessionCookie, true)
		.then((decodedClaims) => {
			req.decodedClaims = decodedClaims;
			next();
			return;
		})
		.catch((error) => {
			console.log(error);
			res.redirect("/login");
		});
}
function checkValidUser(req, res, next) {
	if (req.decodedClaims.phone_number && req.decodedClaims.email_verified) {
		next();
	} else {
		return res.redirect("/updateProfile");
	}
}
function setCookieLogin(idToken, res) {
	const expiresIn = 60 * 60 * 24 * 5 * 1000;
	admin
		.auth()
		.createSessionCookie(idToken, { expiresIn })
		.then(
			(sessionCookie) => {
				const options = {
					maxAge: expiresIn,
					httpOnly: true,
					secure: false //should be true in prod
				};
				res.cookie("__session", sessionCookie, options);
				admin
					.auth()
					.verifyIdToken(idToken)
					.then((decodedClaims) => {
						console.log(decodedClaims);
						if (
							decodedClaims.phone_number &&
							decodedClaims.email_verified
						) {
							return res.redirect("/dashboard");
						} else {
							return res.redirect("/updateProfile");
						}
					})
					.catch((error) => {
						console.log(error);
					});
				return;
			},
			(error) => {
				console.log(error);
				res.status(401).send("UNAUTHORIZED REQUEST!");
			}
		)
		.catch((error) => {
			console.log(error);
		});
}
function setCookieRegister(idToken, res) {
	const expiresIn = 60 * 60 * 24 * 5 * 1000;
	admin
		.auth()
		.createSessionCookie(idToken, { expiresIn })
		.then(
			(sessionCookie) => {
				const options = {
					maxAge: expiresIn,
					httpOnly: true,
					secure: false //should be true in prod
				};
				res.cookie("__session", sessionCookie, options);
				admin
					.auth()
					.verifyIdToken(idToken)
					.then((decodedClaims) => {
						res.redirect("/updateProfile");
						return console.log(decodedClaims);
					})
					.catch((error) => {
						console.log(error);
					});
				return;
			},
			(error) => {
				console.log(error);
				res.status(401).send("UNAUTHORIZED REQUEST!");
			}
		)
		.catch((error) => {
			console.log(error);
		});
}

/*=============================================>>>>>

				= basic routes =

===============================================>>>>>*/

app.get("/offline", (req, res) => {
	res.render("offline");
});
app.get("/lock", (req, res) => {
	res.render("lock");
});
app.get("/dashboard", checkCookieMiddleware, checkValidUser, (req, res) => {
	obj = Object.assign({}, req.decodedClaims);
	console.log("\n\n\n\n", req.decodedClaims);
	res.render("dashboard", { obj });
});
app.get("/contacts", checkCookieMiddleware, checkValidUser, (req, res) => {
	res.render("contacts");
});

/*=============================================>>>>>

			= authentication routes =

===============================================>>>>>*/

app.get("/", (req, res) => {
	if (req.cookies.__session) {
		res.redirect("/dashboard");
	} else {
		res.render("login");
	}
});

app.get("/login", (req, res) => {
	if (req.cookies.__session) {
		res.redirect("/dashboard");
	} else {
		res.render("login");
	}
});
app.get("/sessionLogin", (req, res) => {
	setCookieLogin(req.query.idToken, res);
});
app.get("/register", (req, res) => {
	if (req.cookies.__session) {
		res.redirect("/dashboard");
	} else {
		res.render("register");
	}
});
app.get("/sessionRegister", (req, res) => {
	setCookieRegister(req.query.idToken, res);
});
app.get("/signOut", (req, res) => {
	res.clearCookie("__session");
	res.redirect("/login");
});
app.get("/forgotPassword", (req, res) => {
	if (req.cookies.__session) {
		res.redirect("/dashboard");
	} else {
		res.render("forgotPassword");
	}
});
app.post("/passwordReset", (req, res) => {
	if (req.cookies.__session) {
		res.redirect("/dashboard");
	} else {
		admin
			.auth()
			.getUserByEmail(req.body.email)
			.then((userRecord) => {
				userRecord = Object.assign({}, userRecord);
				res.render("passwordReset", { userRecord });
			})
			.catch((error) => {
				console.log("Error fetching user data:", error);
			});
	}
});
app.get("/uid", checkCookieMiddleware, (req, res) => {
	res.send(req.decodedClaims.uid);
});
app.get("/updateProfile", checkCookieMiddleware, (req, res) => {
	user = Object.assign({}, req.decodedClaims);
	res.render("updateProfile", { user });
});
app.post("/onUpdateProfile", checkCookieMiddleware, (req, res) => {
	console.log(
		req.body.countryCode,
		req.body.mobile,
		req.body.firstName,
		req.body.lastName
	);
	admin
		.auth()
		.updateUser(req.decodedClaims.uid, {
			phoneNumber: req.body.countryCode + req.body.mobile,
			displayName: req.body.firstName + " " + req.body.lastName,
			emailVerified: true
		})
		.then((userRecord) => {
			console.log("Successfully updated user", userRecord.toJSON());
			db.collection("users")
				.doc(userRecord.uid)
				.set({
					DOB: req.body.DOB,
					"Address Line 1": req.body.address1,
					"Address Line 2": req.body.address2,
					city: req.body.city,
					country: req.body.country,
					bio: req.body.bio
				});
			return res.redirect("/signOut");
		})
		.catch((error) => {
			console.log("Error updating user:", error);
		});
});

/*=============================================>>>>>

				= errors =

===============================================>>>>>*/

app.use((req, res, next) => {
	res.status(404).render("errors/404");
});
app.use((req, res, next) => {
	res.status(500).render("errors/500");
});

/*=============================================>>>>>

				= DO NOT PUT ANYTHING AFTER THIS =

===============================================>>>>>*/

exports.app = functions.https.onRequest(app);
