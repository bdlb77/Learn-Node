const mongoose = require('mongoose');
//  wait for GLOBAL promise to be used
// set mongoose promise to be Global(es6) promise
mongoose.Promise = global.Promise;
//  make URL friendly slugs / names
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true, // automatically trim (PROPERTY ALREADY BUILT IN)
    required: 'Please enter a store name!' // will return this string if not valid
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates',
    }],
    address: {
      type: String,
      required: 'You must include an address!'
    },
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  },
}, {
  toJSON: { virtuals: true},
  toObject: { virtuals: true},
});

// define our indexes
storeSchema.index({
  name: 'text',
  description: 'text',
});
storeSchema.index({ location: '2dsphere' })
// set slug property to be that of the schema name.
// pre-save is a type of "hook"
// hook = code functionality that that allows you to react-to or before the default functionality
// exp with #pre: before save schema.. pre is a hook that allows to modify default behavior with custom code (such as modify slug name)
storeSchema.pre('save', async function(next){
  if(!this.isModified('name')){
    next(); // skip this
    return; // stop function from running
    //  return next();
  }
  this.slug = slug(this.name);
  // find other stores with same slug
  const slugRegex = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({slug: slugRegex});
  if(storesWithSlug.length){
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
  //  TODO make more resilient so slugs are unique

})

storeSchema.statics.getTagsList = function(){
  return this.aggregate([
    {$unwind: '$tags'},
    // group by tag field, and create new field called count.. count will sum by 1(add self by 1)
    {$group: { _id: '$tags', count: {$sum: 1} }},
    // sort in descending order
    {$sort: {count: -1 }}
  ]);
};

storeSchema.statics.getTopStores = function(){
  return this.aggregate([
    // 1. look up stores and populate reviews
    //   - $lookup similar to populate field virtually
    //   - 'reviews - mongoDB automatically lower cases and adds 's' at end
    //   - from - reviews table, find foreign field store.. and connect to Store's _id, and return reviews associated.
    { $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews'
      }
    },
    // 2. filter for only items with >= 2 reviews

    //   - match documents where second (index 1) item in reviews exists === true
    { $match: { 'reviews.1': { $exists: true }} },

    // 3. Add a new field.. Avarage Reviews
      // - crate new field averageRating, and set value to be average of reviews' rating field. does math for you
    //  - $ == data being piped in
    { $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        slug: '$$ROOT.slug',
        reviews: '$$ROOT.reviews',
        averageRating: { $avg: '$reviews.rating' }
    }},
    //  4. sort by new field .. Highest reviews first

    { $sort: { averageRating: -1 }},
    // 5. Limit to 10
    { $limit: 10 }
  ]);
};

// find reviews where stores _id property === reviews store property
storeSchema.virtual('reviews', {
  ref: 'Review', // what model to link?
  localField: '_id', // which field on the store?
  foreignField: 'store' // which field on the review??

});
function autoPopulate(next){
  this.populate('reviews');
  next();
}
storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Store', storeSchema);
