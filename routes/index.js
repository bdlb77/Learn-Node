const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const { catchErrors } = require('../handlers/errorHandlers');
// Do work here
router.get('/', catchErrors(storeController.getStores));

router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));

router.get('/store/:slug', catchErrors(storeController.getSingleStore));

router.get('/add',
  authController.isLoggedIn,
  storeController.addStore);

router.post('/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore));

router.post('/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore));

router.get('/stores/:id/edit', catchErrors(storeController.editStore));

router.get('/tags', storeController.getStoresByTag);

router.get('/tags/:tag', storeController.getStoresByTag);

router.get('/login', userController.loginForm);

router.post('/login', authController.login);

router.get('/register', userController.registerForm);
//  validate registration Data
//  2. Register the User
//  3. we need to log them in
router.post('/register',
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/logout', authController.logout);

router.get('/account',
  authController.isLoggedIn,
  userController.account);

router.post('/account', catchErrors(userController.updateAccount));

// password reset flow
// 1. forgot password
// 2. reset token request
// 3. check validity of token and time
// 4. check password confirm
// 5. update user info
router.post('/account/forgot', catchErrors(authController.forgot));

router.get('/account/reset/:token', catchErrors(authController.reset));

router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update));

router.get('/map', storeController.mapPage);

router.get('/hearts',
  authController.isLoggedIn,
  catchErrors(storeController.getHearts));

router.post('/reviews/:id',
  authController.isLoggedIn,
  catchErrors(reviewController.addReview))

router.get('/top', catchErrors(storeController.getTopStores));
/*
  API
*/

router.get('/api/v1/search', catchErrors(storeController.searchStores));

router.get('/api/v1/stores/near', catchErrors(storeController.mapStores));

router.post('/api/v1/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;
