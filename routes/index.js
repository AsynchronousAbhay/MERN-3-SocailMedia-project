var express = require("express");
var router = express.Router();
var upload = require("../utils/multer");
var fs = require("fs");
var path = require("path");

const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const CLIENT_ID =
    "676428409321-31c91qsfqad148tpoikgv201jv817t9p.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN =
    "1//043hIE02f9oS2CgYIARAAGAQSNwF-L9Ir1kxVGjxNDI_c00I4upzu-vhihGVebFy2dRJg0T4yHEksLnaQO6OUbS9RvTyTRVGLa58";

const OAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);
OAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail(to, link) {
    try {
        const accessToken = await OAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "dhanesh1296@gmail.com",
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const mailOptions = {
            from: "Sheryians Coding School <dhanesh1296@gmail.com>",
            to,
            subject: "Change Password",
            html: `<h1>Click link below</h1>click <a href="${link}">here</a> to change password.`,
            // html: '<a href="https://www.google.com">here</a>',
        };
        const result = await transport.sendMail(mailOptions);
        return result;
    } catch (error) {
        return error;
    }
}

var User = require("../models/userModel");
var Post = require("../models/postModel");
var passport = require("passport");
var LocalStrategy = require("passport-local");
const user = require("../models/userModel");

// passport.use(User.createStrategy());
passport.use(new LocalStrategy(User.authenticate()));

/** GET Signin page */
router.get("/", function (req, res, next) {
    res.render("signin", {
        title: "Sign in",
        isloggedin: req.user ? true : false,
        user: req.user,
    });
});

router.post(
    "/signin",
    passport.authenticate("local", {
        successRedirect: "/timeline",
        failureRedirect: "/",
    }),
    function (req, res, next) {}
);

/** GET Signup page */
router.get("/signup", function (req, res, next) {
    res.render("signup", {
        title: "Sign up",
        isloggedin: req.user ? true : false,
        user: req.user,
    });
});

/** POST Signup page */
router.post("/signup", function (req, res, next) {
    var { email, name, password, username } = req.body;
    var newUser = new User({ name, email, username });
    User.register(newUser, password)
        .then(() => {
            res.redirect("/");
        })
        .catch((err) => res.send(err));
});

