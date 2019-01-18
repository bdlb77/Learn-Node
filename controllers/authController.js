const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
// strategy = interface that checks if authenticity is correct


exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
})


exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!')
  res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
  // check if user is authenticated
  if(req.isAuthenticated()) return next(); // carry on
  req.flash('error', 'Oops you must be logged in to do that!');
  res.redirect('/login');
}

exports.forgot = async (req, res) => {
  //  1. see if user exists
  const user = await User.findOne({email: req.body.email})
  if(!user){
    req.flash('error', 'No Account With that Email Exists')
    // res.flash('success', 'A password Reset was emailed to you.') (this is for security reasons)
    return res.redirect('/login');
  }
  // 2. reset tokens and expiriy on the acct
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000 // 1 hour from now
  // 3. send email w/ token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;

  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  })
  req.flash('success', `You have been emailed a reset password link. `);
  await user.save();
    //  4. finally redirect to Login Page
    res.redirect('/login')
};

exports.reset = async (req, res) => {
  // res.json(req.params)
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {$gt: Date.now()}
  })
  if(!user){
    req.flash('error', 'password reset token invalid / expired');
    return res.redirect('/login')
  }
  // If there is a user.. show password reset form
  res.render('reset', {title: 'Reset Your Password'})
}

exports.confirmedPasswords = (req, res, next) => {
  if(req.body.password === req.body['password-confirm']){
    next(); //keep it goin!
    return
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back')
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {$gt: Date.now()}
  });

  if(!user){
    req.flash('error', 'password reset token invalid / expired');
    return res.redirect('/login')
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);

  req.flash('success', 'Nice your password has been set! You are now logged in!')
  res.redirect('/');
}
