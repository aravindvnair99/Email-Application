firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
/**
 * @return {!Object} The FirebaseUI config.
 */
function getUiConfig() {
	return {
		callbacks: {
			// Called when the user has been successfully signed in.
			signInSuccessWithAuthResult: function(authResult) {
				authResult.user
					.getIdToken()
					.then(function(idToken) {
						window.location.href =
							"/sessionLogin?idToken=" + idToken;
					})
					.catch((error) => {
						alert(error);
					});
				// if (authResult.user) {
				// 	handleSignedInUser(authResult.user);
				// }
				// if (authResult.additionalUserInfo) {
				// 	document.getElementById(
				// 		"is-new-user"
				// 	).textContent = authResult.additionalUserInfo.isNewUser
				// 		? "New User"
				// 		: "Existing User";
				// }
				// Do not redirect.
				// return false;
			}
		},
		signInFlow: "popup",
		signInOptions: [
			// TODO(developer): Remove the providers you don't need for your app.
			{
				provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
				// Whether the display name should be displayed in Sign Up page.
				requireDisplayName: true,
				signInMethod: "password"
			},
			{
				provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
				recaptchaParameters: {
					size: "invisible"
				},
				defaultCountry: "IN"
			}
		],
		// Terms of service url.
		tosUrl: "/TOS",
		// Privacy policy url.
		privacyPolicyUrl: "/privacyPolicy",
		credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO
	};
}
// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
ui.disableAutoSignIn();
/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
var handleSignedInUser = function(user) {
	document.getElementById("user-signed-in").style.display = "block";
	document.getElementById("user-signed-out").style.display = "none";
	document.getElementById("name").textContent = user.displayName;
	document.getElementById("email").textContent = user.email;
	document.getElementById("phone").textContent = user.phoneNumber;
	if (user.photoURL) {
		var photoURL = user.photoURL;
		// Append size to the photo URL for Google hosted images to avoid requesting
		// the image with its original resolution (using more bandwidth than needed)
		// when it is going to be presented in smaller size.
		if (
			photoURL.indexOf("googleusercontent.com") != -1 ||
			photoURL.indexOf("ggpht.com") != -1
		) {
			photoURL =
				photoURL +
				"?sz=" +
				document.getElementById("photo").clientHeight;
		}
		document.getElementById("photo").src = photoURL;
		document.getElementById("photo").style.display = "block";
	} else {
		document.getElementById("photo").style.display = "none";
	}
};
/**
 * Displays the UI for a signed out user.
 */
var handleSignedOutUser = function() {
	document.getElementById("user-signed-in").style.display = "none";
	document.getElementById("user-signed-out").style.display = "block";
	ui.start("#firebaseui-container", getUiConfig());
};
// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {
	document.getElementById("loading").style.display = "none";
	document.getElementById("loaded").style.display = "block";
	user ? handleSignedInUser(user) : handleSignedOutUser();
});
/**
 * Deletes the user's account.
 */
var deleteAccount = function() {
	firebase
		.auth()
		.currentUser.delete()
		.catch(function(error) {
			if (error.code == "auth/requires-recent-login") {
				firebase
					.auth()
					.signOut()
					.then(function() {
						// The timeout allows the message to be displayed after the UI has
						// changed to the signed out state.
						setTimeout(function() {
							alert(
								"Please sign in again to delete your account."
							);
						}, 1);
					});
			}
		});
};
/**
 * Initializes the app.
 */
var initApp = function() {
	document.getElementById("sign-out").addEventListener("click", function() {
		firebase.auth().signOut();
	});
	document
		.getElementById("delete-account")
		.addEventListener("click", function() {
			deleteAccount();
		});
};
window.addEventListener("load", initApp);
