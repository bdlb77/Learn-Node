const mongoose = require('mongoose');
// receive store model and allow it to be used
const Store = mongoose.model('Store');
const User = mongoose.model('User');
//  Multer to handle for pictures in the _storeForm
// - handles upload request of file
const multer = require('multer');
const jimp = require('jimp');
// give unique id's for each image uploaded
const uuid = require('uuid');

multerOptions= {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next){
    // mimetype = exe, jpeg, png, doc etc
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto){
      // null = error, 2nd value = true (if error, then null if 2nd value, it's true)
      next(null, true);
    }else{
      next({message: 'That file type isn\'t allowed'}, false)
    }
  }
}

exports.homePage = (req, res) => {
  console.log(req.name);
  res.render('index');
};

exports.addStore = (req,res) => {
  res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if no new file to resize
  if(!req.file){
    next(); // skip to the next middle middleware
    return;
  }
  const ext = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${ext}`;
  // now we resize
  // jimp is package based on promises we can await
  const photo = await jimp.read(req.file.buffer)
  await photo.resize(800, jimp.AUTO);
  // save to disk
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written photo to file system.. keep going
  next();
}

exports.createStore = async (req, res) => {
  // adds relation of user to store.. author === user
  req.body.author = req.user._id;
  //  log the info that's being requested! to see whats being pulled through
  //  console.log(req.body)

  const store = await (new Store(req.body)).save();
  req.flash('success', `You have successfully created ${store.name}. Care to leave a review?`)
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  // page 2 * 4 = 8 - 4 -> 4 so show 5 - 9
  const skip = (page * limit) - limit;
  //  Query DB for list of all stores
  const storesPromise =  Store
  .find()
  .skip(skip)
  .limit(limit)
  .sort({ created: 'desc' });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  const pages = Math.ceil(count / limit);
  if(!stores.length && skip){
    req.flash('info', `Hey you asked for page ${page}. But that doesn't Exist! So I put you on page ${pages}`)
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  res.render('stores', {title: 'Stores', stores, page, pages, count /* or: stores: stores */})
};
const confirmOwner = (store, user) => {
  if(!store.author.equals(user._id)){
    throw Error('You Must own this store to edit it!')
  }
}
exports.editStore = async (req, res) => {
  const store = await Store.findOne({_id: req.params.id});
  confirmOwner(store, req.user)
  // Find correct store by ID
  //  Make sure user is the one who created the store.. (owner)
  // Render edit form
  res.render('editStore', {title: `Edit ${store.name}`, store})
};

exports.updateStore = async (req, res) => {
  //  Find store by ID and save ID Model.findOneAndUpdate(query, data, options)
  // Save model
  //  Redirect and flash that it worked

  // Set Data location to be Point (allows to search in proximity)
  req.body.location.type = "Point";
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new store that was just updated
    runValidators: true
  }).exec();
  req.flash('success', `Sucessfully updated <strong>${store.name}</strong>! <a href="/stores/${store.slug}">View Store →</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getSingleStore = async (req, res, next) => {
  const store = await Store.findOne({slug: req.params.slug}).populate('author reviews');
  // res.json(store)
  // will assume this is a middleware and pass it on to the next middleware step
  if(!store) return next();
  res.render('singleStore', { store, title: store.name});
}

exports.getStoresByTag = async (req, res, next) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true}
  const tagsPromise =  Store.getTagsList();
  const storesPromise =  await Store.find({tags: tagQuery});
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  // res.json(result)
  res.render('tag', {tags,  title: 'Tags', tag, stores})
}

exports.searchStores = async (req, res) => {
  // 1. find stores by Query
  // 2. sort stores by text score (how close query matched)
  // 3. limit 5 to results
  const stores = await  Store
    .find({
      $text: {
      $search: req.query.q
      }
    }, {
    score: {$meta: 'textScore'}
    })
    // sort by meta deta (mongodb meta) textscore and order from highest to lowest score
    .sort({
      score: {$meta: 'textScore'}
    })
    .limit(5);
  res.json(stores);
}

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);

  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 //10km
      }
    }
  };
  const stores = await Store.find(q).select('slug name description location photo').limit(10); // to skip field use '-slug -name'
  res.json(stores);

}

exports.mapPage = (req, res) => {
   res.render('map', {title: 'Map'});
}


exports.heartStore = async (req, res) => {
  // 1. list of person's stores (if alreay have.. posting will remove heart)
  const hearts = req.user.hearts.map(obj => obj.toString());
  console.log(hearts);
  // $addToSet if already there, will rewrite over.. $push will push a NEW heart to array and duplicate it
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  // // computed property name by Square bracket '[]'
  const user = await User
    .findByIdAndUpdate(req.user._id,
    { [operator]: { hearts: req.params.id} },
    // return Updated User rather than previous User
    { new: true}
  );
  res.json(user)
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    // find where the id is $in (In) an array (req.user.hearts)
    _id: { $in: req.user.hearts}
  });
  res.render('stores', {title: 'Hearted Stores', stores });
};


exports.getTopStores = async (req, res) => {
  // #getTopStores will be method in model. If complex queries, query in Model
  const stores = await Store.getTopStores();
  res.render('topStores', {title: 'Top Stores!', stores })
}
