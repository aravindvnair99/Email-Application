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
function setCookie(idToken, res) {
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
						res.redirect("/uid");
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
app.get("/dashboard", checkCookieMiddleware, (req, res) => {
	res.send("hi");
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
		res.redirect("/uid");
	} else {
		res.render("login");
	}
});
app.get("/register", (req, res) => {
	if (req.cookies.__session) {
		res.redirect("/dashboard");
	} else {
		res.render("register");
	}
});
app.get("/sessionLogin", (req, res) => {
	setCookie(req.query.idToken, res);
});
app.get("/signOut", (req, res) => {
	res.clearCookie("__session");
	res.redirect("/login");
});
app.get("/uid", checkCookieMiddleware, (req, res) => {
	res.send(req.decodedClaims.uid);
});
app.get("/updateProfile", (req, res) => {
	res.render("updateProfile");
});
app.post("/onUpdateProfile", (req, res) => {
	admin
		.auth()
		.updateUser(req.body.uid, {
			phoneNumber: "+91" + req.body.phoneNumber,
			password: req.body.password,
			displayName: req.body.firstName + " " + req.body.lastName,
			photoURL: req.body.photoURL
		})
		.then((userRecord) => {
			console.log("Successfully updated user", userRecord.toJSON());
			return res.redirect("/login");
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
