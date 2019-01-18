const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', {title: 'Login'})
};

exports.registerForm = (req, res) => {
  res.render('register', {title: 'Register'})
};

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    remove_gmail_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Password Confirm cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Your passwords do not match!').equals(req.body.password);

  const errors = req.validationErrors();
   if (errors) {
     req.flash('error', errors.map(err => err.msg));
     res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
     return; // stop the fn from running
   }
   next(); // there were no errors!
};

exports.register = async (req, res, next) => {
  const user = new User({email: req.body.email, name: req.body.name});
  // #register brought by passport-mongoose to handle low-level registration.
  // User = model.. pass instance of model into model for registration
  const registerWithPromise = promisify(User.register, User)
  await registerWithPromise(user, req.body.password);
  next(); // continue on to next middleware / register
};

exports.account = (req, res, next)  => {
  res.render('account', {title: 'Your Account'})
}

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findoneAndUpdate(
    { _id: req.user._id},
    {$set: updates },
    { new: true,  runvalidators: true, context: 'query' }
  )
   //  res.json // check if info is being passed
   req.flash('success', 'Updated the profile!');
   res.redirect('back');
}