router.get("/timeline", isLoggedIn, function (req, res) {
    Post.find()
        .populate("postedBy")
        .then(function (posts) {
            res.render("homepage", {
                title: req.user ? req.user.username : null,
                isloggedin: req.user ? true : false,
                user: req.user,
                posts,
            });
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/create-post", isLoggedIn, function (req, res) {
    res.render("createpost", {
        title: "Create Post",
        isloggedin: req.user ? true : false,
        user: req.user,
    });
});

router.post("/create-post", upload.single("multimedia"), function (req, res) {
    const { title, content } = req.body;
    const newpost = new Post({
        title,
        content,
        multimedia: req.file.filename,
        postedBy: req.user,
    });
    newpost
        .save()
        .then(function (createdpost) {
            req.user.posts.push(createdpost);
            req.user.save();
            res.redirect("/timeline");
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/like/:id", isLoggedIn, function (req, res) {
    Post.findById(req.params.id)
        .then(function (likedpost) {
            if (likedpost.dislikes.includes(req.user._id)) {
                const idx = likedpost.dislikes.findIndex(function (id) {
                    return req.user._id === id;
                });
                likedpost.dislikes.splice(idx, 1);
            }

            if (!likedpost.likes.includes(req.user._id)) {
                likedpost.likes.push(req.user);
            }
            likedpost.save();
            res.redirect("/timeline");
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/dislike/:id", isLoggedIn, function (req, res) {
    Post.findById(req.params.id)
        .then(function (dislikedpost) {
            if (dislikedpost.likes.includes(req.user._id)) {
                const idx = dislikedpost.likes.findIndex(function (id) {
                    return req.user._id === id;
                });
                dislikedpost.likes.splice(idx, 1);
            }

            if (!dislikedpost.dislikes.includes(req.user._id)) {
                dislikedpost.dislikes.push(req.user);
            }
            dislikedpost.save();
            res.redirect("/timeline");
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/logout", function (req, res) {
    req.logout(function () {
        res.redirect("/");
    });
});

router.get("/forgot-password", function (req, res) {
    res.render("forget", {
        title: "Forget Password",
        isloggedin: req.user ? true : false,
        user: req.user,
    });
});

router.post("/forgot-password", function (req, res) {
    const { email } = req.body;
    User.findOne({ email })
        .then(function (userFound) {
            if (!userFound)
                return res.send(
                    "User not found <a href='/forgot-password'>go back</a>"
                );

            const link = `${req.protocol}://${req.get(
                "host"
            )}/change-password/${userFound._id}`;
            sendMail(userFound.email, link)
                .then(function (result) {
                    console.log("email sent...");
                    userFound.refreshToken = 1;
                    userFound.save();
                    res.send("<h1>check inbox!<h1><a href='/'>Go Home</a>");
                    // res.json()
                })
                .catch(function (err) {
                    console.log(err);
                });
            // res.redirect("/change-password/" + userFound._id);
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/change-password/:id", function (req, res) {
    User.findById(req.params.id)
        .then(function (user) {
            if (user.refreshToken === 1) {
                res.render("changepassword", {
                    id: req.params.id,
                    title: "Change Password",
                    isloggedin: false,
                });
            } else {
                res.send("Makade! change toh kr chuka or kitne baar krega...");
            }
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.post("/change-password/:id", function (req, res) {
    User.findById(req.params.id)
        .then(function (userFound) {
            if (!userFound)
                return res.send(
                    "User not found <a href='/forgot-password'>go back</a>"
                );

            userFound.setPassword(req.body.password, function (err, user) {
                if (err) {
                    res.send(err);
                }
                userFound.refreshToken = undefined;
                userFound.save();
                res.redirect("/");
            });
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/reset-password", isLoggedIn, function (req, res) {
    res.render("reset", {
        title: "Reset Password",
        isloggedin: req.user ? true : false,
        user: req.user,
    });
});

router.post("/reset-password", function (req, res) {
    const { oldpassword, newpassword } = req.body;

    req.user.changePassword(oldpassword, newpassword, function (err, user) {
        if (err) {
            res.send(err);
        }
        res.redirect("/logout");
    });
});

/** GET Profile page */
router.get("/profile", isLoggedIn, function (req, res, next) {
    res.render("profile", {
        title: "Profile",
        isloggedin: req.user ? true : false,
        user: req.user,
    });
});

/** POST Profile/:id page */
router.post("/profile/:id", isLoggedIn, function (req, res, next) {
    User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
        .then(function () {
            res.redirect("/profile");
        })
        .catch(function (err) {
            res.send(err);
        });
});

/** POST /uploadimage/:id page */
router.post(
    "/uploadimage/:id",
    isLoggedIn,
    upload.single("avatar"),
    function (req, res, next) {
        // upload(req, res, function (err) {
        // if (err) res.send(err);
        User.findByIdAndUpdate(
            req.params.id,
            { $set: { avatar: req.file.filename } },
            { new: true }
        )
            .then(function () {
                if (req.body.oldavatar !== "dummy.png") {
                    fs.unlinkSync(
                        path.join(
                            __dirname,
                            "..",
                            "public",
                            "assets",
                            req.body.oldavatar
                        )
                    );
                }
                res.redirect("/profile");
            })
            .catch(function (err) {
                res.send(err);
            });
        // })
    }
);

router.get("/delete-user", isLoggedIn, function (req, res, next) {
    User.findById(req.user._id)
        .populate("posts")
        .then(function (user) {
            user.posts.forEach(function (post) {
                Post.findByIdAndDelete(post._id).then(function (deletedpost) {
                    fs.unlinkSync(
                        path.join(
                            __dirname,
                            "..",
                            "public",
                            "assets",
                            deletedpost.multimedia
                        )
                    );
                });
            });

            User.findByIdAndDelete(req.user._id)
                .then(function () {
                    res.redirect("/");
                })
                .catch(function (err) {
                    res.send(err);
                });
        })
        .catch(function (err) {
            res.sendFile(err);
        });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        next();
        return;
    }
    res.redirect("/");
}

module.exports = router;
